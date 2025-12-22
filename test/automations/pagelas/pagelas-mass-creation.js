const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Credenciais de admin
const ADMIN_CREDENTIALS = {
  email: 'superuser@orfanatonib.com',
  password: 'Abc@123'
};

let authToken = '';

// ==================== CONFIGURAÇÃO ====================

// Quantidade de visitas (pagelas) a criar por abrigado
const VISITS_PER_SHELTERED = 20; // Padrão: 20 visitas por abrigado

// Ano base para as pagelas (padrão: ano atual)
const BASE_YEAR = new Date().getFullYear();

// ==================== UTILITÁRIOS ====================

async function login() {
  try {
    console.log('🔐 Fazendo login como admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    
    if (response.status === 201) {
      authToken = response.data.accessToken;
      console.log('✅ Login realizado com sucesso!\n');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    return false;
  }
}

async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    return {
      status: error.response?.status || 500,
      data: error.response?.data || { message: error.message }
    };
  }
}

// ==================== FUNÇÕES PRINCIPAIS ====================

/**
 * Busca todos os abrigados (sheltered)
 */
async function getAllSheltered() {
  console.log('📋 Buscando todos os abrigados...');
  
  try {
    const response = await makeRequest('GET', '/sheltered/simple');
    if (response && response.status === 200) {
      const sheltered = response.data || [];
      console.log(`   ✅ ${sheltered.length} abrigados encontrados\n`);
      return sheltered;
    }
    return [];
  } catch (error) {
    console.error('   ❌ Erro ao buscar abrigados:', error.message);
    return [];
  }
}

/**
 * Busca todos os professores (teacher profiles)
 */
async function getAllTeachers() {
  console.log('👩‍🏫 Buscando todos os professores...');
  
  try {
    const response = await makeRequest('GET', '/teacher-profiles/simple');
    if (response && response.status === 200) {
      const teachers = response.data || [];
      console.log(`   ✅ ${teachers.length} professores encontrados\n`);
      return teachers;
    }
    return [];
  } catch (error) {
    console.error('   ❌ Erro ao buscar professores:', error.message);
    return [];
  }
}

/**
 * Busca pagelas existentes para um abrigado
 */
