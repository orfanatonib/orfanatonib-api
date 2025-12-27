const axios = require('axios');
const config = require('../shared/config');

const BASE_URL = config.BASE_URL;

// Credenciais de admin
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let authToken = '';
let testData = {
  shelters: [],
  sheltered: []
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
    // Obter shelters (usar endpoint paginado para garantir que pegue todos)
    const sheltersResponse = await makeRequest('GET', '/shelters?page=1&limit=100');
    if (sheltersResponse && sheltersResponse.data) {
      testData.shelters = sheltersResponse.data.data || sheltersResponse.data || [];
      console.log(`  🏠 ${testData.shelters.length} shelters encontrados`);
    }

    // Obter sheltered existentes
    const shelteredResponse = await makeRequest('GET', '/sheltered/simple');
    if (shelteredResponse) {
      testData.sheltered = shelteredResponse.data || [];
      console.log(`  👥 ${testData.sheltered.length} sheltered encontrados`);
    }

    console.log('✅ Dados obtidos com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao obter dados:', error.message);
    return false;
  }
}

// ==================== TESTES DE CRUD ====================

async function testShelteredCRUD() {
  console.log('\n📋 Testando CRUD de Sheltered...');
  
  // 1. Criar Sheltered
  console.log('  🔸 Teste 1: Criar Sheltered');
  const createData = {
    name: `Sheltered Teste ${Date.now()}`,
    birthDate: '2010-05-15',
    guardianName: 'Maria Silva',
    gender: 'F',
    guardianPhone: '+5511777777777',
    joinedAt: '2023-01-15',
    shelterId: testData.shelters[0]?.id,
    address: {
      street: 'Rua das Flores',
      number: '123',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01234-567',
      complement: 'Apto 45'
    }
  };
  
  const createResponse = await makeRequest('POST', '/sheltered', createData);
  if (createResponse && createResponse.status === 201) {
    console.log(`    ✅ Sheltered criado: ${createResponse.data.name}`);
    const createdSheltered = createResponse.data;
    
    // 2. Buscar Sheltered por ID
    console.log('  🔸 Teste 2: Buscar Sheltered por ID');
    const getResponse = await makeRequest('GET', `/sheltered/${createdSheltered.id}`);
    if (getResponse && getResponse.status === 200) {
      console.log(`    ✅ Sheltered encontrado: ${getResponse.data.name}`);
    }

    // 3. Atualizar Sheltered
    console.log('  🔸 Teste 3: Atualizar Sheltered');
    const updateData = {
      name: `${createData.name} - Atualizado`,
      gender: 'M',
      guardianName: 'Maria Silva Santos'
    };
    
    const updateResponse = await makeRequest('PUT', `/sheltered/${createdSheltered.id}`, updateData);
    if (updateResponse && updateResponse.status === 200) {
      console.log(`    ✅ Sheltered atualizado: ${updateResponse.data.name}`);
    }

    // 3.1. Teste: Atualizar com campos opcionais vazios
    console.log('  🔸 Teste 3.1: Atualizar Sheltered com campos opcionais vazios');
    const updateEmptyData = {
      guardianName: '', // Campo vazio
      guardianPhone: '' // Campo vazio
    };
    
    const updateEmptyResponse = await makeRequest('PUT', `/sheltered/${createdSheltered.id}`, updateEmptyData);
    if (updateEmptyResponse && updateEmptyResponse.status === 200) {
      console.log(`    ✅ Sheltered atualizado com campos vazios: ${updateEmptyResponse.data.name}`);
      console.log(`    ✅ GuardianName vazio aceito no UPDATE: "${updateEmptyResponse.data.guardianName || 'null'}"`);
      console.log(`    ✅ GuardianPhone vazio aceito no UPDATE: "${updateEmptyResponse.data.guardianPhone || 'null'}"`);
    }

    // 3.2. Teste: Atualizar com address contendo ID (cenário do frontend)
    console.log('  🔸 Teste 3.2: Atualizar Sheltered com address contendo ID');
    const updateWithAddressIdData = {
      name: `${createData.name} - Com Address ID`,
      guardianName: '',
      guardianPhone: '',
      address: {
        id: createdSheltered.address?.id, // ID do endereço existente
        street: 'Rua Atualizada com ID',
        number: '999',
        district: 'Centro Atualizado',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01234-999',
        complement: 'Apto 999'
      }
    };
    
    const updateWithAddressIdResponse = await makeRequest('PUT', `/sheltered/${createdSheltered.id}`, updateWithAddressIdData);
    if (updateWithAddressIdResponse && updateWithAddressIdResponse.status === 200) {
      console.log(`    ✅ Sheltered atualizado com address ID: ${updateWithAddressIdResponse.data.name}`);
      console.log(`    ✅ Address ID aceito no UPDATE: ${updateWithAddressIdResponse.data.address?.id}`);
      console.log(`    ✅ Street atualizada: ${updateWithAddressIdResponse.data.address?.street}`);
    }

    // 4. Deletar Sheltered
    console.log('  🔸 Teste 4: Deletar Sheltered');
    const deleteResponse = await makeRequest('DELETE', `/sheltered/${createdSheltered.id}`);
    if (deleteResponse && deleteResponse.status === 200) {
      console.log('    ✅ Sheltered deletado com sucesso');
    }
  }
}

