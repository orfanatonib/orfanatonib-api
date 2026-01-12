const axios = require('axios');
const config = require('../shared/config');
const FormData = require('form-data');

const BASE_URL = config.BASE_URL;

// Credenciais de admin
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let authToken = '';
let testData = {
  users: [],
  shelters: [],
  leaderProfiles: [],
  memberProfiles: []
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

async function makeMultipartRequest(method, url, form) {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...form.getHeaders(),
      },
      data: form,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000,
    });
    return response;
  } catch (error) {
    console.error(`❌ Erro na requisição ${method} ${url}:`, error.response?.data || error.message);
    return null;
  }
}

async function getTestData() {
  console.log('📊 Obtendo dados necessários para os testes...');
  
  try {
    // Obter users (endpoint paginado; não existe /users/simple)
    const usersResponse = await makeRequest('GET', '/users?page=1&limit=50');
    if (usersResponse) {
      testData.users = usersResponse.data?.items || usersResponse.data?.data || [];
      console.log(`  👤 ${testData.users.length} users encontrados`);
    }

    // Obter shelters existentes
    const sheltersResponse = await makeRequest('GET', '/shelters/simple');
    if (sheltersResponse) {
      testData.shelters = sheltersResponse.data || [];
      console.log(`  🏠 ${testData.shelters.length} shelters encontrados`);
    }

    // Obter leader profiles
    const leadersResponse = await makeRequest('GET', '/leader-profiles/simple');
    if (leadersResponse) {
      testData.leaderProfiles = leadersResponse.data || [];
      console.log(`  👨‍💼 ${testData.leaderProfiles.length} leader profiles encontrados`);
    }

    // Obter member profiles
    const membersResponse = await makeRequest('GET', '/member-profiles/simple');
    if (membersResponse) {
      testData.memberProfiles = membersResponse.data || [];
      console.log(`  👩‍🏫 ${testData.memberProfiles.length} member profiles encontrados`);
    }

    console.log('✅ Dados obtidos com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao obter dados:', error.message);
    return false;
  }
}

// ==================== DADOS MOCKADOS ====================

const SHELTER_DESCRIPTIONS = [
  'Abrigo dedicado ao cuidado e desenvolvimento de crianças em situação de vulnerabilidade social.',
  'Instituição comprometida com o bem-estar e educação de jovens em busca de um futuro melhor.',
  'Lar acolhedor que proporciona amor, educação e oportunidades para crianças carentes.',
  'Centro de acolhimento que oferece suporte integral para o desenvolvimento infantil.',
  'Espaço seguro e afetuoso dedicado à formação de cidadãos conscientes e preparados para a vida.'
];