async function getExistingPagelas(shelteredId) {
  try {
    const response = await makeRequest('GET', `/pagelas?shelteredId=${shelteredId}`);
    if (response && response.status === 200) {
      return response.data || [];
    }
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Gera uma data de referência aleatória para um mês específico
 */
function generateReferenceDate(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Verifica se já existe uma pagela para a combinação sheltered/ano/visita
 */
function hasExistingPagela(existingPagelas, year, visit) {
  return existingPagelas.some(p => p.year === year && p.visit === visit);
}

/**
 * Cria uma pagela para um abrigado
 */
async function createPagela(sheltered, teacher, visit, year, month) {
  const referenceDate = generateReferenceDate(year, month);
  
  const pagelaData = {
    shelteredId: sheltered.id || sheltered.shelteredId,
    teacherProfileId: teacher.teacherProfileId || teacher.id,
    referenceDate: referenceDate,
    visit: visit,
    year: year,
    present: Math.random() > 0.2, // 80% de presença
    notes: `Visita ${visit} de ${year} - ${referenceDate}`
  };
  
  const response = await makeRequest('POST', '/pagelas', pagelaData);
  
  return {
    success: response && response.status === 201,
    data: response?.data,
    error: response?.data,
    status: response?.status
  };
}

/**
 * Cria pagelas em massa para todos os abrigados
 */
async function createPagelasForAllSheltered(visitsPerSheltered = VISITS_PER_SHELTERED) {
  console.log('🚀 Iniciando criação de pagelas em massa...\n');
  console.log(`📊 Configuração:`);
  console.log(`   - Visitas por abrigado: ${visitsPerSheltered}`);
  console.log(`   - Ano base: ${BASE_YEAR}\n`);
  
  // Buscar dados necessários
  const sheltered = await getAllSheltered();
  const teachers = await getAllTeachers();
  
  if (sheltered.length === 0) {
    console.log('❌ Nenhum abrigado encontrado. Não é possível criar pagelas.');
    return;
  }
  
  if (teachers.length === 0) {
    console.log('❌ Nenhum professor encontrado. Não é possível criar pagelas.');
    return;
  }
  
  console.log('='.repeat(60));
  console.log('📝 Criando pagelas...\n');
  
  const stats = {
    total: 0,
    success: 0,
    skipped: 0,
    errors: 0,
    shelteredProcessed: 0,
    shelteredWithErrors: 0
  };
  
  // Processar cada abrigado
  for (let i = 0; i < sheltered.length; i++) {
    const shelteredItem = sheltered[i];
    const shelteredId = shelteredItem.id || shelteredItem.shelteredId;
    const shelteredName = shelteredItem.name || 'Sem nome';
    
    // Buscar pagelas existentes para este abrigado
    const existingPagelas = await getExistingPagelas(shelteredId);
    const existingCombinations = new Set();
    existingPagelas.forEach(p => {
      if (p.year && p.visit) {
        existingCombinations.add(`${p.year}-${p.visit}`);
      }
    });
    
    // Selecionar um professor aleatório para este abrigado
    const teacher = teachers[Math.floor(Math.random() * teachers.length)];
    
    let createdForThisSheltered = 0;
    let skippedForThisSheltered = 0;
    let errorsForThisSheltered = 0;
    
    // Criar múltiplas visitas para este abrigado
    for (let visitNum = 1; visitNum <= visitsPerSheltered; visitNum++) {
      // Tentar diferentes combinações de ano/visita
      let year = BASE_YEAR;
      let visit = visitNum;
      let month = visitNum; // Cada visita em um mês diferente
      
      // Se já existe, tentar ano anterior
      if (existingCombinations.has(`${year}-${visit}`)) {
        year = BASE_YEAR - 1;
        if (existingCombinations.has(`${year}-${visit}`)) {
          // Se ainda existe, pular
          stats.skipped++;
          skippedForThisSheltered++;
          continue;
        }
      }
      
      // Criar a pagela
      const result = await createPagela(shelteredItem, teacher, visit, year, month);
      stats.total++;
      
      if (result.success) {
        stats.success++;
        createdForThisSheltered++;
        existingCombinations.add(`${year}-${visit}`);
      } else {
        // Verificar se é erro de duplicata
        const errorMessage = result.error?.message || '';
        const isDuplicate = 
          errorMessage.includes('Já existe') ||
          errorMessage.includes('duplicate') ||
          errorMessage.includes('unique constraint') ||
          (Array.isArray(errorMessage) && errorMessage.some(msg => 
            msg.includes('Já existe') || msg.includes('duplicate')
          ));
        
        if (isDuplicate) {
          stats.skipped++;
          skippedForThisSheltered++;
        } else {
          stats.errors++;
          errorsForThisSheltered++;
          if (errorsForThisSheltered === 1) { // Log apenas o primeiro erro por abrigado
            console.log(`   ⚠️  Erro ao criar pagela para "${shelteredName}":`, 
              Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
          }
        }
      }
      
      // Pequeno delay para não sobrecarregar o servidor
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    stats.shelteredProcessed++;
    
    // Log de progresso a cada 10 abrigados ou se houver erros
    if ((i + 1) % 10 === 0 || errorsForThisSheltered > 0) {
      const status = errorsForThisSheltered > 0 ? '⚠️' : '✅';
      console.log(`   ${status} ${i + 1}/${sheltered.length} abrigados processados... ` +
        `(${createdForThisSheltered} criadas, ${skippedForThisSheltered} puladas)`);
    }
    
    if (errorsForThisSheltered > 0) {
      stats.shelteredWithErrors++;
    }
  }
  
  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA CRIAÇÃO DE PAGELAS');
  console.log('='.repeat(60));
  console.log(`👥 Abrigados processados: ${stats.shelteredProcessed}/${sheltered.length}`);
  console.log(`✅ Pagelas criadas com sucesso: ${stats.success}`);
  console.log(`⏭️  Pagelas já existentes (puladas): ${stats.skipped}`);
  console.log(`❌ Erros: ${stats.errors}`);
  console.log(`📝 Total de tentativas: ${stats.total}`);
  console.log(`⚠️  Abrigados com erros: ${stats.shelteredWithErrors}`);
  
  // Estatísticas adicionais
  if (stats.success > 0) {
    const avgPagelasPerSheltered = (stats.success / stats.shelteredProcessed).toFixed(2);
    console.log(`📈 Média de pagelas por abrigado: ${avgPagelasPerSheltered}`);
  }
  
  // Verificar quantos abrigados têm pagelas agora
  console.log('\n🔍 Verificando abrigados com pagelas...');
  let shelteredWithPagelas = 0;
  for (const shelteredItem of sheltered) {
    const shelteredId = shelteredItem.id || shelteredItem.shelteredId;
    const pagelas = await getExistingPagelas(shelteredId);
    if (pagelas.length > 0) {
      shelteredWithPagelas++;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log(`   ✅ Abrigados com pagelas: ${shelteredWithPagelas}/${sheltered.length}`);
  if (shelteredWithPagelas === sheltered.length) {
    console.log(`   🎉 Todos os abrigados têm pelo menos uma pagela!`);
  } else {
    const withoutPagelas = sheltered.length - shelteredWithPagelas;
    console.log(`   ⚠️  ${withoutPagelas} abrigado(s) ainda não têm pagelas`);
  }
  
  console.log('='.repeat(60));
  
  return stats;
}

// ==================== EXECUÇÃO ====================

async function runAutomation() {
  console.log('🎯 AUTOMAÇÃO DE CRIAÇÃO DE PAGELAS EM MASSA');
  console.log('='.repeat(60));
  console.log('');
  
  // Fazer login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('❌ Não foi possível fazer login. Abortando...');
    process.exit(1);
  }
  
  // Criar pagelas para todos os abrigados
  await createPagelasForAllSheltered(VISITS_PER_SHELTERED);
  
  console.log('\n✅ Automação concluída!');
}

// Executar automação
runAutomation()
  .then(() => {
    console.log('\n✅ Processo finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal na automação:', error);
    process.exit(1);
  });

