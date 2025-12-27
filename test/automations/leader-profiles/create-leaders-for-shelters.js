const axios = require('axios');
const config = require('../shared/config');

const BASE_URL = config.BASE_URL;

// Credenciais de admin
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let authToken = '';

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

// ==================== OBTER ABRIGOS EXISTENTES ====================

async function getShelters() {
  console.log('\n📋 Buscando abrigos existentes...');
  
  const response = await makeRequest('GET', '/shelters/simple');
  if (response && response.status === 200) {
    const shelters = response.data || [];
    console.log(`   ✅ ${shelters.length} abrigos encontrados`);
    return shelters;
  }
  
  return [];
}

// ==================== CRIAR LÍDERES ====================

async function createLeadersForShelters(shelters, leadersPerShelter = 1) {
  console.log(`\n👨‍💼 Criando líderes para os abrigos...`);
  console.log(`   📋 ${leadersPerShelter} líder(es) por abrigo`);
  
  const firstNames = ['João', 'Pedro', 'Carlos', 'Fernando', 'Ricardo', 'Lucas', 'Rafael', 'Gabriel', 'Thiago', 'Bruno', 'Felipe', 'Gustavo', 'Rodrigo', 'Marcelo', 'André'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins'];
  
  const allCreatedLeaders = [];
  let totalSuccess = 0;
  let totalErrors = 0;
  
  for (let shelterIndex = 0; shelterIndex < shelters.length; shelterIndex++) {
    const shelter = shelters[shelterIndex];
    console.log(`\n  🏠 Abrigo: ${shelter.name}`);
    
    const shelterLeaders = [];
    
    for (let l = 0; l < leadersPerShelter; l++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const timestamp = Date.now() + shelterIndex * 1000 + l;
      
      // 1. Criar user do tipo leader
      const userData = {
        name: `${firstName} ${lastName}`,
        email: `leader.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@orfanatonib.com`,
        password: 'Abc@123',
        phone: `+55${11 + Math.floor(Math.random() * 90)}${Math.floor(100000000 + Math.random() * 900000000)}`,
        role: 'leader',
        active: true,
        completed: false,
        commonUser: true
      };
      
      const userResponse = await makeRequest('POST', '/users', userData);
      if (userResponse && userResponse.status === 201) {
        const user = userResponse.data;
        console.log(`    ✅ User criado: ${user.name}`);
        
        // 2. Criar leader profile
        const profileResponse = await makeRequest('POST', `/leader-profiles/create-for-user/${user.id}`);
        if (profileResponse && (profileResponse.status === 201 || profileResponse.status === 200)) {
          const leaderProfile = profileResponse.data;
          console.log(`    ✅ Leader profile criado para ${user.name}`);
          
          shelterLeaders.push({
            user: user,
            leaderProfile: leaderProfile,
            shelter: shelter
          });
          totalSuccess++;
        } else {
          console.log(`    ⚠️  Erro ao criar leader profile para ${user.name}`);
          totalErrors++;
        }
      } else {
        totalErrors++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    allCreatedLeaders.push({
      shelter: shelter,
      leaders: shelterLeaders
    });
    
    console.log(`    📊 ${shelterLeaders.length} líder(es) criado(s) para este abrigo`);
  }
  
  console.log(`\n✅ Criação de líderes concluída!`);
  console.log(`   📊 Total de sucessos: ${totalSuccess}`);
  console.log(`   ❌ Total de erros: ${totalErrors}`);
  console.log(`   💾 Total de líderes criados: ${totalSuccess}`);
  
  return allCreatedLeaders;
}

// ==================== VINCULAR LÍDERES AOS ABRIGOS ====================

async function linkLeadersToShelters(leadersData) {
  console.log(`\n🔗 Vinculando líderes aos abrigos...`);
  
  let linkedCount = 0;
  let errorCount = 0;
  
  for (const shelterData of leadersData) {
    const shelter = shelterData.shelter;
    const leaders = shelterData.leaders;
    
    console.log(`\n  🏠 Abrigo: ${shelter.name}`);
    
    for (const leaderData of leaders) {
      const user = leaderData.user;
      const leaderProfile = leaderData.leaderProfile;
      
      if (!leaderProfile) {
        console.log(`    ⚠️  Leader profile não encontrado para ${user.name}`);
        errorCount++;
        continue;
      }
      
      // Vincular ao shelter
      const assignResponse = await makeRequest('PATCH', `/leader-profiles/${leaderProfile.id}/assign-shelter`, {
        shelterId: shelter.id
      });
      
      if (assignResponse && assignResponse.status === 200) {
        console.log(`    ✅ ${user.name} vinculado ao abrigo`);
        linkedCount++;
      } else {
        console.log(`    ❌ Erro ao vincular ${user.name}`);
        errorCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  console.log(`\n✅ Vinculação concluída!`);
  console.log(`   📊 Vinculados: ${linkedCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     👨‍💼 CRIANDO LÍDERES PARA ABRIGOS - ORFANATONIB API      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Falha no login. Encerrando.');
    process.exit(1);
  }
  
  // Obter abrigos existentes
  const shelters = await getShelters();
  
  if (shelters.length === 0) {
    console.error('❌ Nenhum abrigo encontrado. Crie abrigos primeiro.');
    process.exit(1);
  }
  
  // Criar líderes (1 líder por abrigo por padrão)
  const leadersData = await createLeadersForShelters(shelters, 1);
  
  // Vincular líderes aos abrigos
  await linkLeadersToShelters(leadersData);
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ PROCESSO CONCLUÍDO                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Resumo:`);
  console.log(`   🏠 Abrigos processados: ${shelters.length}`);
  console.log(`   👨‍💼 Líderes criados: ${leadersData.reduce((sum, s) => sum + s.leaders.length, 0)}`);
  console.log(`   🔗 Líderes vinculados: ${leadersData.reduce((sum, s) => sum + s.leaders.length, 0)}`);
  console.log(`\n✅ Script finalizado!`);
}

// Executar
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante a execução:', error);
    process.exit(1);
  });