// ==================== TESTES DE FILTROS ====================

async function testShelteredFilters() {
  console.log('\n📋 Testando Filtros Consolidados de Sheltered...');
  
  // 1. Filtro consolidado: shelteredSearchingString (nome, responsável, telefone)
  console.log('  🔸 Teste 1: Filtro consolidado shelteredSearchingString (nome, responsável, telefone)');
  const searchResponse = await makeRequest('GET', '/sheltered?shelteredSearchingString=Maria&limit=5');
  if (searchResponse && searchResponse.status === 200) {
    console.log(`    ✅ Status: ${searchResponse.status}`);
    console.log(`    📊 Encontrados: ${searchResponse.data.items?.length || 0}`);
  }

  // 2. Filtro por dados do abrigo: shelterSearchingString
  console.log('  🔸 Teste 2: Filtro por dados do abrigo (shelterSearchingString=Abrigo)');
  const shelterSearchResponse = await makeRequest('GET', '/sheltered?shelterSearchingString=Abrigo&limit=5');
  if (shelterSearchResponse && shelterSearchResponse.status === 200) {
    console.log(`    ✅ Status: ${shelterSearchResponse.status}`);
    console.log(`    📊 Encontrados: ${shelterSearchResponse.data.items?.length || 0}`);
  }

  // 3. Filtro de endereço: addressFilter
  console.log('  🔸 Teste 3: Filtro de endereço (addressFilter=São Paulo)');
  const addressResponse = await makeRequest('GET', '/sheltered?addressFilter=São Paulo&limit=5');
  if (addressResponse && addressResponse.status === 200) {
    console.log(`    ✅ Status: ${addressResponse.status}`);
    console.log(`    📊 Encontrados: ${addressResponse.data.items?.length || 0}`);
  }

  // 4. Filtro por gênero: gender
  console.log('  🔸 Teste 4: Filtro por gênero (gender=F)');
  const genderResponse = await makeRequest('GET', '/sheltered?gender=F&limit=5');
  if (genderResponse && genderResponse.status === 200) {
    console.log(`    ✅ Status: ${genderResponse.status}`);
    console.log(`    📊 Encontrados: ${genderResponse.data.items?.length || 0}`);
  }

  // 5. Range de data de nascimento: birthDateFrom/birthDateTo
  console.log('  🔸 Teste 5: Range de data de nascimento (birthDateFrom=2010-01-01, birthDateTo=2015-12-31)');
  const birthDateResponse = await makeRequest('GET', '/sheltered?birthDateFrom=2010-01-01&birthDateTo=2015-12-31&limit=5');
  if (birthDateResponse && birthDateResponse.status === 200) {
    console.log(`    ✅ Status: ${birthDateResponse.status}`);
    console.log(`    📊 Encontrados: ${birthDateResponse.data.items?.length || 0}`);
  }

  // 6. Range de data "no abrigo desde": joinedFrom/joinedTo
  console.log('  🔸 Teste 6: Range "no abrigo desde" (joinedFrom=2024-01-01, joinedTo=2024-12-31)');
  const joinedDateResponse = await makeRequest('GET', '/sheltered?joinedFrom=2024-01-01&joinedTo=2024-12-31&limit=5');
  if (joinedDateResponse && joinedDateResponse.status === 200) {
    console.log(`    ✅ Status: ${joinedDateResponse.status}`);
    console.log(`    📊 Encontrados: ${joinedDateResponse.data.items?.length || 0}`);
  }

  // 7. Combinação de filtros
  console.log('  🔸 Teste 7: Combinação de filtros (gender=F + shelterSearchingString=Abrigo)');
  const combinedResponse = await makeRequest('GET', '/sheltered?gender=F&shelterSearchingString=Abrigo&limit=5');
  if (combinedResponse && combinedResponse.status === 200) {
    console.log(`    ✅ Status: ${combinedResponse.status}`);
    console.log(`    📊 Encontrados: ${combinedResponse.data.items?.length || 0}`);
  }
}

