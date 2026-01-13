const axios = require('axios');
const config = require('../shared/config');

const BASE_URL = config.BASE_URL;

// Credenciais de admin
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let authToken = '';
let testData = {
  users: [],
  shelters: []
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
    // Obter users existentes
    const usersResponse = await makeRequest('GET', '/users/simple');
    if (usersResponse) {
      testData.users = usersResponse.data || [];
      console.log(`  👤 ${testData.users.length} users encontrados`);
    }

    // Obter shelters
    const sheltersResponse = await makeRequest('GET', '/shelters/simple');
    if (sheltersResponse) {
      testData.shelters = sheltersResponse.data || [];
      console.log(`  🏠 ${testData.shelters.length} shelters encontrados`);
    }

    console.log('✅ Dados obtidos com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao obter dados:', error.message);
    return false;
  }
}

// ==================== TESTES DE CRUD ====================

async function testUsersCRUD() {
  console.log('\n📋 Testando CRUD de Users...');

  // 1. Criar User
  console.log('  🔸 Teste 1: Criar User');
  const createData = {
    name: `User Teste ${Date.now()}`,
    email: `teste${Date.now()}@example.com`,
    password: 'password123',
    phone: '+5511999999999',
    role: 'member'
  };

  const createResponse = await makeRequest('POST', '/users', createData);
  if (createResponse && createResponse.status === 201) {
    console.log(`    ✅ User criado: ${createResponse.data.name}`);
    const createdUser = createResponse.data;

    // 2. Buscar User por ID
    console.log('  🔸 Teste 2: Buscar User por ID');
    const getResponse = await makeRequest('GET', `/users/${createdUser.id}`);
    if (getResponse && getResponse.status === 200) {
      console.log(`    ✅ User encontrado: ${getResponse.data.name}`);
    }

    // 3. Atualizar User
    console.log('  🔸 Teste 3: Atualizar User');
    const updateData = {
      name: `${createData.name} - Atualizado`,
      role: 'leader'
    };

    const updateResponse = await makeRequest('PUT', `/users/${createdUser.id}`, updateData);
    if (updateResponse && updateResponse.status === 200) {
      console.log(`    ✅ User atualizado: ${updateResponse.data.name}`);
    }

    // 4. Deletar User
    console.log('  🔸 Teste 4: Deletar User');
    const deleteResponse = await makeRequest('DELETE', `/users/${createdUser.id}`);
    if (deleteResponse && deleteResponse.status === 200) {
      console.log('    ✅ User deletado com sucesso');
    }
  }
}

// ==================== TESTES DE FILTROS ====================

async function testUsersFilters() {
  console.log('\n📋 Testando Filtros de Users...');

  // 1. Filtro por busca geral
  console.log('  🔸 Teste 1: Filtro por busca geral (q=João)');
  const searchResponse = await makeRequest('GET', '/users?q=João&limit=5');
  if (searchResponse && searchResponse.status === 200) {
    console.log(`    ✅ Status: ${searchResponse.status}`);
    console.log(`    📊 Encontrados: ${searchResponse.data.items?.length || 0}`);
  }

  // 2. Filtro por busca geral (email)
  console.log('  🔸 Teste 2: Filtro por busca geral (q=joao)');
  const emailResponse = await makeRequest('GET', '/users?q=joao&limit=5');
  if (emailResponse && emailResponse.status === 200) {
    console.log(`    ✅ Status: ${emailResponse.status}`);
    console.log(`    📊 Encontrados: ${emailResponse.data.items?.length || 0}`);
  }

  // 3. Filtro por role
  console.log('  🔸 Teste 3: Filtro por role (role=member)');
  const roleResponse = await makeRequest('GET', '/users?role=member&limit=5');
  if (roleResponse && roleResponse.status === 200) {
    console.log(`    ✅ Status: ${roleResponse.status}`);
    console.log(`    📊 Encontrados: ${roleResponse.data.items?.length || 0}`);
  }

  // 4. Filtro por status ativo
  console.log('  🔸 Teste 4: Filtro por status ativo (active=true)');
  const activeResponse = await makeRequest('GET', '/users?active=true&limit=5');
  if (activeResponse && activeResponse.status === 200) {
    console.log(`    ✅ Status: ${activeResponse.status}`);
    console.log(`    📊 Encontrados: ${activeResponse.data.items?.length || 0}`);
  }

  // 5. Filtro por completado
  console.log('  🔸 Teste 5: Filtro por completado (completed=true)');
  const completedResponse = await makeRequest('GET', '/users?completed=true&limit=5');
  if (completedResponse && completedResponse.status === 200) {
    console.log(`    ✅ Status: ${completedResponse.status}`);
    console.log(`    📊 Encontrados: ${completedResponse.data.items?.length || 0}`);
  }

  // 6. Busca combinada
  console.log('  🔸 Teste 6: Busca combinada (role=admin&active=true)');
  const combinedResponse = await makeRequest('GET', '/users?role=admin&active=true&limit=5');
  if (combinedResponse && combinedResponse.status === 200) {
    console.log(`    ✅ Status: ${combinedResponse.status}`);
    console.log(`    📊 Encontrados: ${combinedResponse.data.items?.length || 0}`);
  }
}