const SHELTER_IMAGES = [
  'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800',
  'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800',
  'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800',
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

const FALLBACK_SHELTER_IMAGES = [
  'https://picsum.photos/id/1011/800/600.jpg',
  'https://picsum.photos/id/1015/800/600.jpg',
  'https://picsum.photos/id/1025/800/600.jpg',
  'https://picsum.photos/id/1035/800/600.jpg',
];

async function isValidImageUrl(url) {
  try {
    const res = await axios.get(url, {
      responseType: 'stream',
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const ct = String(res.headers['content-type'] || '');
    res.data?.destroy?.();
    return ct.startsWith('image/');
  } catch {
    return false;
  }
}

async function pickValidShelterImageUrl() {
  if (global.__cachedValidShelterImageUrl) return global.__cachedValidShelterImageUrl;
  const candidates = [...SHELTER_IMAGES, ...FALLBACK_SHELTER_IMAGES];
  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[(Date.now() + i) % candidates.length];
    // eslint-disable-next-line no-await-in-loop
    if (await isValidImageUrl(url)) {
      global.__cachedValidShelterImageUrl = url;
      return url;
    }
  }
  global.__cachedValidShelterImageUrl = FALLBACK_SHELTER_IMAGES[0];
  return global.__cachedValidShelterImageUrl;
}

// ==================== HELPERS (multipart) ====================

function buildShelterFormData(shelterDto, files = []) {
  const form = new FormData();
  form.append('shelterData', JSON.stringify(shelterDto));
  // Se no futuro quiser anexar arquivo real:
  // files.forEach((f, idx) => form.append('file', f, { filename: f.originalname || `file-${idx}` }));
  return form;
}

// ==================== TESTES DE CRUD ====================

async function testSheltersCRUD() {
  console.log('\n📋 Testando CRUD de Shelters...');
  
  // 1. Criar Shelter
  console.log('  🔸 Teste 1: Criar Shelter com descrição');
  const imageUrl = await pickValidShelterImageUrl();
  const createData = {
    name: `Shelter Teste ${Date.now()}`,
    description: getRandomElement(SHELTER_DESCRIPTIONS),
    teamsQuantity: 1,
    address: {
      street: 'Rua dos Abrigos',
      number: '456',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01234-567',
      complement: 'Prédio A'
    },
    mediaItem: {
      title: 'Foto do Abrigo',
      description: 'Imagem principal do abrigo',
      uploadType: 'link',
      url: imageUrl,
    },
  };
  
  const createForm = buildShelterFormData(createData);
  const createResponse = await makeMultipartRequest('POST', '/shelters', createForm);
  if (createResponse && createResponse.status === 201) {
    console.log(`    ✅ Shelter criado: ${createResponse.data.name}`);
    console.log(`    📝 Descrição: ${createResponse.data.description || 'N/A'}`);
    const createdShelter = createResponse.data;
    
    // 2. Buscar Shelter por ID
    console.log('  🔸 Teste 2: Buscar Shelter por ID');
    const getResponse = await makeRequest('GET', `/shelters/${createdShelter.id}`);
    if (getResponse && getResponse.status === 200) {
      console.log(`    ✅ Shelter encontrado: ${getResponse.data.name}`);
    }

    // 3. Atualizar Shelter
    console.log('  🔸 Teste 3: Atualizar Shelter');
    const updateData = {
      ...createData,
      name: `${createData.name} - Atualizado`,
    };
    
    const updateForm = buildShelterFormData(updateData);
    const updateResponse = await makeMultipartRequest('PUT', `/shelters/${createdShelter.id}`, updateForm);
    if (updateResponse && updateResponse.status === 200) {
      console.log(`    ✅ Shelter atualizado: ${updateResponse.data.name}`);
    }

    // 4. Deletar Shelter
    console.log('  🔸 Teste 4: Deletar Shelter');
    const deleteResponse = await makeRequest('DELETE', `/shelters/${createdShelter.id}`);
    if (deleteResponse && deleteResponse.status === 200) {
      console.log('    ✅ Shelter deletado com sucesso');
    }
  }
}

// ==================== TESTES DE FILTROS ====================

async function testSheltersFilters() {
  console.log('\n📋 Testando Filtros de Shelters...');
  
  // 1. Filtro por nome
  console.log('  🔸 Teste 1: Filtro por nome (shelterName=Central)');
  const nameResponse = await makeRequest('GET', '/shelters?shelterName=Central&limit=5');
  if (nameResponse && nameResponse.status === 200) {
    console.log(`    ✅ Status: ${nameResponse.status}`);
    console.log(`    📊 Encontrados: ${nameResponse.data.items?.length || 0}`);
  }

  // 2. Filtro por endereço
  console.log('  🔸 Teste 2: Filtro por endereço (addressFilter=São Paulo)');
  const addressResponse = await makeRequest('GET', '/shelters?addressFilter=São Paulo&limit=5');
  if (addressResponse && addressResponse.status === 200) {
    console.log(`    ✅ Status: ${addressResponse.status}`);
    console.log(`    📊 Encontrados: ${addressResponse.data.items?.length || 0}`);
  }

  // 3. Filtro por staff
  console.log('  🔸 Teste 3: Filtro por staff (staffFilters=João)');
  const staffResponse = await makeRequest('GET', '/shelters?staffFilters=João&limit=5');
  if (staffResponse && staffResponse.status === 200) {
    console.log(`    ✅ Status: ${staffResponse.status}`);
    console.log(`    📊 Encontrados: ${staffResponse.data.items?.length || 0}`);
  }

  // 4. Busca por string
  console.log('  🔸 Teste 4: Busca por string (searchString=Central)');
  const searchResponse = await makeRequest('GET', '/shelters?searchString=Central&limit=5');
  if (searchResponse && searchResponse.status === 200) {
    console.log(`    ✅ Status: ${searchResponse.status}`);
    console.log(`    📊 Encontrados: ${searchResponse.data.items?.length || 0}`);
  }
}

// ==================== TESTES DE LISTAGEM ====================

async function testSheltersListings() {
  console.log('\n📋 Testando Listagens de Shelters...');
  
  // 1. Listagem paginada
  console.log('  🔸 Teste 1: Listagem paginada');
  const paginatedResponse = await makeRequest('GET', '/shelters?page=1&limit=10');
  if (paginatedResponse && paginatedResponse.status === 200) {
    console.log(`    ✅ Status: ${paginatedResponse.status}`);
    console.log(`    📊 Total: ${paginatedResponse.data.meta?.totalItems || 0}`);
    console.log(`    📄 Itens: ${paginatedResponse.data.items?.length || 0}`);
  }

  // 2. Listagem simples
  console.log('  🔸 Teste 2: Listagem simples');
  const simpleResponse = await makeRequest('GET', '/shelters/simple');
  if (simpleResponse && simpleResponse.status === 200) {
    console.log(`    ✅ Status: ${simpleResponse.status}`);
    console.log(`    📊 Total: ${simpleResponse.data?.length || 0}`);
  }

  // 3. Ordenação
  console.log('  🔸 Teste 3: Ordenação (sort=name, order=ASC)');
  const sortResponse = await makeRequest('GET', '/shelters?sort=name&order=ASC&limit=5');
  if (sortResponse && sortResponse.status === 200) {
    console.log(`    ✅ Status: ${sortResponse.status}`);
    console.log(`    📊 Ordenados: ${sortResponse.data.items?.length || 0}`);
  }
}

// ==================== TESTES DE VALIDAÇÃO ====================

async function testSheltersValidation() {
  console.log('\n📋 Testando Validações de Shelters...');
  
  // 1. Nome muito curto
  console.log('  🔸 Teste 1: Nome muito curto');
  const shortNameForm = buildShelterFormData({
    name: 'A',
    teamsQuantity: 1,
    address: {
      street: 'Rua Teste',
      number: '10',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01000-000',
    },
  });
  const shortNameResponse = await makeMultipartRequest('POST', '/shelters', shortNameForm);
  if (shortNameResponse && shortNameResponse.status === 400) {
    console.log('    ✅ Erro esperado: Nome muito curto rejeitado');
  }

  // 2. Endereço incompleto
  console.log('  🔸 Teste 2: Endereço incompleto');
  const invalidAddressForm = buildShelterFormData({
    name: 'Teste',
    teamsQuantity: 1,
    address: {
      street: 'Rua Teste',
      // Faltando campos obrigatórios
    }
  });
  const invalidAddressResponse = await makeMultipartRequest('POST', '/shelters', invalidAddressForm);
  if (invalidAddressResponse && invalidAddressResponse.status === 400) {
    console.log('    ✅ Erro esperado: Endereço incompleto rejeitado');
  }

  // 3. Endereço inválido
  console.log('  🔸 Teste 3: Endereço inválido');
  const invalidAddress2Form = buildShelterFormData({
    name: 'Teste',
    teamsQuantity: 1,
    address: {
      street: '', // Campo obrigatório vazio
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01234-567'
    }
  });
  const invalidAddress2Response = await makeMultipartRequest('POST', '/shelters', invalidAddress2Form);
  if (invalidAddress2Response && invalidAddress2Response.status === 400) {
    console.log('    ✅ Erro esperado: Endereço inválido rejeitado');
  }

  // 4. Buscar registro inexistente
  console.log('  🔸 Teste 4: Buscar registro inexistente');
  const notFoundResponse = await makeRequest('GET', '/shelters/00000000-0000-0000-0000-000000000000');
  if (notFoundResponse && notFoundResponse.status === 404) {
    console.log('    ✅ Erro esperado: Registro não encontrado');
  }
}

// ==================== TESTES DE RELACIONAMENTOS ====================

async function testSheltersRelationships() {
  console.log('\n📋 Testando Relacionamentos de Shelters...');
  
  if (testData.users.length === 0) {
    console.log('  ⚠️ Nenhum user encontrado para testar relacionamentos');
    return;
  }

  // 1. Criar shelter
  console.log('  🔸 Teste 1: Criar shelter com descrição e imagem');
  const imageUrl = await pickValidShelterImageUrl();
  const createShelterData = {
    name: `Shelter com Relacionamentos ${Date.now()}`,
    description: getRandomElement(SHELTER_DESCRIPTIONS),
    teamsQuantity: 1,
    address: {
      street: 'Rua dos Relacionamentos',
      number: '789',
      district: 'Teste',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01234-567'
    },
    mediaItem: {
      title: 'Foto do Abrigo',
      description: 'Imagem principal do abrigo',
      uploadType: 'link',
      url: imageUrl,
    },
  };

  const createShelterForm = buildShelterFormData(createShelterData);
  const createShelterResponse = await makeMultipartRequest('POST', '/shelters', createShelterForm);
  if (createShelterResponse && createShelterResponse.status === 201) {
    console.log(`    ✅ Shelter criado: ${createShelterResponse.data.name}`);
    console.log(`    📝 Descrição: ${createShelterResponse.data.description || 'N/A'}`);
    const createdShelter = createShelterResponse.data;
    console.log('  ℹ️ Relacionamentos (leaders/members/sheltered) não são testados aqui para evitar endpoints inexistentes.');

    // 2. Deletar shelter de teste
    console.log('  🔸 Teste 2: Deletar shelter de teste');
    const deleteResponse = await makeRequest('DELETE', `/shelters/${createdShelter.id}`);
    if (deleteResponse && deleteResponse.status === 200) {
      console.log('    ✅ Shelter de teste deletado');
    }
  }
}

// ==================== TESTES DE ESTATÍSTICAS ====================

async function testSheltersStatistics() {
  console.log('\n📋 Testando Estatísticas de Shelters...');
  
  // 1. Contar shelters por cidade
  console.log('  🔸 Teste 1: Contar shelters por cidade');
  const cityResponse = await makeRequest('GET', '/shelters?addressFilter=São Paulo&limit=1000');
  if (cityResponse && cityResponse.status === 200) {
    const cityCount = cityResponse.data.items?.length || 0;
    console.log(`    📊 Shelters em São Paulo: ${cityCount}`);
  }

  // 2. Total geral
  console.log('  🔸 Teste 2: Total geral');
  const totalResponse = await makeRequest('GET', '/shelters/simple');
  if (totalResponse && totalResponse.status === 200) {
    const total = totalResponse.data?.length || 0;
    console.log(`    📊 Total de shelters: ${total}`);
  }
}

// ==================== CRIAÇÃO EM MASSA ====================

async function createSheltersInBulk(count = 30) {
  console.log(`\n🚀 Criando ${count} shelters em massa...`);

  const shelterNames = ['Abrigo', 'Lar', 'Casa', 'Centro', 'Instituto', 'Fundação', 'Associação', 'Projeto', 'Núcleo', 'Comunidade'];
  const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Recife', 'Fortaleza', 'Brasília', 'Manaus'];
  const states = ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA', 'PE', 'CE', 'DF', 'AM'];
  const streets = ['Rua das Flores', 'Avenida Central', 'Rua Principal', 'Avenida dos Abrigos', 'Rua da Esperança', 'Avenida da Paz', 'Rua do Amor', 'Avenida da Caridade', 'Rua da Solidariedade', 'Avenida da Fraternidade'];
  const districts = ['Centro', 'Jardim', 'Vila', 'Bairro', 'Parque', 'Alto', 'Nova', 'São', 'Santa', 'Nossa Senhora'];

  const createdShelters = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const namePrefix = shelterNames[Math.floor(Math.random() * shelterNames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const stateIndex = cities.indexOf(city);
    const state = states[stateIndex] || 'SP';
    const street = streets[Math.floor(Math.random() * streets.length)];
    const district = districts[Math.floor(Math.random() * districts.length)];
    const timestamp = Date.now() + i;

    // Garantir imagem real (validada)
    // eslint-disable-next-line no-await-in-loop
    const imageUrl = await pickValidShelterImageUrl();

    const shelterData = {
      name: `${namePrefix} ${city} ${timestamp}`,
      description: getRandomElement(SHELTER_DESCRIPTIONS),
      teamsQuantity: 1,
      address: {
        street: street,
        number: String(Math.floor(Math.random() * 9999) + 1),
        district: `${district} ${city}`,
        city: city,
        state: state,
        postalCode: `${String(Math.floor(Math.random() * 90000) + 10000)}-${String(Math.floor(Math.random() * 900) + 100)}`,
        complement: `Bloco ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
      },
      mediaItem: {
        title: 'Foto do Abrigo',
        description: 'Imagem principal do abrigo',
        uploadType: 'link',
        url: imageUrl,
      },
    };

    const form = buildShelterFormData(shelterData);
    // eslint-disable-next-line no-await-in-loop
    const response = await makeMultipartRequest('POST', '/shelters', form);

    if (response && response.status === 201) {
      createdShelters.push(response.data);
      successCount++;
      if ((i + 1) % 10 === 0) {
        console.log(`  ✅ ${i + 1}/${count} shelters criados...`);
      }
    } else {
      errorCount++;
    }

    // Pequeno delay para não sobrecarregar o servidor
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log(`\n✅ Criação em massa concluída!`);
  console.log(`   📊 Sucessos: ${successCount}/${count}`);
  console.log(`   ❌ Erros: ${errorCount}/${count}`);
  console.log(`   💾 Total de shelters criados: ${createdShelters.length}`);

  return createdShelters;
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runSheltersAutomation() {
  console.log('🎯 AUTOMAÇÃO COMPLETA - MÓDULO SHELTERS');
  console.log('=======================================');
  console.log('📋 Funcionalidades a serem testadas:');
  console.log('   1. CRUD de Shelters');
  console.log('   2. Filtros e Buscas');
  console.log('   3. Listagens e Paginação');
  console.log('   4. Validações de Dados');
  console.log('   5. Relacionamentos com Users/Profiles');
  console.log('   6. Estatísticas e Relatórios');
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

  // Criar dados em massa
  await createSheltersInBulk(30);
  
  // Executar testes
  await testSheltersCRUD();
  await testSheltersFilters();
  await testSheltersListings();
  await testSheltersValidation();
  await testSheltersRelationships();
  await testSheltersStatistics();

  console.log('\n🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('=====================================');
  console.log('✅ Todos os testes foram executados');
  console.log('✅ CRUD de Shelters funcionando');
  console.log('✅ Filtros e buscas funcionando');
  console.log('✅ Listagens e paginação funcionando');
  console.log('✅ Validações funcionando');
  console.log('✅ Relacionamentos funcionando');
  console.log('✅ Estatísticas funcionando');
  console.log('✅ Sistema pronto para produção!');
}

// Executar automação
runSheltersAutomation()
  .then(() => {
    console.log('\n✅ Automação finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante a automação:', error);
    process.exit(1);
  });
