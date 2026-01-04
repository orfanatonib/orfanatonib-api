const axios = require('axios');
const config = require('../shared/config');

const BASE_URL = config.BASE_URL;
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let authToken = '';
let createdProfiles = 0;
let errors = 0;

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
    const requestConfig = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      requestConfig.data = data;
    }

    const response = await axios(requestConfig);
    return response;
  } catch (error) {
    return { error: true, status: error.response?.status, data: error.response?.data };
  }
}

// ==================== GERADORES DE DADOS ====================

function generateBirthDate() {
  const randomAge = Math.floor(Math.random() * 62) + 18; // 18 a 80 anos
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - randomAge;
  const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${birthYear}-${birthMonth}-${birthDay}`;
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomItems(array, min, max) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateProfileData() {
  const loveLanguages = [
    'Palavras de afirmação',
    'Tempo de qualidade',
    'Presentes',
    'Atos de serviço',
    'Toque físico'
  ];

  const temperaments = [
    'Sanguíneo',
    'Colérico',
    'Melancólico',
    'Fleumático',
    'Sanguíneo Colérico',
    'Melancólico Fleumático',
    'Colérico Sanguíneo',
    'Fleumático Melancólico'
  ];

  const colors = [
    'Azul', 'Verde', 'Vermelho', 'Amarelo', 'Roxo', 'Rosa',
    'Laranja', 'Preto', 'Branco', 'Azul Marinho', 'Verde Água', 'Cinza'
  ];

  const foods = [
    'Pizza', 'Lasanha', 'Feijoada', 'Churrasco', 'Sushi',
    'Peixe', 'Frango', 'Massa', 'Salada', 'Hambúrguer',
    'Arroz e feijão', 'Bolo de chocolate', 'Tapioca', 'Açaí'
  ];

  const musics = [
    'Louvores', 'Gospel', 'MPB', 'Rock', 'Pop',
    'Sertanejo', 'Jazz', 'Clássica', 'Adoração',
    'Música instrumental', 'Hinários', 'Contemporânea'
  ];

  const smiles = [
    'Momentos com a família',
    'Ver crianças felizes',
    'Servir ao próximo',
    'Ler a Bíblia',
    'Estar na presença de Deus',
    'Conversas com amigos',
    'Natureza e paisagens',
    'Animais de estimação',
    'Fazer novas amizades',
    'Ajudar as pessoas',
    'Música e louvor',
    'Estudar a Palavra'
  ];

  const talents = [
    'Ensino e educação',
    'Música e canto',
    'Arte e pintura',
    'Culinária',
    'Esportes',
    'Liderança',
    'Comunicação',
    'Organização',
    'Tecnologia',
    'Atendimento e hospitalidade',
    'Artesanato',
    'Fotografia',
    'Dança'
  ];

  const gaLeaderNames = [
    'João e Maria Silva',
    'Pedro e Ana Costa',
    'Carlos e Juliana Santos',
    'Fernando e Patricia Oliveira',
    'Ricardo e Camila Souza',
    'Rafael e Larissa Lima',
    'Gabriel e Mariana Almeida',
    'Bruno e Amanda Ferreira',
    'Lucas e Beatriz Rocha',
    'Thiago e Isabella Martins'
  ];

  const genders = [
    'Masculino',
    'Feminino'
  ];

  return {
    personalData: {
      birthDate: generateBirthDate(),
      gender: getRandomItem(genders),
      gaLeaderName: getRandomItem(gaLeaderNames),
      gaLeaderContact: `(${Math.floor(Math.random() * 90) + 10}) ${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(1000 + Math.random() * 9000)}`
    },
    preferences: {
      loveLanguages: getRandomItems(loveLanguages, 1, 2).join(', '),
      temperaments: getRandomItem(temperaments),
      favoriteColor: getRandomItem(colors),
      favoriteFood: getRandomItem(foods),
      favoriteMusic: getRandomItem(musics),
      whatMakesYouSmile: getRandomItem(smiles),
      skillsAndTalents: getRandomItems(talents, 1, 3).join(', ')
    }
  };
}

// ==================== FUNÇÕES PRINCIPAIS ====================

async function getAllUsers() {
  console.log('\n📊 Buscando todos os usuários...');
  const response = await makeRequest('GET', '/users?limit=1000');

  if (response.error) {
    console.error('❌ Erro ao buscar usuários:', response.data);
    return [];
  }

  const users = response.data.items || [];
  console.log(`✅ ${users.length} usuários encontrados`);
  return users;
}

async function getUserProfile(userId) {
  const response = await makeRequest('GET', `/profiles/${userId}`);
  return !response.error;
}

async function loginAsUser(email, password) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email,
      password
    });

    if (response.status === 201 && response.data.accessToken) {
      return response.data.accessToken;
    }
  } catch (error) {
    return null;
  }
  return null;
}

async function createProfileForUser(user) {
  // Usar endpoint de admin PUT /profiles/:id para criar/atualizar perfil diretamente
  const profileData = generateProfileData();

  // Criar perfil via endpoint de admin
  const response = await makeRequest('PUT', `/profiles/${user.id}`, profileData);

  if (!response.error && (response.status === 200 || response.status === 201)) {
    console.log(`  ✅ Perfil criado para ${user.name} (${user.email})`);
    return true;
  } else {
    if (response.status === 409 || response.data?.message?.includes('já existe')) {
      console.log(`  ℹ️  Perfil já existe para ${user.email}`);
    } else {
      console.log(`  ❌ Erro ao criar perfil para ${user.email}:`, response.data?.message || 'Erro desconhecido');
    }
    return false;
  }
}

async function createProfilesInBulk() {
  console.log('\n🚀 Iniciando criação em massa de perfis...');

  const users = await getAllUsers();

  if (users.length === 0) {
    console.log('❌ Nenhum usuário encontrado');
    return;
  }

  console.log(`\n📝 Criando perfis para ${users.length} usuários...`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    console.log(`\n[${i + 1}/${users.length}] Processando ${user.name}...`);

    const success = await createProfileForUser(user);

    if (success) {
      createdProfiles++;
    } else {
      errors++;
    }

    // Delay para não sobrecarregar o servidor
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n📊 RESUMO DA CRIAÇÃO EM MASSA:');
  console.log('=====================================');
  console.log(`✅ Perfis criados com sucesso: ${createdProfiles}`);
  console.log(`❌ Erros/Perfis já existentes: ${errors}`);
  console.log(`📊 Total de usuários processados: ${users.length}`);
}

async function verifyProfiles() {
  console.log('\n🔍 Verificando perfis criados...');

  const response = await makeRequest('GET', '/profiles');

  if (!response.error && response.status === 200) {
    const profiles = response.data || [];
    console.log(`✅ Total de perfis no sistema: ${profiles.length}`);
  } else {
    console.log('⚠️  Não foi possível verificar perfis');
  }
}

// ==================== TESTES DE CRUD ====================

async function testProfilesCRUD() {
  console.log('\n📋 Testando CRUD de Profiles...');

  // Buscar um usuário para teste
  const usersResponse = await makeRequest('GET', '/users?limit=1');
  if (usersResponse.error || !usersResponse.data.items?.length) {
    console.log('❌ Nenhum usuário disponível para teste');
    return;
  }

  const testUser = usersResponse.data.items[0];

  // Tentar fazer login como o usuário
  const userToken = await loginAsUser(testUser.email, 'Abc@123');
  if (!userToken) {
    console.log('⚠️  Não foi possível fazer login para teste CRUD');
    return;
  }

  const adminToken = authToken;
  authToken = userToken;

  // 1. Criar perfil
  console.log('  🔸 Teste 1: Criar perfil');
  const createData = generateProfileData();
  const createResponse = await makeRequest('POST', '/profiles', createData);

  if (!createResponse.error) {
    console.log('    ✅ Perfil criado com sucesso');

    // 2. Buscar perfil próprio
    console.log('  🔸 Teste 2: Buscar perfil próprio (GET /profiles/me)');
    const meResponse = await makeRequest('GET', '/profiles/me');
    if (!meResponse.error) {
      console.log('    ✅ Perfil próprio encontrado');
    }

    // 3. Atualizar perfil
    console.log('  🔸 Teste 3: Atualizar perfil');
    const updateData = {
      preferences: {
        favoriteColor: 'Azul Turquesa',
        favoriteFood: 'Sushi'
      }
    };
    const updateResponse = await makeRequest('PUT', '/profiles/me', updateData);
    if (!updateResponse.error) {
      console.log('    ✅ Perfil atualizado com sucesso');
    }
  }

  // Restaurar token admin
  authToken = adminToken;
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runProfilesAutomation() {
  console.log('🎯 AUTOMAÇÃO COMPLETA - MÓDULO PROFILES');
  console.log('=====================================');
  console.log('📋 Funcionalidades:');
  console.log('   1. Criação em massa de perfis');
  console.log('   2. CRUD de Profiles');
  console.log('   3. Verificação de perfis');
  console.log('=====================================');

  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Falha no login. Encerrando automação.');
    return;
  }

  // Executar testes
  await testProfilesCRUD();

  // Criar perfis em massa
  await createProfilesInBulk();

  // Verificar perfis criados
  await verifyProfiles();

  console.log('\n🎉 AUTOMAÇÃO CONCLUÍDA!');
  console.log('=====================================');
}

// Executar automação
runProfilesAutomation()
  .then(() => {
    console.log('\n✅ Automação finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante a automação:', error);
    process.exit(1);
  });
