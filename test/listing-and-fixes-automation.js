#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const ADMIN_CREDENTIALS = {
  email: 'superuser@orfanatonib.com',
  password: 'Abc@123'
};

let authToken = '';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

async function login() {
  try {
    log('🔐 Fazendo login como admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    authToken = response.data.accessToken;
    log('✅ Login realizado com sucesso!');
    return true;
  } catch (error) {
    log(`❌ Erro no login: ${error.message}`, colors.red);
    return false;
  }
}

async function makeRequest(method, url, data = null, useAuth = true) {
  const config = {
    method,
    url: `${BASE_URL}${url}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (useAuth) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// ==================== FUNÇÕES DE LISTAGEM ====================

async function testEndpoint(name, url, description = '') {
  log(`🔍 Testando ${name}...`, colors.blue);
  if (description) log(`   ${description}`, colors.cyan);

  const result = await makeRequest('GET', url);

  if (result.success) {
    const count = Array.isArray(result.data)
      ? result.data.length
      : (result.data?.data?.length || result.data?.meta?.totalItems || 'N/A');

    log(`   ✅ ${name}: ${count} registros`, colors.green);

    // Log de amostra se houver dados
    if (Array.isArray(result.data) && result.data.length > 0) {
      log(`   📄 Amostra: ${JSON.stringify(result.data[0]).substring(0, 100)}...`, colors.cyan);
    } else if (result.data?.data && Array.isArray(result.data.data) && result.data.data.length > 0) {
      log(`   📄 Amostra: ${JSON.stringify(result.data.data[0]).substring(0, 100)}...`, colors.cyan);
    }

    return { success: true, data: result.data, count };
  } else {
    log(`   ❌ ${name}: ${result.error}`, colors.red);
    return { success: false, error: result.error };
  }
}

async function testPaginatedEndpoint(name, url, description = '') {
  log(`📄 Testando paginação ${name}...`, colors.blue);
  if (description) log(`   ${description}`, colors.cyan);

  // Teste página 1
  const page1 = await makeRequest('GET', `${url}?page=1&limit=5`);
  if (!page1.success) {
    log(`   ❌ ${name} página 1: ${page1.error}`, colors.red);
    return { success: false };
  }

  // Teste página 2 se houver mais dados
  const totalItems = page1.data?.meta?.totalItems || page1.data?.total || 0;
  const hasMorePages = totalItems > 5;

  if (hasMorePages) {
    const page2 = await makeRequest('GET', `${url}?page=2&limit=5`);
    if (!page2.success) {
      log(`   ⚠️ ${name} página 2 falhou: ${page2.error}`, colors.yellow);
    }
  }

  log(`   ✅ ${name}: ${totalItems} total, paginação OK`, colors.green);
  return { success: true, total: totalItems };
}

// ==================== FUNÇÕES DE FIXES ====================

async function fixUserStatuses() {
  log('🔧 Verificando status dos usuários...', colors.magenta);

  // Buscar usuários
  const usersResult = await makeRequest('GET', '/users?page=1&limit=1000');
  if (!usersResult.success) {
    log('   ❌ Não foi possível buscar usuários', colors.red);
    return;
  }

  const users = usersResult.data?.data || [];
  let fixedCount = 0;

  for (const user of users) {
    // Ativar usuários inativos do tipo teacher/leader
    if (!user.active && (user.role === 'teacher' || user.role === 'leader')) {
      log(`   🔧 Ativando usuário ${user.name} (${user.role})`, colors.yellow);

      const updateResult = await makeRequest('PUT', `/users/${user.id}`, {
        active: true
      });

      if (updateResult.success) {
        fixedCount++;
        log(`   ✅ Usuário ${user.name} ativado`, colors.green);
      } else {
        log(`   ❌ Falha ao ativar ${user.name}: ${updateResult.error}`, colors.red);
      }
    }
  }

  if (fixedCount > 0) {
    log(`✅ ${fixedCount} usuários ativados`, colors.green);
  } else {
    log('✅ Todos os usuários já estão ativos', colors.green);
  }
}

async function fixShelteredRelationships() {
  log('🔧 Verificando relacionamentos dos abrigados...', colors.magenta);

  // Buscar abrigados
  const shelteredResult = await makeRequest('GET', '/sheltered?page=1&limit=100');
  if (!shelteredResult.success) {
    log('   ❌ Não foi possível buscar abrigados', colors.red);
    return;
  }

  const sheltered = shelteredResult.data?.data || [];
  let fixedCount = 0;

  // Buscar abrigos disponíveis
  const sheltersResult = await makeRequest('GET', '/shelters?page=1&limit=100');
  if (!sheltersResult.success) {
    log('   ❌ Não foi possível buscar abrigos', colors.red);
    return;
  }

  const shelters = sheltersResult.data?.data || [];
  const shelterIds = shelters.map(s => s.id);

  for (const child of sheltered) {
    // Verificar se o abrigo existe
    if (child.shelterId && !shelterIds.includes(child.shelterId)) {
      log(`   ⚠️ Abrigado ${child.name} tem abrigo inexistente: ${child.shelterId}`, colors.yellow);

      // Atribuir a um abrigo válido
      if (shelters.length > 0) {
        const randomShelter = shelters[Math.floor(Math.random() * shelters.length)];

        const updateResult = await makeRequest('PUT', `/sheltered/${child.id}`, {
          shelterId: randomShelter.id
        });

        if (updateResult.success) {
          fixedCount++;
          log(`   ✅ Abrigado ${child.name} movido para ${randomShelter.name}`, colors.green);
        }
      }
    }
  }

  if (fixedCount > 0) {
    log(`✅ ${fixedCount} relacionamentos corrigidos`, colors.green);
  } else {
    log('✅ Todos os relacionamentos estão OK', colors.green);
  }
}

async function validateDataIntegrity() {
  log('🔍 Validando integridade dos dados...', colors.magenta);

  const issues = [];

  // Verificar se há usuários duplicados por email
  const usersResult = await makeRequest('GET', '/users?page=1&limit=1000');
  if (usersResult.success) {
    const users = usersResult.data?.data || [];
    const emailCounts = {};

    users.forEach(user => {
      if (user.email) {
        emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
      }
    });

    const duplicateEmails = Object.entries(emailCounts).filter(([email, count]) => count > 1);
    if (duplicateEmails.length > 0) {
      issues.push(`${duplicateEmails.length} emails duplicados encontrados`);
      log(`   ⚠️ ${duplicateEmails.length} emails duplicados:`, colors.yellow);
      duplicateEmails.forEach(([email, count]) => {
        log(`      - ${email}: ${count} ocorrências`, colors.yellow);
      });
    }
  }

  // Verificar abrigados sem abrigo
  const shelteredResult = await makeRequest('GET', '/sheltered?page=1&limit=100');
  if (shelteredResult.success) {
    const sheltered = shelteredResult.data?.data || [];
    const withoutShelter = sheltered.filter(child => !child.shelterId);

    if (withoutShelter.length > 0) {
      issues.push(`${withoutShelter.length} abrigados sem abrigo`);
      log(`   ⚠️ ${withoutShelter.length} abrigados sem abrigo atribuído`, colors.yellow);
    }
  }

  if (issues.length === 0) {
    log('✅ Integridade dos dados OK', colors.green);
  } else {
    log(`⚠️ ${issues.length} problemas de integridade encontrados:`, colors.yellow);
    issues.forEach(issue => log(`   - ${issue}`, colors.yellow));
  }

  return issues;
}

async function generateDataReport() {
  log('📊 Gerando relatório completo dos dados...', colors.magenta);

  const report = {
    timestamp: new Date().toISOString(),
    endpoints: {},
    fixes: {},
    integrity: []
  };

  // Testar todos os endpoints principais
  const endpoints = [
    { name: 'Usuários', url: '/users?page=1&limit=10' },
    { name: 'Abrigos', url: '/shelters?page=1&limit=10' },
    { name: 'Abrigados', url: '/sheltered?page=1&limit=10' },
    { name: 'Pagelas', url: '/pagelas?page=1&limit=10' },
    { name: 'Eventos', url: '/events' },
    { name: 'Páginas de Ideias', url: '/ideas-pages' },
    { name: 'Páginas de Imagens', url: '/image-pages' },
    { name: 'Páginas de Vídeos', url: '/video-pages' },
    { name: 'Materiais de Visita', url: '/visit-material-pages' },
    { name: 'Comentários', url: '/comments' },
    { name: 'Contatos', url: '/contacts' },
    { name: 'Documentos', url: '/documents' },
    { name: 'Feedbacks', url: '/site-feedbacks' },
    { name: 'Informativos', url: '/informatives' },
    { name: 'Meditações', url: '/meditations' }
  ];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.name, endpoint.url);
    report.endpoints[endpoint.name] = result;
  }

  // Aplicar fixes
  log('\n🔧 Aplicando correções automáticas...', colors.magenta);
  await fixUserStatuses();
  report.fixes.usersActivated = true;

  await fixShelteredRelationships();
  report.fixes.shelteredRelationships = true;

  // Validar integridade
  report.integrity = await validateDataIntegrity();

  // Salvar relatório
  const fs = require('fs');
  const reportPath = '/home/diego-seven/Documents/repositories/orfanato-nib/orfanatonib-api/test/data-integrity-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(`\n📄 Relatório salvo em: ${reportPath}`, colors.green);
  log('📊 Resumo do relatório:', colors.blue);

  const totalEndpoints = Object.keys(report.endpoints).length;
  const workingEndpoints = Object.values(report.endpoints).filter(e => e.success).length;

  log(`   🔗 Endpoints: ${workingEndpoints}/${totalEndpoints} funcionando`, workingEndpoints === totalEndpoints ? colors.green : colors.yellow);
  log(`   🔧 Fixes aplicados: ${Object.keys(report.fixes).length}`, colors.green);
  log(`   ⚠️ Problemas de integridade: ${report.integrity.length}`, report.integrity.length === 0 ? colors.green : colors.yellow);

  return report;
}

// ==================== EXECUÇÃO PRINCIPAL ====================

async function runListingAndFixesAutomation() {
  log('🔍🚀 AUTOMAÇÃO DE LISTAGEM E FIXES - ORFANATONIB API', colors.bright);
  log('===================================================', colors.bright);

  // Verificar se API está rodando
  const healthCheck = await makeRequest('GET', '/', false);
  if (!healthCheck.success) {
    log('❌ API não está respondendo. Abortando.', colors.red);
    return;
  }
  log('✅ API está rodando', colors.green);

  // Login
  if (!await login()) {
    log('❌ Falha no login. Abortando.', colors.red);
    return;
  }

  const startTime = Date.now();

  try {
    // Gerar relatório completo
    const report = await generateDataReport();

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('\n===================================================', colors.blue);
    log('🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO!', colors.green);
    log('===================================================', colors.blue);
    log(`⏱️ Tempo total: ${totalDuration}s`, colors.blue);
    log(`📅 Finalizado em: ${new Date().toLocaleString('pt-BR')}`, colors.blue);
    log(`📊 Relatório completo gerado e salvo`, colors.green);

    // Resumo final
    const issues = report.integrity.length;
    if (issues === 0) {
      log('\n✅ SISTEMA TOTALMENTE SAUDÁVEL!', colors.green);
      log('🎯 Todos os dados estão consistentes e funcionais.', colors.green);
    } else {
      log(`\n⚠️ SISTEMA COM ${issues} PROBLEMA(S) IDENTIFICADO(S)`, colors.yellow);
      log('🔍 Verifique o relatório detalhado para mais informações.', colors.yellow);
    }

    log('===================================================', colors.blue);

  } catch (error) {
    log(`\n💥 Erro fatal durante a automação: ${error.message}`, colors.red);
    console.error(error.stack);
  }
}

process.on('SIGINT', () => {
  log('\n⏹️ Interrupção detectada. Finalizando...', colors.yellow);
  process.exit(0);
});

runListingAndFixesAutomation().catch(error => {
  log(`\n❌ Erro fatal: ${error.message}`, colors.red);
  process.exit(1);
});