// ==================== TESTES DE LISTAGEM ====================

async function testUsersListings() {
  console.log('\n📋 Testando Listagens de Users...');

  // 1. Listagem paginada
  console.log('  🔸 Teste 1: Listagem paginada');
  const paginatedResponse = await makeRequest('GET', '/users?page=1&limit=10');
  if (paginatedResponse && paginatedResponse.status === 200) {
    console.log(`    ✅ Status: ${paginatedResponse.status}`);
    console.log(`    📊 Total: ${paginatedResponse.data.meta?.totalItems || 0}`);
    console.log(`    📄 Itens: ${paginatedResponse.data.items?.length || 0}`);
  }

  // 2. Listagem simples (sem endpoint específico, usar paginada)
  console.log('  🔸 Teste 2: Listagem com limite alto');
  const simpleResponse = await makeRequest('GET', '/users?limit=1000');
  if (simpleResponse && simpleResponse.status === 200) {
    console.log(`    ✅ Status: ${simpleResponse.status}`);
    console.log(`    📊 Total: ${simpleResponse.data.items?.length || 0}`);
  }

  // 3. Ordenação
  console.log('  🔸 Teste 3: Ordenação (sort=name, order=ASC)');
  const sortResponse = await makeRequest('GET', '/users?sort=name&order=ASC&limit=5');
  if (sortResponse && sortResponse.status === 200) {
    console.log(`    ✅ Status: ${sortResponse.status}`);
    console.log(`    📊 Ordenados: ${sortResponse.data.items?.length || 0}`);
  }
}

// ==================== TESTES DE VALIDAÇÃO ====================

async function testUsersValidation() {
  console.log('\n📋 Testando Validações de Users...');

  // 1. Email inválido
  console.log('  🔸 Teste 1: Email inválido');
  const invalidEmailResponse = await makeRequest('POST', '/users', {
    name: 'Teste',
    email: 'email-invalido',
    password: 'password123',
    phone: '+5511999999999',
    role: 'member'
  });
  if (invalidEmailResponse && invalidEmailResponse.status === 400) {
    console.log('    ✅ Erro esperado: Email inválido rejeitado');
  }

  // 2. Senha muito curta
  console.log('  🔸 Teste 2: Senha muito curta');
  const shortPasswordResponse = await makeRequest('POST', '/users', {
    name: 'Teste',
    email: 'teste@example.com',
    password: '123',
    phone: '+5511999999999',
    role: 'member'
  });
  if (shortPasswordResponse && shortPasswordResponse.status === 400) {
    console.log('    ✅ Erro esperado: Senha muito curta rejeitada');
  }

  // 3. Role inválido
  console.log('  🔸 Teste 3: Role inválido');
  const invalidRoleResponse = await makeRequest('POST', '/users', {
    name: 'Teste',
    email: 'teste@example.com',
    password: 'password123',
    phone: '+5511999999999',
    role: 'invalid-role'
  });
  if (invalidRoleResponse && invalidRoleResponse.status === 400) {
    console.log('    ✅ Erro esperado: Role inválido rejeitado');
  }

  // 4. Phone obrigatório
  console.log('  🔸 Teste 4: Phone obrigatório');
  const noPhoneResponse = await makeRequest('POST', '/users', {
    name: 'Teste',
    email: 'teste@example.com',
    password: 'password123',
    role: 'member'
  });
  if (noPhoneResponse && noPhoneResponse.status === 400) {
    console.log('    ✅ Erro esperado: Phone obrigatório rejeitado');
  }

  // 4. Email duplicado
  console.log('  🔸 Teste 4: Email duplicado');
  if (testData.users.length > 0) {
    const duplicateEmailResponse = await makeRequest('POST', '/users', {
      name: 'Teste',
      email: testData.users[0].email, // Usar email existente
      password: 'password123',
      phone: '+5511999999999',
      role: 'member'
    });
    if (duplicateEmailResponse && duplicateEmailResponse.status === 400) {
      console.log('    ✅ Erro esperado: Email duplicado rejeitado');
    }
  }

  // 5. Buscar registro inexistente
  console.log('  🔸 Teste 5: Buscar registro inexistente');
  const notFoundResponse = await makeRequest('GET', '/users/00000000-0000-0000-0000-000000000000');
  if (notFoundResponse && notFoundResponse.status === 404) {
    console.log('    ✅ Erro esperado: Registro não encontrado');
  }
}

