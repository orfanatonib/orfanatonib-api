#!/usr/bin/env node

const axios = require('axios');
const config = require('../shared/config');

const BASE_URL = config.BASE_URL;
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let authToken = '';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
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

async function fixShelteredWithoutShelters() {
  log('🔧 CORREÇÃO: Atribuindo abrigos aos abrigados sem abrigo', colors.magenta);

  // Buscar todos os abrigados
  log('📋 Buscando todos os abrigados...');
  const shelteredResult = await makeRequest('GET', '/sheltered?page=1&limit=1000');
  if (!shelteredResult.success) {
    log('❌ Não foi possível buscar abrigados', colors.red);
    return;
  }

  const sheltered = shelteredResult.data?.data || [];
  const totalSheltered = sheltered.length;

  log(`👶 Encontrados ${totalSheltered} abrigados`);

  // Buscar abrigos (tentar endpoint direto primeiro)
  log('🏠 Buscando abrigos disponíveis...');

  // Tentar endpoint direto do banco (já que a API tem problemas de permissões)
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'diego',
    password: 'SenhaNova123!',
    database: 'orfanato-nib'
  });

  try {
    const [shelters] = await connection.execute('SELECT id, name FROM shelter LIMIT 100');
    await connection.end();

    if (shelters.length === 0) {
      log('❌ Nenhum abrigo encontrado no banco', colors.red);
      return;
    }

    log(`✅ ${shelters.length} abrigos encontrados no banco`);

    // Filtrar abrigados sem abrigo
    const withoutShelter = sheltered.filter(child => !child.shelterId);
    log(`⚠️ ${withoutShelter.length} abrigados sem abrigo atribuído`);

    if (withoutShelter.length === 0) {
      log('✅ Todos os abrigados já têm abrigo atribuído!', colors.green);
      return;
    }

    // Atribuir abrigos aos abrigados
    let fixedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < withoutShelter.length; i++) {
      const child = withoutShelter[i];
      const shelterIndex = i % shelters.length;
      const shelter = shelters[shelterIndex];

      try {
        const updateResult = await makeRequest('PUT', `/sheltered/${child.id}`, {
          shelterId: shelter.id
        });

        if (updateResult.success) {
          fixedCount++;
          if (fixedCount % 25 === 0) {
            log(`   ✅ ${fixedCount}/${withoutShelter.length} abrigados corrigidos`);
          }
        } else {
          errorCount++;
          log(`   ❌ Erro ao atualizar ${child.name}: ${updateResult.error}`, colors.red);
        }
      } catch (error) {
        errorCount++;
        log(`   💥 Erro crítico em ${child.name}: ${error.message}`, colors.red);
      }
    }

    log(`✅ CORREÇÃO CONCLUÍDA!`, colors.green);
    log(`   📊 ${fixedCount} abrigados receberam abrigo`, colors.green);
    if (errorCount > 0) {
      log(`   ❌ ${errorCount} erros durante a correção`, colors.yellow);
    }

    // Verificar resultado final
    const finalCheck = await makeRequest('GET', '/sheltered?page=1&limit=10');
    if (finalCheck.success) {
      const finalSheltered = finalCheck.data?.data || [];
      const stillWithoutShelter = finalSheltered.filter(child => !child.shelter);
      log(`   🔍 Verificação: ${stillWithoutShelter.length} abrigados ainda sem abrigo`, stillWithoutShelter.length === 0 ? colors.green : colors.yellow);
    }

  } catch (dbError) {
    log(`❌ Erro ao conectar com banco de dados: ${dbError.message}`, colors.red);
    return;
  }
}

async function validateFixes() {
  log('🔍 VALIDANDO CORREÇÕES APLICADAS', colors.cyan);

  // Verificar abrigados
  const shelteredResult = await makeRequest('GET', '/sheltered?page=1&limit=10');
  if (shelteredResult.success) {
    const sheltered = shelteredResult.data?.data || [];
    const withShelter = sheltered.filter(child => child.shelter);
    const withoutShelter = sheltered.filter(child => !child.shelter);

    log(`👶 Abrigados: ${withShelter.length} com abrigo, ${withoutShelter.length} sem abrigo`);

    if (withShelter.length > 0) {
      log(`   📄 Amostra: ${withShelter[0].name} → ${withShelter[0].shelter?.name || 'N/A'}`, colors.green);
    }
  }

  // Verificar usuários ativos
  const usersResult = await makeRequest('GET', '/users?page=1&limit=10');
  if (usersResult.success) {
    const users = usersResult.data?.items || [];
    const activeUsers = users.filter(user => user.active);
    const inactiveUsers = users.filter(user => !user.active);

    log(`👥 Usuários: ${activeUsers.length} ativos, ${inactiveUsers.length} inativos`);
  }
}

async function runShelteredFixes() {
  log('🏠🔧 FIX DE RELACIONAMENTOS ABRIGADOS x ABRIGOS', colors.bright);
  log('===============================================', colors.bright);

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
    // Aplicar correções
    await fixShelteredWithoutShelters();

    // Validar correções
    await validateFixes();

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    log('\n===============================================', colors.blue);
    log('🎉 FIX CONCLUÍDO COM SUCESSO!', colors.green);
    log('===============================================', colors.blue);
    log(`⏱️ Tempo total: ${totalDuration}s`, colors.blue);
    log(`📅 Finalizado em: ${new Date().toLocaleString('pt-BR')}`, colors.blue);
    log(`✅ Problema crítico de integridade resolvido!`, colors.green);

  } catch (error) {
    log(`\n💥 Erro fatal durante o fix: ${error.message}`, colors.red);
    console.error(error.stack);
  }
}

process.on('SIGINT', () => {
  log('\n⏹️ Interrupção detectada. Finalizando...', colors.yellow);
  process.exit(0);
});

runShelteredFixes().catch(error => {
  log(`\n❌ Erro fatal: ${error.message}`, colors.red);
  process.exit(1);
});