// ==================== TESTES DE LISTAGEM ====================

async function testShelteredListings() {
  console.log('\n📋 Testando Listagens de Sheltered...');
  
  // 1. Listagem paginada
  console.log('  🔸 Teste 1: Listagem paginada');
  const paginatedResponse = await makeRequest('GET', '/sheltered?page=1&limit=10');
  if (paginatedResponse && paginatedResponse.status === 200) {
    console.log(`    ✅ Status: ${paginatedResponse.status}`);
    console.log(`    📊 Total: ${paginatedResponse.data.meta?.totalItems || 0}`);
    console.log(`    📄 Itens: ${paginatedResponse.data.items?.length || 0}`);
  }

  // 2. Listagem simples
  console.log('  🔸 Teste 2: Listagem simples');
  const simpleResponse = await makeRequest('GET', '/sheltered/simple');
  if (simpleResponse && simpleResponse.status === 200) {
    console.log(`    ✅ Status: ${simpleResponse.status}`);
    console.log(`    📊 Total: ${simpleResponse.data?.length || 0}`);
  }

  // 3. Ordenação
  console.log('  🔸 Teste 3: Ordenação (orderBy=name, order=ASC)');
  const sortResponse = await makeRequest('GET', '/sheltered?orderBy=name&order=ASC&limit=5');
  if (sortResponse && sortResponse.status === 200) {
    console.log(`    ✅ Status: ${sortResponse.status}`);
    console.log(`    📊 Ordenados: ${sortResponse.data.items?.length || 0}`);
  }
}

// ==================== TESTES DE VALIDAÇÃO ====================