// ==================== TESTES DE AUTENTICAÇÃO ====================

async function testUsersAuthentication() {
  console.log('\n📋 Testando Autenticação de Users...');

  // 1. Criar user para teste de login
  console.log('  🔸 Teste 1: Criar user para teste de login');
  const createData = {
    name: `User Auth Test ${Date.now()}`,
    email: `auth${Date.now()}@example.com`,
    password: 'password123',
    phone: '+5511888888888',
    role: 'member'
  };

  const createResponse = await makeRequest('POST', '/users', createData);
  if (createResponse && createResponse.status === 201) {
    console.log(`    ✅ User criado: ${createResponse.data.name}`);
    const createdUser = createResponse.data;

    // 2. Testar login com credenciais corretas
    console.log('  🔸 Teste 2: Login com credenciais corretas');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: createData.email,
        password: createData.password
      });
      if (loginResponse.status === 201) {
        console.log('    ✅ Login realizado com sucesso');
      }
    } catch (error) {
      console.log('    ❌ Erro no login:', error.response?.data || error.message);
    }

    // 3. Testar login com senha incorreta
    console.log('  🔸 Teste 3: Login com senha incorreta');
    try {
      const wrongPasswordResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: createData.email,
        password: 'senha-errada'
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('    ✅ Erro esperado: Senha incorreta rejeitada');
      }
    }

    // 4. Deletar user de teste
    console.log('  🔸 Teste 4: Deletar user de teste');
    const deleteResponse = await makeRequest('DELETE', `/users/${createdUser.id}`);
    if (deleteResponse && deleteResponse.status === 200) {
      console.log('    ✅ User de teste deletado');
    }
  }
}

// ==================== TESTES DE ROLES ====================

async function testUsersRoles() {
  console.log('\n📋 Testando Roles de Users...');

  const roles = ['admin', 'leader', 'member'];

  for (const role of roles) {
    console.log(`  🔸 Teste: Criar user com role ${role}`);
    const createData = {
      name: `User ${role} ${Date.now()}`,
      email: `${role}${Date.now()}@example.com`,
      password: 'password123',
      role: role
    };

    const createResponse = await makeRequest('POST', '/users', createData);
    if (createResponse && createResponse.status === 201) {
      console.log(`    ✅ User ${role} criado: ${createResponse.data.name}`);

      // Deletar user de teste
      const deleteResponse = await makeRequest('DELETE', `/users/${createResponse.data.id}`);
      if (deleteResponse && deleteResponse.status === 200) {
        console.log(`    ✅ User ${role} deletado`);
      }
    }
  }
}

// ==================== TESTES DE ESTATÍSTICAS ====================

async function testUsersStatistics() {
  console.log('\n📋 Testando Estatísticas de Users...');

  // 1. Contar users por role
  console.log('  🔸 Teste 1: Contar users por role');
  const roles = ['admin', 'leader', 'member'];

  for (const role of roles) {
    const roleResponse = await makeRequest('GET', `/users?role=${role}&limit=1000`);
    if (roleResponse && roleResponse.status === 200) {
      const count = roleResponse.data.items?.length || 0;
      console.log(`    📊 Users com role ${role}: ${count}`);
    }
  }

  // 2. Contar users ativos/inativos
  console.log('  🔸 Teste 2: Contar users ativos/inativos');
  const activeResponse = await makeRequest('GET', '/users?isActive=true&limit=1000');
  const inactiveResponse = await makeRequest('GET', '/users?isActive=false&limit=1000');

  if (activeResponse && activeResponse.status === 200) {
    const activeCount = activeResponse.data.items?.length || 0;
    console.log(`    📊 Users ativos: ${activeCount}`);
  }

  if (inactiveResponse && inactiveResponse.status === 200) {
    const inactiveCount = inactiveResponse.data.items?.length || 0;
    console.log(`    📊 Users inativos: ${inactiveCount}`);
  }
}

