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

// ==================== CRIAR ABRIGOS ====================

async function createShelters(count = 10) {
  console.log(`\n🏠 Criando ${count} abrigos...`);
  
  const shelterNames = ['Abrigo', 'Lar', 'Casa', 'Centro', 'Instituto', 'Fundação', 'Associação', 'Projeto', 'Núcleo', 'Comunidade'];
  const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Recife', 'Fortaleza', 'Brasília', 'Manaus'];
  const states = ['SP', 'RJ', 'MG', 'PR', 'RS', 'BA', 'PE', 'CE', 'DF', 'AM'];
  const streets = ['Rua das Flores', 'Avenida Central', 'Rua Principal', 'Avenida dos Abrigos', 'Rua da Esperança'];
  const districts = ['Centro', 'Jardim', 'Vila', 'Bairro', 'Parque'];
  
  const descriptions = [
    'Abrigo dedicado ao cuidado e desenvolvimento de crianças em situação de vulnerabilidade social.',
    'Instituição comprometida com o bem-estar e educação de jovens em busca de um futuro melhor.',
    'Lar acolhedor que proporciona amor, educação e oportunidades para crianças carentes.',
    'Centro de acolhimento que oferece suporte integral para o desenvolvimento infantil.',
    'Espaço seguro e afetuoso dedicado à formação de cidadãos conscientes e preparados para a vida.'
  ];
  
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
    
    const shelterData = {
      name: `${namePrefix} ${city} ${timestamp}`,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      address: {
        street: street,
        number: String(Math.floor(Math.random() * 9999) + 1),
        district: `${district} ${city}`,
        city: city,
        state: state,
        postalCode: `${String(Math.floor(Math.random() * 90000) + 10000)}-${String(Math.floor(Math.random() * 900) + 100)}`,
        complement: `Bloco ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
      }
    };
    
    const response = await makeRequest('POST', '/shelters', shelterData);
    if (response && response.status === 201) {
      createdShelters.push(response.data);
      successCount++;
      console.log(`  ✅ ${i + 1}/${count} - ${response.data.name}`);
    } else {
      errorCount++;
    }
    
    // Pequeno delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n✅ Criação de abrigos concluída!`);
  console.log(`   📊 Sucessos: ${successCount}/${count}`);
  console.log(`   ❌ Erros: ${errorCount}/${count}`);
  console.log(`   💾 Total de abrigos criados: ${createdShelters.length}`);
  
  return createdShelters;
}

// ==================== CRIAR PROFESSORES ====================

async function createTeachersForShelters(shelters, teachersPerShelter = 3) {
  console.log(`\n👩‍🏫 Criando professores para os abrigos...`);
  console.log(`   📋 ${teachersPerShelter} professores por abrigo`);
  
  const firstNames = ['Maria', 'Ana', 'Juliana', 'Patricia', 'Camila', 'Beatriz', 'Mariana', 'Isabela', 'Larissa', 'Amanda', 'Carolina', 'Leticia', 'Vanessa', 'Renata', 'Tatiana'];
  const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima'];
  const specializations = ['Matemática', 'Português', 'Ciências', 'História', 'Geografia', 'Inglês', 'Artes', 'Educação Física'];
  
  const allCreatedTeachers = [];
  let totalSuccess = 0;
  let totalErrors = 0;
  
  for (let shelterIndex = 0; shelterIndex < shelters.length; shelterIndex++) {
    const shelter = shelters[shelterIndex];
    console.log(`\n  🏠 Abrigo: ${shelter.name}`);
    
    const shelterTeachers = [];
    
    for (let t = 0; t < teachersPerShelter; t++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const timestamp = Date.now() + shelterIndex * 1000 + t;
      
      // 1. Criar user do tipo teacher
      const userData = {
        name: `${firstName} ${lastName}`,
        email: `teacher.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@orfanatonib.com`,
        password: 'Abc@123',
        phone: `+55${11 + Math.floor(Math.random() * 90)}${Math.floor(100000000 + Math.random() * 900000000)}`,
        role: 'teacher',
        active: true,
        completed: false,
        commonUser: true
      };
      
      const userResponse = await makeRequest('POST', '/users', userData);
      if (userResponse && userResponse.status === 201) {
        const user = userResponse.data;
        console.log(`    ✅ User criado: ${user.name}`);
        
        // 2. Criar teacher profile
        const profileResponse = await makeRequest('POST', `/teacher-profiles/create-for-user/${user.id}`);
        if (profileResponse && (profileResponse.status === 201 || profileResponse.status === 200)) {
          const teacherProfile = profileResponse.data;
          console.log(`    ✅ Teacher profile criado para ${user.name}`);
          
          shelterTeachers.push({
            user: user,
            teacherProfile: teacherProfile,
            shelter: shelter
          });
          totalSuccess++;
        } else {
          console.log(`    ⚠️  Erro ao criar teacher profile para ${user.name}`);
          totalErrors++;
        }
      } else {
        totalErrors++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    allCreatedTeachers.push({
      shelter: shelter,
      teachers: shelterTeachers
    });
    
    console.log(`    📊 ${shelterTeachers.length} professores criados para este abrigo`);
  }
  
  console.log(`\n✅ Criação de professores concluída!`);
  console.log(`   📊 Total de sucessos: ${totalSuccess}`);
  console.log(`   ❌ Total de erros: ${totalErrors}`);
  console.log(`   💾 Total de professores criados: ${totalSuccess}`);
  
  return allCreatedTeachers;
}

// ==================== VINCULAR PROFESSORES AOS ABRIGOS ====================

async function linkTeachersToShelters(teachersData) {
  console.log(`\n🔗 Vinculando professores aos abrigos...`);
  
  let linkedCount = 0;
  let errorCount = 0;
  
  for (const shelterData of teachersData) {
    const shelter = shelterData.shelter;
    const teachers = shelterData.teachers;
    
    console.log(`\n  🏠 Abrigo: ${shelter.name}`);
    
    for (const teacherData of teachers) {
      const user = teacherData.user;
      const teacherProfile = teacherData.teacherProfile;
      
      if (!teacherProfile) {
        console.log(`    ⚠️  Teacher profile não encontrado para ${user.name}`);
        errorCount++;
        continue;
      }
      
      // Vincular ao shelter
      const assignResponse = await makeRequest('PATCH', `/teacher-profiles/${teacherProfile.id}/assign-shelter`, {
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
  console.log('║     🏠 CRIANDO ABRIGOS E PROFESSORES - ORFANATONIB API      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Falha no login. Encerrando.');
    process.exit(1);
  }
  
  // Criar abrigos
  const shelters = await createShelters(10);
  
  if (shelters.length === 0) {
    console.error('❌ Nenhum abrigo foi criado. Encerrando.');
    process.exit(1);
  }
  
  // Criar professores
  const teachersData = await createTeachersForShelters(shelters, 3);
  
  // Vincular professores aos abrigos
  await linkTeachersToShelters(teachersData);
  
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ PROCESSO CONCLUÍDO                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📊 Resumo:`);
  console.log(`   🏠 Abrigos criados: ${shelters.length}`);
  console.log(`   👩‍🏫 Professores criados: ${teachersData.reduce((sum, s) => sum + s.teachers.length, 0)}`);
  console.log(`\n💡 Nota: Para vincular os professores aos abrigos, é necessário:`);
  console.log(`   1. Criar teacher profiles para os users criados`);
  console.log(`   2. Usar o endpoint PATCH /teacher-profiles/:id/assign-shelter`);
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