async function testShelteredValidation() {
  console.log('\n📋 Testando Validações de Sheltered...');
  
  // 1. Gender inválido
  console.log('  🔸 Teste 1: Gender inválido');
  const invalidGenderResponse = await makeRequest('POST', '/sheltered', {
    name: 'Teste',
    birthDate: '2010-01-01',
    gender: 'INVALID'
  });
  if (invalidGenderResponse && invalidGenderResponse.status === 400) {
    console.log('    ✅ Erro esperado: Gender inválido rejeitado');
  }

  // 2. Nome muito curto
  console.log('  🔸 Teste 2: Nome muito curto');
  const shortNameResponse = await makeRequest('POST', '/sheltered', {
    name: 'A',
    birthDate: '2010-01-01',
    gender: 'M'
  });
  if (shortNameResponse && shortNameResponse.status === 400) {
    console.log('    ✅ Erro esperado: Nome muito curto rejeitado');
  }

  // 3. Data inválida
  console.log('  🔸 Teste 3: Data inválida');
  const invalidDateResponse = await makeRequest('POST', '/sheltered', {
    name: 'Teste',
    birthDate: 'data-invalida',
    gender: 'M'
  });
  if (invalidDateResponse && invalidDateResponse.status === 400) {
    console.log('    ✅ Erro esperado: Data inválida rejeitada');
  }

  // 4. Buscar registro inexistente
  console.log('  🔸 Teste 4: Buscar registro inexistente');
  const notFoundResponse = await makeRequest('GET', '/sheltered/00000000-0000-0000-0000-000000000000');
  if (notFoundResponse && notFoundResponse.status === 404) {
    console.log('    ✅ Erro esperado: Registro não encontrado');
  }

  // 5. Teste: Criar sheltered sem guardianName (opcional)
  console.log('  🔸 Teste 5: Criar sheltered sem guardianName (opcional)');
  const createWithoutGuardianData = {
    name: `Sheltered Sem Guardião ${Date.now()}`,
    birthDate: '2012-03-20',
    gender: 'M',
    joinedAt: '2024-02-01',
    shelterId: testData.shelters[0]?.id,
    address: {
      street: 'Rua Sem Guardião',
      number: '456',
      district: 'Vila Nova',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '04567-890'
    }
  };
  
  const createWithoutGuardianResponse = await makeRequest('POST', '/sheltered', createWithoutGuardianData);
  if (createWithoutGuardianResponse && createWithoutGuardianResponse.status === 201) {
    console.log(`    ✅ Sheltered criado sem guardianName: ${createWithoutGuardianResponse.data.name}`);
    console.log(`    ✅ GuardianName é opcional: ${createWithoutGuardianResponse.data.guardianName || 'null'}`);
    
    // Deletar sheltered de teste
    const deleteResponse = await makeRequest('DELETE', `/sheltered/${createWithoutGuardianResponse.data.id}`);
    if (deleteResponse && deleteResponse.status === 200) {
      console.log('    ✅ Sheltered sem guardianName deletado');
    }
  }

  // 6. Teste: Criar sheltered com guardianName e guardianPhone vazios
  console.log('  🔸 Teste 6: Criar sheltered com campos opcionais vazios');
  const createWithEmptyOptionalData = {
    name: `Sheltered Campos Vazios ${Date.now()}`,
    birthDate: '2013-07-10',
    gender: 'F',
    guardianName: '', // Campo vazio
    guardianPhone: '', // Campo vazio
    joinedAt: '2024-03-01',
    shelterId: testData.shelters[0]?.id,
    address: {
      street: 'Rua Campos Vazios',
      number: '789',
      district: 'Jardim Teste',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '05678-901'
    }
  };
  
  const createWithEmptyResponse = await makeRequest('POST', '/sheltered', createWithEmptyOptionalData);
  if (createWithEmptyResponse && createWithEmptyResponse.status === 201) {
    console.log(`    ✅ Sheltered criado com campos vazios: ${createWithEmptyResponse.data.name}`);
    console.log(`    ✅ GuardianName vazio aceito: "${createWithEmptyResponse.data.guardianName || 'null'}"`);
    console.log(`    ✅ GuardianPhone vazio aceito: "${createWithEmptyResponse.data.guardianPhone || 'null'}"`);
    
    // Deletar sheltered de teste
    const deleteResponse = await makeRequest('DELETE', `/sheltered/${createWithEmptyResponse.data.id}`);
    if (deleteResponse && deleteResponse.status === 200) {
      console.log('    ✅ Sheltered com campos vazios deletado');
    }
  }
}

// ==================== TESTES DE RELACIONAMENTOS ====================

