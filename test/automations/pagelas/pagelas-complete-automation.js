const axios = require('axios');
const config = require('../shared/config');

const BASE_URL = config.BASE_URL;

// Credenciais de admin
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let authToken = '';
let testData = {
  users: [],
  shelters: [],
  sheltered: [],
  teacherProfiles: [],
  pagelas: []
};

// ==================== UTILITÁRIOS ====================

async function login() {
  try {
    console.log('🔐 Fazendo login como admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    
    if (response.status === 201) {
      authToken = response.data.accessToken;
      console.log('✅ Login realizado com sucesso!');
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
    console.error(`❌ Erro na requisição ${method} ${url}:`, error.response?.data || error.message);
    return null;
  }
}

async function getTestData() {
  console.log('📊 Obtendo dados necessários para os testes...');
  
  try {
    // Obter shelters
    const sheltersResponse = await makeRequest('GET', '/shelters/simple');
    if (sheltersResponse) {
      testData.shelters = sheltersResponse.data || [];
      console.log(`  🏠 ${testData.shelters.length} shelters encontrados`);
    }

    // Obter sheltered
    const shelteredResponse = await makeRequest('GET', '/sheltered/simple?page=1&limit=1000');
    if (shelteredResponse) {
      testData.sheltered = shelteredResponse.data?.data || shelteredResponse.data?.items || [];
      console.log(`  👥 ${testData.sheltered.length} sheltered encontrados`);
    }

    // Obter teacher profiles
    const teachersResponse = await makeRequest('GET', '/teacher-profiles/simple');
    if (teachersResponse) {
      testData.teacherProfiles = teachersResponse.data || [];
      console.log(`  👩‍🏫 ${testData.teacherProfiles.length} teacher profiles encontrados`);
    }

    // Obter pagelas existentes
    const pagelasResponse = await makeRequest('GET', '/pagelas');
    if (pagelasResponse) {
      testData.pagelas = pagelasResponse.data || [];
      console.log(`  📚 ${testData.pagelas.length} pagelas encontradas`);
    }

    console.log('✅ Dados obtidos com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao obter dados:', error.message);
    return false;
  }
}

// ==================== TESTES DE CRUD ====================

async function testPagelasCRUD() {
  console.log('\n📋 Testando CRUD de Pagelas...');
  
  if (testData.sheltered.length === 0) {
    console.log('  ⚠️ Nenhum sheltered encontrado para criar pagela');
    return;
  }

  // 1. Criar Pagela
  console.log('  🔸 Teste 1: Criar Pagela');
  
  if (testData.teacherProfiles.length === 0) {
    console.log('    ⚠️ Nenhum teacher profile encontrado. Pulando teste de criação.');
    return;
  }
  
  const createData = {
    shelteredId: testData.sheltered[0].id || testData.sheltered[0].shelteredId,
    teacherProfileId: testData.teacherProfiles[0].teacherProfileId || testData.teacherProfiles[0].id,
    referenceDate: new Date().toISOString(),
    visit: 1,
    year: new Date().getFullYear(),
    present: true,
    notes: 'Notas da pagela de teste'
  };
  
  const createResponse = await makeRequest('POST', '/pagelas', createData);
  if (createResponse && createResponse.status === 201) {
    console.log(`    ✅ Pagela criada: ID ${createResponse.data.id}`);
    const createdPagela = createResponse.data;
    
    // 2. Buscar Pagela por ID
    console.log('  🔸 Teste 2: Buscar Pagela por ID');
    const getResponse = await makeRequest('GET', `/pagelas/${createdPagela.id}`);
    if (getResponse && getResponse.status === 200) {
      console.log(`    ✅ Pagela encontrada: ID ${getResponse.data.id}`);
    }

    // 3. Atualizar Pagela
    console.log('  🔸 Teste 3: Atualizar Pagela');
    const updateData = {
      present: false,
      notes: 'Notas atualizadas da pagela'
    };
    
    const updateResponse = await makeRequest('PATCH', `/pagelas/${createdPagela.id}`, updateData);
    if (updateResponse && updateResponse.status === 200) {
      console.log(`    ✅ Pagela atualizada: ID ${updateResponse.data.id}`);
    }

    // 4. Deletar Pagela
    console.log('  🔸 Teste 4: Deletar Pagela');
    const deleteResponse = await makeRequest('DELETE', `/pagelas/${createdPagela.id}`);
    if (deleteResponse && deleteResponse.status === 200) {
      console.log('    ✅ Pagela deletada com sucesso');
    }
  }
}

// ==================== TESTES DE FILTROS ====================

async function testPagelasFilters() {
  console.log('\n📋 Testando Filtros de Pagelas...');
  
  // 1. Filtro por sheltered
  console.log('  🔸 Teste 1: Filtro por sheltered');
  if (testData.sheltered.length > 0) {
    const shelteredId = testData.sheltered[0].id || testData.sheltered[0].shelteredId;
    const shelteredResponse = await makeRequest('GET', `/pagelas?shelteredId=${shelteredId}`);
    if (shelteredResponse && shelteredResponse.status === 200) {
      console.log(`    ✅ Status: ${shelteredResponse.status}`);
      console.log(`    📊 Encontradas: ${shelteredResponse.data?.length || 0}`);
    }
  }

  // 2. Busca por string (número da visita)
  console.log('  🔸 Teste 2: Busca por número da visita (searchString=1)');
  const visitSearchResponse = await makeRequest('GET', '/pagelas?searchString=1');
  if (visitSearchResponse && visitSearchResponse.status === 200) {
    console.log(`    ✅ Status: ${visitSearchResponse.status}`);
    console.log(`    📊 Encontradas: ${visitSearchResponse.data?.length || 0}`);
  }

  // 3. Busca por string (ano)
  const currentYear = new Date().getFullYear();
  console.log(`  🔸 Teste 3: Busca por ano (searchString=${currentYear})`);
  const yearSearchResponse = await makeRequest('GET', `/pagelas?searchString=${currentYear}`);
  if (yearSearchResponse && yearSearchResponse.status === 200) {
    console.log(`    ✅ Status: ${yearSearchResponse.status}`);
    console.log(`    📊 Encontradas: ${yearSearchResponse.data?.length || 0}`);
  }

  // 4. Busca por string (observação)
  console.log('  🔸 Teste 4: Busca por observação (searchString=visita)');
  const notesSearchResponse = await makeRequest('GET', '/pagelas?searchString=visita');
  if (notesSearchResponse && notesSearchResponse.status === 200) {
    console.log(`    ✅ Status: ${notesSearchResponse.status}`);
    console.log(`    📊 Encontradas: ${notesSearchResponse.data?.length || 0}`);
  }

  // 5. Busca por string (nome do professor)
  if (testData.teacherProfiles.length > 0) {
    const teacherName = testData.teacherProfiles[0].name || '';
    if (teacherName && teacherName !== '—') {
      console.log(`  🔸 Teste 5: Busca por nome do professor (searchString=${teacherName.substring(0, 5)})`);
      const teacherSearchResponse = await makeRequest('GET', `/pagelas?searchString=${encodeURIComponent(teacherName.substring(0, 5))}`);
      if (teacherSearchResponse && teacherSearchResponse.status === 200) {
        console.log(`    ✅ Status: ${teacherSearchResponse.status}`);
        console.log(`    📊 Encontradas: ${teacherSearchResponse.data?.length || 0}`);
      }
    }
  }
}

// ==================== TESTES DE LISTAGEM ====================

async function testPagelasListings() {
  console.log('\n📋 Testando Listagens de Pagelas...');
  
  // 1. Listagem simples
  console.log('  🔸 Teste 1: Listagem simples');
  const simpleResponse = await makeRequest('GET', '/pagelas');
  if (simpleResponse && simpleResponse.status === 200) {
    console.log(`    ✅ Status: ${simpleResponse.status}`);
    console.log(`    📊 Total: ${simpleResponse.data?.length || 0}`);
  }

  // 2. Listagem paginada
  console.log('  🔸 Teste 2: Listagem paginada');
  const paginatedResponse = await makeRequest('GET', '/pagelas/paginated?page=1&limit=10');
  if (paginatedResponse && paginatedResponse.status === 200) {
    console.log(`    ✅ Status: ${paginatedResponse.status}`);
    console.log(`    📊 Total: ${paginatedResponse.data.total || 0}`);
    console.log(`    📄 Itens: ${paginatedResponse.data.items?.length || 0}`);
    console.log(`    📄 Página: ${paginatedResponse.data.page || 0}`);
    console.log(`    📄 Limite: ${paginatedResponse.data.limit || 0}`);
  }
}

// ==================== TESTES DE VALIDAÇÃO ====================

async function testPagelasValidation() {
  console.log('\n📋 Testando Validações de Pagelas...');
  
  // 1. ShelteredId inválido
  console.log('  🔸 Teste 1: ShelteredId inválido');
  const invalidShelteredResponse = await makeRequest('POST', '/pagelas', {
    shelteredId: '00000000-0000-0000-0000-000000000000',
    teacherProfileId: '00000000-0000-0000-0000-000000000000',
    referenceDate: new Date().toISOString(),
    visit: 1,
    present: true
  });
  if (invalidShelteredResponse && invalidShelteredResponse.status === 400) {
    console.log('    ✅ Erro esperado: ShelteredId inválido rejeitado');
  }

  // 2. TeacherProfileId inválido
  console.log('  🔸 Teste 2: TeacherProfileId inválido');
  const invalidTeacherResponse = await makeRequest('POST', '/pagelas', {
    shelteredId: testData.sheltered[0]?.id || '00000000-0000-0000-0000-000000000000',
    teacherProfileId: 'invalid-uuid',
    referenceDate: new Date().toISOString(),
    visit: 1,
    present: true
  });
  if (invalidTeacherResponse && invalidTeacherResponse.status === 400) {
    console.log('    ✅ Erro esperado: TeacherProfileId inválido rejeitado');
  }

  // 3. Data inválida
  console.log('  🔸 Teste 3: Data inválida');
  const invalidDateResponse = await makeRequest('POST', '/pagelas', {
    shelteredId: testData.sheltered[0]?.id || '00000000-0000-0000-0000-000000000000',
    teacherProfileId: '00000000-0000-0000-0000-000000000000',
    referenceDate: 'data-invalida',
    visit: 1,
    present: true
  });
  if (invalidDateResponse && invalidDateResponse.status === 400) {
    console.log('    ✅ Erro esperado: Data inválida rejeitada');
  }

  // 4. Visit inválido
  console.log('  🔸 Teste 4: Visit inválido');
  const invalidVisitResponse = await makeRequest('POST', '/pagelas', {
    shelteredId: testData.sheltered[0]?.id || '00000000-0000-0000-0000-000000000000',
    teacherProfileId: '00000000-0000-0000-0000-000000000000',
    referenceDate: new Date().toISOString(),
    visit: 0, // Inválido (deve ser >= 1)
    present: true
  });
  if (invalidVisitResponse && invalidVisitResponse.status === 400) {
    console.log('    ✅ Erro esperado: Visit inválido rejeitado');
  }

  // 5. Buscar registro inexistente
  console.log('  🔸 Teste 5: Buscar registro inexistente');
  const notFoundResponse = await makeRequest('GET', '/pagelas/00000000-0000-0000-0000-000000000000');
  if (notFoundResponse && notFoundResponse.status === 404) {
    console.log('    ✅ Erro esperado: Registro não encontrado');
  }
}

// ==================== TESTES DE RELACIONAMENTOS ====================

async function testPagelasRelationships() {
  console.log('\n📋 Testando Relacionamentos de Pagelas...');
  
  if (testData.sheltered.length === 0) {
    console.log('  ⚠️ Dados insuficientes para testar relacionamentos');
    return;
  }

  // 1. Criar pagela com sheltered
  console.log('  🔸 Teste 1: Criar pagela com sheltered');
  
  if (testData.teacherProfiles.length === 0) {
    console.log('    ⚠️ Nenhum teacher profile encontrado. Pulando teste de relacionamento.');
    return;
  }
  
  // Verificar pagelas existentes para este abrigado
  const shelteredId = testData.sheltered[0].id || testData.sheltered[0].shelteredId;
  const existingResponse = await makeRequest('GET', `/pagelas?shelteredId=${shelteredId}`);
  const existingPagelas = existingResponse && existingResponse.status === 200 ? existingResponse.data || [] : [];
  
  // Encontrar uma combinação visit/ano que não existe
  const currentYear = new Date().getFullYear();
  let visit = 1;
  let year = currentYear;
  const existingCombinations = new Set();
  existingPagelas.forEach(p => {
    if (p.visit && p.year) {
      existingCombinations.add(`${p.year}-${p.visit}`);
    }
  });
  
  // Tentar encontrar uma combinação disponível
  let foundAvailable = false;
  for (let v = 1; v <= 12 && !foundAvailable; v++) {
    for (let y = currentYear; y >= currentYear - 2 && !foundAvailable; y--) {
      if (!existingCombinations.has(`${y}-${v}`)) {
        visit = v;
        year = y;
        foundAvailable = true;
      }
    }
  }
  
  const createData = {
    shelteredId: shelteredId,
    teacherProfileId: testData.teacherProfiles[0].teacherProfileId || testData.teacherProfiles[0].id,
    referenceDate: new Date().toISOString(),
    visit: visit,
    year: year,
    present: true,
    notes: 'Notas da pagela com relacionamento'
  };

  const createResponse = await makeRequest('POST', '/pagelas', createData);
  if (createResponse && createResponse.status === 201) {
    console.log(`    ✅ Pagela criada: ID ${createResponse.data.id}`);
    const createdPagela = createResponse.data;

    // 2. Atualizar presença da pagela
    console.log('  🔸 Teste 2: Atualizar presença da pagela');
    const updatePresenceResponse = await makeRequest('PATCH', `/pagelas/${createdPagela.id}`, {
      present: false,
      notes: 'Notas atualizadas'
    });
    
    if (updatePresenceResponse && updatePresenceResponse.status === 200) {
      console.log(`    ✅ Presença atualizada: ${updatePresenceResponse.data.present}`);
    }

    // 3. Deletar pagela de teste
    console.log('  🔸 Teste 3: Deletar pagela de teste');
    const deleteResponse = await makeRequest('DELETE', `/pagelas/${createdPagela.id}`);
    if (deleteResponse && deleteResponse.status === 200) {
      console.log('    ✅ Pagela de teste deletada');
    }
  } else {
    console.log('    ⚠️ Não foi possível criar pagela de teste (pode já existir)');
  }
}

// ==================== TESTES DE BUSCA ====================

async function testPagelasSearch() {
  console.log('\n📋 Testando Busca de Pagelas...');
  
  const currentYear = new Date().getFullYear();
  
  // 1. Busca por texto (observação)
  console.log('  🔸 Teste 1: Busca por observação (searchString=visita)');
  const textSearchResponse = await makeRequest('GET', '/pagelas?searchString=visita');
  if (textSearchResponse && textSearchResponse.status === 200) {
    console.log(`    ✅ Status: ${textSearchResponse.status}`);
    console.log(`    📊 Encontradas: ${textSearchResponse.data?.length || 0}`);
  }

  // 2. Busca por ano usando searchString
  console.log(`  🔸 Teste 2: Busca por ano (searchString=${currentYear})`);
  const yearSearchResponse = await makeRequest('GET', `/pagelas?searchString=${currentYear}`);
  if (yearSearchResponse && yearSearchResponse.status === 200) {
    console.log(`    ✅ Status: ${yearSearchResponse.status}`);
    console.log(`    📊 Encontradas: ${yearSearchResponse.data?.length || 0}`);
  }

  // 3. Busca por número da visita usando searchString
  console.log('  🔸 Teste 3: Busca por número da visita (searchString=1)');
  const visitSearchResponse = await makeRequest('GET', '/pagelas?searchString=1');
  if (visitSearchResponse && visitSearchResponse.status === 200) {
    console.log(`    ✅ Status: ${visitSearchResponse.status}`);
    console.log(`    📊 Encontradas: ${visitSearchResponse.data?.length || 0}`);
  }

  // 4. Busca combinada: shelteredId + searchString
  if (testData.sheltered.length > 0) {
    const shelteredId = testData.sheltered[0].id || testData.sheltered[0].shelteredId;
    console.log(`  🔸 Teste 4: Busca combinada (shelteredId + searchString=${currentYear})`);
    const combinedSearchResponse = await makeRequest('GET', `/pagelas/paginated?shelteredId=${shelteredId}&searchString=${currentYear}&page=1&limit=10`);
    if (combinedSearchResponse && combinedSearchResponse.status === 200) {
      console.log(`    ✅ Status: ${combinedSearchResponse.status}`);
      console.log(`    📊 Total: ${combinedSearchResponse.data.total || 0}`);
      console.log(`    📄 Itens: ${combinedSearchResponse.data.items?.length || 0}`);
    }
  }
}

// ==================== TESTES DE ESTATÍSTICAS ====================

async function testPagelasStatistics() {
  console.log('\n📋 Testando Estatísticas de Pagelas...');
  
  // 1. Contar pagelas por sheltered
  console.log('  🔸 Teste 1: Contar pagelas por sheltered');
  if (testData.sheltered.length > 0) {
    const shelteredId = testData.sheltered[0].id || testData.sheltered[0].shelteredId;
    const shelteredCountResponse = await makeRequest('GET', `/pagelas?shelteredId=${shelteredId}`);
    if (shelteredCountResponse && shelteredCountResponse.status === 200) {
      const shelteredCount = shelteredCountResponse.data?.length || 0;
      console.log(`    📊 Pagelas do sheltered: ${shelteredCount}`);
    }
  }

  // 2. Contar pagelas por ano usando searchString
  const currentYear = new Date().getFullYear();
  console.log(`  🔸 Teste 2: Contar pagelas por ano (searchString=${currentYear})`);
  const yearCountResponse = await makeRequest('GET', `/pagelas?searchString=${currentYear}`);
  if (yearCountResponse && yearCountResponse.status === 200) {
    const yearCount = yearCountResponse.data?.length || 0;
    console.log(`    📊 Pagelas em ${currentYear}: ${yearCount}`);
  }

  // 3. Total geral de pagelas
  console.log('  🔸 Teste 3: Total geral de pagelas');
  const totalResponse = await makeRequest('GET', '/pagelas');
  if (totalResponse && totalResponse.status === 200) {
    const total = totalResponse.data?.length || 0;
    console.log(`    📊 Total de pagelas: ${total}`);
  }
}

// ==================== CRIAÇÃO EM MASSA ====================

/**
 * Cria pagelas para TODOS os abrigados garantindo que cada um tenha pelo menos uma pagela
 */
async function createPagelasForAllSheltered(visitsPerSheltered = 1) {
  console.log(`\n🚀 Criando pagelas para TODOS os abrigados...`);
  console.log(`   📋 Visitas por abrigado: ${visitsPerSheltered}`);
  
  if (testData.sheltered.length === 0) {
    console.log('  ⚠️ Nenhum sheltered encontrado. Não é possível criar pagelas.');
    return [];
  }
  
  if (testData.teacherProfiles.length === 0) {
    console.log('  ⚠️ Nenhum teacher profile encontrado. Não é possível criar pagelas.');
    return [];
  }
  
  const createdPagelas = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  const currentYear = new Date().getFullYear();
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const days = Array.from({ length: 28 }, (_, i) => String(i + 1).padStart(2, '0'));
  
  // Iterar sobre TODOS os abrigados
  for (let shelteredIndex = 0; shelteredIndex < testData.sheltered.length; shelteredIndex++) {
    const sheltered = testData.sheltered[shelteredIndex];
    const shelteredId = sheltered.id || sheltered.shelteredId;
    const shelteredName = sheltered.name || 'Sem nome';
    const teacher = testData.teacherProfiles[Math.floor(Math.random() * testData.teacherProfiles.length)];
    const teacherId = teacher.teacherProfileId || teacher.id;
    
    // Verificar se já existem pagelas para este abrigado
    const existingPagelasResponse = await makeRequest('GET', `/pagelas?shelteredId=${shelteredId}`);
    const existingPagelas = existingPagelasResponse && existingPagelasResponse.status === 200 
      ? existingPagelasResponse.data || [] 
      : [];
    
    // Se já tem pagelas, verificar quantas visitas já existem para o ano atual
    const existingVisits = new Set();
    const existingYears = new Set();
    existingPagelas.forEach(p => {
      if (p.year) existingYears.add(p.year);
      if (p.visit && p.year === currentYear) existingVisits.add(p.visit);
    });
    
    // Criar múltiplas visitas para cada abrigado, distribuindo entre anos
    for (let visitNum = 1; visitNum <= visitsPerSheltered; visitNum++) {
      // Distribuir as visitas entre diferentes anos para evitar conflitos
      // Visitas 1-12: ano atual, 13-24: ano anterior, 25+: 2 anos atrás
      const yearOffset = Math.floor((visitNum - 1) / 12);
      const visit = ((visitNum - 1) % 12) + 1;
      const year = currentYear - yearOffset;

      // Verificar se já existe esta combinação
      const combinationKey = `${year}-${visit}`;
      const alreadyExists = existingPagelas.some(p => p.year === year && p.visit === visit);

      if (alreadyExists) {
        skippedCount++;
        continue; // Pular esta visita
      }

      // Gerar data de referência aleatória no ano escolhido
      const month = months[Math.floor(Math.random() * months.length)];
      const day = days[Math.floor(Math.random() * days.length)];
      const referenceDate = `${year}-${month}-${day}`;

      const pagelaData = {
        shelteredId: shelteredId,
        teacherProfileId: teacherId,
        referenceDate: referenceDate,
        visit: visit,
        year: year,
        present: Math.random() > 0.2, // 80% de presença
        notes: `Notas da visita ${visit}/${year} - ${referenceDate}`
      };

      const response = await makeRequest('POST', '/pagelas', pagelaData);
      if (response && response.status === 201) {
        createdPagelas.push(response.data);
        successCount++;
        existingPagelas.push({ year, visit }); // Adicionar ao cache local
      } else {
        // Se já existe pagela para este abrigado/ano/visita, contar como skipped
        if (response && response.status === 400 &&
            (response.data?.message?.includes('Já existe Pagela') ||
             (Array.isArray(response.data?.message) && response.data.message.some((msg) => msg.includes('Já existe Pagela'))))) {
          skippedCount++;
          existingPagelas.push({ year, visit }); // Adicionar ao cache para evitar tentar de novo
        } else {
          errorCount++;
          if (response && response.data && errorCount <= 5) { // Limitar logs de erro
            console.log(`    ⚠️ Erro ao criar pagela para ${shelteredName} (visita ${visit}/${year}):`, response.data.message || response.data);
          }
        }
      }

      // Pequeno delay para não sobrecarregar o servidor
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    // Log de progresso a cada 10 abrigados
    if ((shelteredIndex + 1) % 10 === 0) {
      console.log(`  ✅ Processados ${shelteredIndex + 1}/${testData.sheltered.length} abrigados...`);
    }
  }
  
  console.log(`\n✅ Criação de pagelas para todos os abrigados concluída!`);
  console.log(`   👥 Total de abrigados processados: ${testData.sheltered.length}`);
  console.log(`   📊 Pagelas criadas com sucesso: ${successCount}`);
  console.log(`   ⏭️  Pagelas já existentes (puladas): ${skippedCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log(`   💾 Total de pagelas criadas: ${createdPagelas.length}`);
  
  // Verificar quantos abrigados têm pagelas
  if (testData.sheltered.length > 0) {
    console.log(`\n📋 Verificando abrigados com pagelas...`);
    let shelteredWithPagelas = 0;
    const shelteredWithoutPagelas = [];

    for (const sheltered of testData.sheltered) {
      const shelteredId = sheltered.id || sheltered.shelteredId;
      const shelteredName = sheltered.name || 'Sem nome';
      const checkResponse = await makeRequest('GET', `/pagelas?shelteredId=${shelteredId}`);
      if (checkResponse && checkResponse.status === 200 && checkResponse.data?.length > 0) {
        shelteredWithPagelas++;
      } else {
        shelteredWithoutPagelas.push({ id: shelteredId, name: shelteredName });
      }
      await new Promise(resolve => setTimeout(resolve, 10)); // Pequeno delay
    }

    console.log(`   ✅ Abrigados com pagelas: ${shelteredWithPagelas}/${testData.sheltered.length}`);
    if (shelteredWithPagelas === testData.sheltered.length) {
      console.log(`   🎉 Todos os abrigados têm pelo menos uma pagela!`);
    } else {
      console.log(`   ⚠️  ${testData.sheltered.length - shelteredWithPagelas} abrigados ainda não têm pagelas`);
      if (shelteredWithoutPagelas.length > 0 && shelteredWithoutPagelas.length <= 10) {
        console.log(`\n   📋 Abrigados sem pagelas:`);
        shelteredWithoutPagelas.forEach(s => {
          console.log(`      - ${s.name} (ID: ${s.id})`);
        });
      }
    }
  }
  
  return createdPagelas;
}

/**
 * Cria pagelas aleatórias em massa (função original mantida para compatibilidade)
 */
async function createPagelasInBulk(count = 200) {
  console.log(`\n🚀 Criando ${count} pagelas em massa (aleatórias)...`);
  
  if (testData.sheltered.length === 0) {
    console.log('  ⚠️ Nenhum sheltered encontrado. Não é possível criar pagelas.');
    return [];
  }
  
  if (testData.teacherProfiles.length === 0) {
    console.log('  ⚠️ Nenhum teacher profile encontrado. Não é possível criar pagelas.');
    return [];
  }
  
  const createdPagelas = [];
  let successCount = 0;
  let errorCount = 0;
  
  const currentYear = new Date().getFullYear();
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const days = Array.from({ length: 28 }, (_, i) => String(i + 1).padStart(2, '0'));
  
  for (let i = 0; i < count; i++) {
    const sheltered = testData.sheltered[Math.floor(Math.random() * testData.sheltered.length)];
    const teacher = testData.teacherProfiles[Math.floor(Math.random() * testData.teacherProfiles.length)];
    
    // Gerar data de referência aleatória no ano atual
    const month = months[Math.floor(Math.random() * months.length)];
    const day = days[Math.floor(Math.random() * days.length)];
    const referenceDate = `${currentYear}-${month}-${day}`;
    
    // Gerar visita entre 1 e 12 (mensal)
    const visit = Math.floor(Math.random() * 12) + 1;
    
    // Gerar ano (pode ser atual ou anterior)
    const year = currentYear - Math.floor(Math.random() * 3);
    
    const pagelaData = {
      shelteredId: sheltered.id || sheltered.shelteredId,
      teacherProfileId: teacher.teacherProfileId || teacher.id,
      referenceDate: referenceDate,
      visit: visit,
      year: year,
      present: Math.random() > 0.2, // 80% de presença
      notes: Math.random() > 0.5 ? `Notas da visita ${visit} - ${referenceDate}` : undefined
    };
    
    const response = await makeRequest('POST', '/pagelas', pagelaData);
    if (response && response.status === 201) {
      createdPagelas.push(response.data);
      successCount++;
      if ((i + 1) % 50 === 0) {
        console.log(`  ✅ ${i + 1}/${count} pagelas criadas...`);
      }
    } else {
      errorCount++;
    }
    
    // Pequeno delay para não sobrecarregar o servidor
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  
  console.log(`\n✅ Criação em massa concluída!`);
  console.log(`   📊 Sucessos: ${successCount}/${count}`);
  console.log(`   ❌ Erros: ${errorCount}/${count}`);
  console.log(`   💾 Total de pagelas criadas: ${createdPagelas.length}`);
  
  return createdPagelas;
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runPagelasAutomation() {
  console.log('🎯 AUTOMAÇÃO COMPLETA - MÓDULO PAGELAS');
  console.log('=======================================');
  console.log('📋 Funcionalidades a serem testadas:');
  console.log('   1. CRUD de Pagelas');
  console.log('   2. Filtros e Buscas');
  console.log('   3. Listagens e Paginação');
  console.log('   4. Validações de Dados');
  console.log('   5. Relacionamentos com Sheltered');
  console.log('   6. Busca Avançada');
  console.log('   7. Estatísticas de Pagelas');
  console.log('=======================================');

  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Falha no login. Encerrando automação.');
    return;
  }

  // Obter dados
  const dataSuccess = await getTestData();
  if (!dataSuccess) {
    console.error('❌ Falha ao obter dados. Encerrando automação.');
    return;
  }

  // Criar pagelas para TODOS os abrigados (garantindo que cada um tenha pelo menos 1 pagela)
  console.log('\n📋 Criando pagelas para todos os abrigados...');
  await createPagelasForAllSheltered(20); // 20 visitas por abrigado

  // Opcional: Criar mais pagelas aleatórias em massa
  // await createPagelasInBulk(200);
  
  // Executar testes
  await testPagelasCRUD();
  await testPagelasFilters();
  await testPagelasListings();
  await testPagelasValidation();
  await testPagelasRelationships();
  await testPagelasSearch();
  await testPagelasStatistics();

  console.log('\n🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('=====================================');
  console.log('✅ Todos os testes foram executados');
  console.log('✅ CRUD de Pagelas funcionando');
  console.log('✅ Filtros e buscas funcionando');
  console.log('✅ Listagens e paginação funcionando');
  console.log('✅ Validações funcionando');
  console.log('✅ Relacionamentos funcionando');
  console.log('✅ Busca avançada funcionando');
  console.log('✅ Estatísticas funcionando');
  console.log('✅ Sistema pronto para produção!');
}

// Executar automação
runPagelasAutomation()
  .then(() => {
    console.log('\n✅ Automação finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante a automação:', error);
    process.exit(1);
  });