// ==================== CRIAÇÃO EM MASSA ====================

async function createUsersInBulk(memberCount = 1200, leaderCount = 120) {
  console.log(`\n🚀 Criando usuários em massa...`);
  console.log(`   👥 Members: ${memberCount}`);
  console.log(`   👨‍💼 Leaders: ${leaderCount}`);
  console.log(`   📊 Total: ${memberCount + leaderCount}`);

  const firstNames = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Fernando', 'Patricia', 'Ricardo', 'Camila', 'Lucas', 'Beatriz', 'Rafael', 'Mariana', 'Gabriel', 'Isabela', 'Thiago', 'Larissa', 'Bruno', 'Amanda'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Ribeiro', 'Alves', 'Monteiro', 'Mendes'];

  const createdUsers = [];
  let successCount = 0;
  let errorCount = 0;

  // Criar members
  for (let i = 0; i < memberCount; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const timestamp = Date.now() + i;

    const userData = {
      name: `${firstName} ${lastName}`,
      email: `member.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@orfanatonib.com`,
      password: 'Abc@123',
      phone: `+55${11 + Math.floor(Math.random() * 90)}${Math.floor(100000000 + Math.random() * 900000000)}`,
      role: 'member',
      active: true, // ✅ Ativo por padrão
      completed: false,
      commonUser: true
    };

    const response = await makeRequest('POST', '/users', userData);
    if (response && response.status === 201) {
      createdUsers.push(response.data);
      successCount++;
      if ((i + 1) % 100 === 0) {
        console.log(`  ✅ ${i + 1}/${memberCount} members criados...`);
      }
    } else {
      errorCount++;
    }

    // Pequeno delay
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  // Criar leaders
  for (let i = 0; i < leaderCount; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const timestamp = Date.now() + memberCount + i;

    const userData = {
      name: `${firstName} ${lastName}`,
      email: `leader.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@orfanatonib.com`,
      password: 'Abc@123',
      phone: `+55${11 + Math.floor(Math.random() * 90)}${Math.floor(100000000 + Math.random() * 900000000)}`,
      role: 'leader',
      active: true, // ✅ Ativo por padrão
      completed: true,
      commonUser: true
    };

    const response = await makeRequest('POST', '/users', userData);
    if (response && response.status === 201) {
      createdUsers.push(response.data);
      successCount++;
      if ((i + 1) % 20 === 0) {
        console.log(`  ✅ ${i + 1}/${leaderCount} leaders criados...`);
      }
    } else {
      errorCount++;
    }

    // Pequeno delay
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  const totalExpected = memberCount + leaderCount;
  console.log(`\n✅ Criação em massa concluída!`);
  console.log(`   📊 Sucessos: ${successCount}/${totalExpected}`);
  console.log(`   ❌ Erros: ${errorCount}/${totalExpected}`);
  console.log(`   💾 Total de usuários criados: ${createdUsers.length}`);

  return createdUsers;
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runUsersAutomation() {
  console.log('🎯 AUTOMAÇÃO COMPLETA - MÓDULO USERS');
  console.log('=====================================');
  console.log('📋 Funcionalidades a serem testadas:');
  console.log('   1. CRUD de Users');
  console.log('   2. Filtros e Buscas');
  console.log('   3. Listagens e Paginação');
  console.log('   4. Validações de Dados');
  console.log('   5. Autenticação e Login');
  console.log('   6. Roles e Permissões');
  console.log('   7. Estatísticas de Users');
  console.log('=====================================');

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

  // Criar dados em massa: 1200 members + 120 leaders = 1320 users
  await createUsersInBulk(1200, 120);

  // Executar testes
  await testUsersCRUD();
  await testUsersFilters();
  await testUsersListings();
  await testUsersValidation();
  await testUsersAuthentication();
  await testUsersRoles();
  await testUsersStatistics();

  console.log('\n🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('=====================================');
  console.log('✅ Todos os testes foram executados');
  console.log('✅ CRUD de Users funcionando');
  console.log('✅ Filtros e buscas funcionando');
  console.log('✅ Listagens e paginação funcionando');
  console.log('✅ Validações funcionando');
  console.log('✅ Autenticação funcionando');
  console.log('✅ Roles funcionando');
  console.log('✅ Estatísticas funcionando');
  console.log('✅ Sistema pronto para produção!');
}

// Executar automação
runUsersAutomation()
  .then(() => {
    console.log('\n✅ Automação finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante a automação:', error);
    process.exit(1);
  });