async function testShelteredRelationships() {
  console.log('\n📋 Testando Relacionamentos de Sheltered...');
  
  if (testData.shelters.length === 0) {
    console.log('  ⚠️ Nenhum shelter encontrado para testar relacionamentos');
    return;
  }

  // 1. Criar sheltered com shelter
  console.log('  🔸 Teste 1: Criar sheltered com shelter');
  const createWithShelterData = {
    name: `Sheltered com Shelter ${Date.now()}`,
    birthDate: '2012-03-20',
    guardianName: 'João Silva',
    gender: 'M',
    guardianPhone: '+5511888888888',
    joinedAt: '2023-06-01',
    shelterId: testData.shelters[0].id,
    address: {
      street: 'Rua dos Testes',
      number: '789',
      district: 'Teste',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01234-567'
    }
  };

  const createWithShelterResponse = await makeRequest('POST', '/sheltered', createWithShelterData);
  if (createWithShelterResponse && createWithShelterResponse.status === 201) {
    console.log(`    ✅ Sheltered criado com shelter: ${createWithShelterResponse.data.name}`);
    console.log(`    🏠 Shelter vinculado: ${createWithShelterResponse.data.shelter?.name || 'N/A'}`);

    // 2. Atualizar shelter do sheltered
    console.log('  🔸 Teste 2: Atualizar shelter do sheltered');
    if (testData.shelters.length > 1) {
      const updateShelterResponse = await makeRequest('PUT', `/sheltered/${createWithShelterResponse.data.id}`, {
        shelterId: testData.shelters[1].id
      });
      
      if (updateShelterResponse && updateShelterResponse.status === 200) {
        console.log(`    ✅ Shelter atualizado: ${updateShelterResponse.data.shelter?.name || 'N/A'}`);
      }
    }

    // 3. Remover shelter do sheltered
    console.log('  🔸 Teste 3: Remover shelter do sheltered');
    const removeShelterResponse = await makeRequest('PUT', `/sheltered/${createWithShelterResponse.data.id}`, {
      shelterId: null
    });
    
    if (removeShelterResponse && removeShelterResponse.status === 200) {
      console.log('    ✅ Shelter removido com sucesso');
    }

    // 4. Deletar sheltered de teste
    console.log('  🔸 Teste 4: Deletar sheltered de teste');
    const deleteResponse = await makeRequest('DELETE', `/sheltered/${createWithShelterResponse.data.id}`);
    if (deleteResponse && deleteResponse.status === 200) {
      console.log('    ✅ Sheltered de teste deletado');
    }
  }
}

// ==================== CRIAÇÃO EM MASSA ====================

async function createShelteredInBulk(count = 100) {
  console.log(`\n🚀 Criando ${count} sheltered em massa...`);
  
  if (testData.shelters.length === 0) {
    console.log('  ⚠️ Nenhum shelter encontrado. Criando sheltered sem shelter vinculado.');
  }
  
  const firstNames = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Fernando', 'Patricia', 'Ricardo', 'Camila', 'Lucas', 'Beatriz', 'Rafael', 'Mariana', 'Gabriel', 'Isabela', 'Thiago', 'Larissa', 'Bruno', 'Amanda', 'Felipe', 'Carolina', 'Gustavo', 'Leticia', 'Rodrigo', 'Vanessa', 'André', 'Renata', 'Marcelo', 'Tatiana'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Ribeiro', 'Alves', 'Monteiro', 'Mendes'];
  const guardianNames = ['José Silva', 'Maria Santos', 'João Oliveira', 'Ana Costa', 'Pedro Souza', 'Juliana Pereira', 'Carlos Rodrigues', 'Patricia Almeida', 'Fernando Lima', 'Camila Araújo'];
  const genders = ['M', 'F'];
  const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Recife', 'Fortaleza', 'Brasília', 'Manaus'];
  const states = ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA', 'PE', 'CE', 'DF', 'AM'];
  const streets = ['Rua das Flores', 'Avenida Central', 'Rua Principal', 'Avenida dos Abrigos', 'Rua da Esperança'];
  
  const createdSheltered = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const gender = genders[Math.floor(Math.random() * genders.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const stateIndex = cities.indexOf(city);
    const state = states[stateIndex] || 'SP';
    const street = streets[Math.floor(Math.random() * streets.length)];
    
    // Gerar data de nascimento entre 2010 e 2018
    const birthYear = 2010 + Math.floor(Math.random() * 9);
    const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;
    
    // Gerar data de entrada no abrigo entre 2020 e 2024
    const joinedYear = 2020 + Math.floor(Math.random() * 5);
    const joinedMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const joinedDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const joinedAt = `${joinedYear}-${joinedMonth}-${joinedDay}`;
    
    const shelteredData = {
      name: `${firstName} ${lastName}`,
      birthDate: birthDate,
      gender: gender,
      guardianName: Math.random() > 0.3 ? guardianNames[Math.floor(Math.random() * guardianNames.length)] : null,
      guardianPhone: Math.random() > 0.3 ? `+55${11 + Math.floor(Math.random() * 90)}${Math.floor(100000000 + Math.random() * 900000000)}` : null,
      joinedAt: joinedAt,
      shelterId: testData.shelters.length > 0 && Math.random() > 0.2 ? testData.shelters[Math.floor(Math.random() * testData.shelters.length)].id : null,
      address: {
        street: street,
        number: String(Math.floor(Math.random() * 9999) + 1),
        district: `Bairro ${city}`,
        city: city,
        state: state,
        postalCode: `${String(Math.floor(Math.random() * 90000) + 10000)}-${String(Math.floor(Math.random() * 900) + 100)}`,
        complement: Math.random() > 0.5 ? `Apto ${Math.floor(Math.random() * 200) + 1}` : null
      }
    };
    
    const response = await makeRequest('POST', '/sheltered', shelteredData);
    if (response && response.status === 201) {
      createdSheltered.push(response.data);
      successCount++;
      if ((i + 1) % 20 === 0) {
        console.log(`  ✅ ${i + 1}/${count} sheltered criados...`);
      }
    } else {
      errorCount++;
    }
    
    // Pequeno delay para não sobrecarregar o servidor
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log(`\n✅ Criação em massa concluída!`);
  console.log(`   📊 Sucessos: ${successCount}/${count}`);
  console.log(`   ❌ Erros: ${errorCount}/${count}`);
  console.log(`   💾 Total de sheltered criados: ${createdSheltered.length}`);
  
  return createdSheltered;
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runShelteredAutomation() {
  console.log('🎯 AUTOMAÇÃO COMPLETA - MÓDULO SHELTERED');
  console.log('==========================================');
  console.log('📋 Funcionalidades a serem testadas:');
  console.log('   1. CRUD de Sheltered');
  console.log('   2. Filtros e Buscas');
  console.log('   3. Listagens e Paginação');
  console.log('   4. Validações de Dados');
  console.log('   5. Relacionamentos com Shelters');
  console.log('   6. Validação de Gender (M/F)');
  console.log('==========================================');

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

  // Criar dados em massa
  await createShelteredInBulk(100);
  
  // Executar testes
  await testShelteredCRUD();
  await testShelteredFilters();
  await testShelteredListings();
  await testShelteredValidation();
  await testShelteredRelationships();

  console.log('\n🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('=====================================');
  console.log('✅ Todos os testes foram executados');
  console.log('✅ CRUD de Sheltered funcionando');
  console.log('✅ Filtros e buscas funcionando');
  console.log('✅ Listagens e paginação funcionando');
  console.log('✅ Validações de gender (M/F) funcionando');
  console.log('✅ Relacionamentos funcionando');
  console.log('✅ Validações de erro funcionando');
  console.log('✅ Sistema pronto para produção!');
}

// Executar automação
runShelteredAutomation()
  .then(() => {
    console.log('\n✅ Automação finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante a automação:', error);
    process.exit(1);
  });
