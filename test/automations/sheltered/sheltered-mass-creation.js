const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Credenciais de admin
const ADMIN_CREDENTIALS = {
  email: 'superuser@orfanatonib.com',
  password: 'Abc@123'
};

let authToken = '';

// ==================== CONFIGURAÇÃO ====================

// Quantidade de abrigados a criar por abrigo
const SHELTERED_PER_SHELTER = 30;

// ==================== DADOS MOCKADOS ====================

const FIRST_NAMES = {
  M: ['João', 'Pedro', 'Carlos', 'Lucas', 'Gabriel', 'Felipe', 'Rafael', 'Bruno', 'André', 'Thiago', 'Gustavo', 'Marcelo', 'Rodrigo', 'Ricardo', 'Fernando'],
  F: ['Maria', 'Ana', 'Juliana', 'Carolina', 'Beatriz', 'Larissa', 'Amanda', 'Camila', 'Patricia', 'Renata', 'Vanessa', 'Tatiana', 'Mariana', 'Isabela', 'Leticia']
};

const LAST_NAMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Ribeiro', 'Martins', 'Alves', 'Monteiro', 'Mendes', 'Rocha'];

const STREETS = ['Rua das Flores', 'Avenida Principal', 'Rua do Comércio', 'Avenida Central', 'Rua da Paz', 'Avenida dos Trabalhadores', 'Rua Nova', 'Avenida Brasil', 'Rua São Paulo', 'Avenida Paulista'];
const DISTRICTS = ['Centro', 'Jardim Primavera', 'Vila Nova', 'Bairro Novo', 'Centro Histórico', 'Jardim das Flores', 'Vila Esperança', 'Bairro Industrial', 'Centro Comercial', 'Jardim América'];
const CITIES = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Brasília', 'Salvador', 'Recife', 'Fortaleza', 'Manaus'];
const STATES = ['SP', 'RJ', 'MG', 'PR', 'RS', 'DF', 'BA', 'PE', 'CE', 'AM'];

const GUARDIAN_FIRST_NAMES = ['Maria', 'José', 'Ana', 'João', 'Francisco', 'Antonio', 'Paulo', 'Carlos', 'Pedro', 'Lucas'];
const GUARDIAN_LAST_NAMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima'];

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
 * Busca todos os abrigos
 */
async function getAllShelters() {
  console.log('📋 Buscando todos os abrigos...');
  
  try {
    const response = await makeRequest('GET', '/shelters/simple');
    if (response && response.status === 200) {
      const shelters = response.data || [];
      console.log(`   ✅ ${shelters.length} abrigos encontrados\n`);
      return shelters;
    }
    return [];
  } catch (error) {
    console.error('   ❌ Erro ao buscar abrigos:', error.message);
    return [];
  }
}

/**
 * Gera uma data de nascimento aleatória para uma idade específica
 */
function generateBirthDate(age) {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  const month = Math.floor(Math.random() * 12) + 1;
  const daysInMonth = new Date(birthYear, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  return `${birthYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Gera uma data de entrada no abrigo (joinedAt)
 */
function generateJoinedAt() {
  const currentDate = new Date();
  const monthsAgo = Math.floor(Math.random() * 36) + 1; // 1 a 36 meses atrás
  const joinedDate = new Date(currentDate);
  joinedDate.setMonth(currentDate.getMonth() - monthsAgo);
  
  const year = joinedDate.getFullYear();
  const month = String(joinedDate.getMonth() + 1).padStart(2, '0');
  const day = String(joinedDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gera um nome completo aleatório
 */
function generateName(gender) {
  const firstName = FIRST_NAMES[gender][Math.floor(Math.random() * FIRST_NAMES[gender].length)];
  const lastName1 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const lastName2 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName1} ${lastName2}`;
}

/**
 * Gera um nome de responsável aleatório
 */
function generateGuardianName() {
  const firstName = GUARDIAN_FIRST_NAMES[Math.floor(Math.random() * GUARDIAN_FIRST_NAMES.length)];
  const lastName = GUARDIAN_LAST_NAMES[Math.floor(Math.random() * GUARDIAN_LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

/**
 * Gera um telefone aleatório
 */
function generatePhone() {
  const areaCode = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '92'][Math.floor(Math.random() * 10)];
  const number = Math.floor(100000000 + Math.random() * 900000000);
  return `+55${areaCode}${number}`;
}

/**
 * Gera um endereço aleatório
 */
function generateAddress() {
  const street = STREETS[Math.floor(Math.random() * STREETS.length)];
  const number = Math.floor(Math.random() * 9999) + 1;
  const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const state = STATES[Math.floor(Math.random() * STATES.length)];
  const postalCode = `${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(100 + Math.random() * 900)}`;
  const complement = Math.random() > 0.7 ? `Apto ${Math.floor(Math.random() * 200) + 1}` : undefined;
  
  return {
    street,
    number: String(number),
    district,
    city,
    state,
    postalCode,
    complement
  };
}

/**
 * Cria um abrigado
 */
async function createSheltered(shelterId, index) {
  // Distribuir idades: 30% crianças (5-10), 40% pré-adolescentes (11-14), 30% adolescentes (15-17)
  let age;
  const rand = Math.random();
  if (rand < 0.3) {
    age = Math.floor(Math.random() * 6) + 5; // 5-10 anos
  } else if (rand < 0.7) {
    age = Math.floor(Math.random() * 4) + 11; // 11-14 anos
  } else {
    age = Math.floor(Math.random() * 3) + 15; // 15-17 anos
  }
  
  const gender = Math.random() > 0.5 ? 'M' : 'F';
  const name = generateName(gender);
  const birthDate = generateBirthDate(age);
  const joinedAt = generateJoinedAt();
  
  // 80% têm responsável
  const hasGuardian = Math.random() > 0.2;
  
  const shelteredData = {
    name,
    birthDate,
    gender,
    shelterId,
    joinedAt,
    guardianName: hasGuardian ? generateGuardianName() : undefined,
    guardianPhone: hasGuardian ? generatePhone() : undefined,
    address: generateAddress()
  };
  
  const response = await makeRequest('POST', '/sheltered', shelteredData);
  
  return {
    success: response && response.status === 201,
    data: response?.data,
    error: response?.data,
    status: response?.status,
    age,
    gender
  };
}

/**
 * Cria abrigados em massa para todos os abrigos
 */
async function createShelteredForAllShelters(shelteredPerShelter = SHELTERED_PER_SHELTER) {
  console.log('🚀 Iniciando criação de abrigados em massa...\n');
  console.log(`📊 Configuração:`);
  console.log(`   - Abrigados por abrigo: ${shelteredPerShelter}`);
  console.log(`   - Idades: 5-17 anos (distribuídas)\n`);
  
  // Buscar abrigos
  const shelters = await getAllShelters();
  
  if (shelters.length === 0) {
    console.log('❌ Nenhum abrigo encontrado. Não é possível criar abrigados.');
    return;
  }
  
  console.log('='.repeat(60));
  console.log('📝 Criando abrigados...\n');
  
  const stats = {
    total: 0,
    success: 0,
    errors: 0,
    sheltersProcessed: 0,
    sheltersWithErrors: 0,
    ageDistribution: {
      '5-10': 0,
      '11-14': 0,
      '15-17': 0
    },
    genderDistribution: {
      M: 0,
      F: 0
    }
  };
  
  // Processar cada abrigo
  for (let i = 0; i < shelters.length; i++) {
    const shelter = shelters[i];
    const shelterId = shelter.id;
    const shelterName = shelter.name || 'Sem nome';
    
    let createdForThisShelter = 0;
    let errorsForThisShelter = 0;
    
    console.log(`🏠 Abrigo ${i + 1}/${shelters.length}: ${shelterName}`);
    
    // Criar múltiplos abrigados para este abrigo
    for (let j = 0; j < shelteredPerShelter; j++) {
      const result = await createSheltered(shelterId, j);
      stats.total++;
      
      if (result.success) {
        stats.success++;
        createdForThisShelter++;
        
        // Atualizar distribuições
        if (result.age >= 5 && result.age <= 10) {
          stats.ageDistribution['5-10']++;
        } else if (result.age >= 11 && result.age <= 14) {
          stats.ageDistribution['11-14']++;
        } else if (result.age >= 15 && result.age <= 17) {
          stats.ageDistribution['15-17']++;
        }
        
        stats.genderDistribution[result.gender]++;
      } else {
        stats.errors++;
        errorsForThisShelter++;
        if (errorsForThisShelter === 1) { // Log apenas o primeiro erro por abrigo
          const errorMessage = result.error?.message || '';
          console.log(`   ⚠️  Erro ao criar abrigado:`, 
            Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
        }
      }
      
      // Pequeno delay para não sobrecarregar o servidor
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    stats.sheltersProcessed++;
    
    const status = errorsForThisShelter > 0 ? '⚠️' : '✅';
    console.log(`   ${status} ${createdForThisShelter}/${shelteredPerShelter} criados ` +
      `(${errorsForThisShelter} erros)\n`);
    
    if (errorsForThisShelter > 0) {
      stats.sheltersWithErrors++;
    }
  }
  
  // Resumo final
  console.log('='.repeat(60));
  console.log('📊 RESUMO DA CRIAÇÃO DE ABRIGADOS');
  console.log('='.repeat(60));
  console.log(`🏠 Abrigos processados: ${stats.sheltersProcessed}/${shelters.length}`);
  console.log(`✅ Abrigados criados com sucesso: ${stats.success}`);
  console.log(`❌ Erros: ${stats.errors}`);
  console.log(`📝 Total de tentativas: ${stats.total}`);
  console.log(`⚠️  Abrigos com erros: ${stats.sheltersWithErrors}`);
  
  // Estatísticas adicionais
  if (stats.success > 0) {
    const avgShelteredPerShelter = (stats.success / stats.sheltersProcessed).toFixed(2);
    console.log(`📈 Média de abrigados por abrigo: ${avgShelteredPerShelter}`);
    
    console.log(`\n📊 Distribuição por Idade:`);
    console.log(`   👶 5-10 anos: ${stats.ageDistribution['5-10']} (${((stats.ageDistribution['5-10'] / stats.success) * 100).toFixed(1)}%)`);
    console.log(`   👦 11-14 anos: ${stats.ageDistribution['11-14']} (${((stats.ageDistribution['11-14'] / stats.success) * 100).toFixed(1)}%)`);
    console.log(`   👨 15-17 anos: ${stats.ageDistribution['15-17']} (${((stats.ageDistribution['15-17'] / stats.success) * 100).toFixed(1)}%)`);
    
    console.log(`\n📊 Distribuição por Gênero:`);
    console.log(`   👦 Masculino: ${stats.genderDistribution.M} (${((stats.genderDistribution.M / stats.success) * 100).toFixed(1)}%)`);
    console.log(`   👧 Feminino: ${stats.genderDistribution.F} (${((stats.genderDistribution.F / stats.success) * 100).toFixed(1)}%)`);
  }
  
  // Verificar total de abrigados
  console.log('\n🔍 Verificando total de abrigados no sistema...');
  const allShelteredResponse = await makeRequest('GET', '/sheltered/simple');
  if (allShelteredResponse && allShelteredResponse.status === 200) {
    const totalSheltered = allShelteredResponse.data?.length || 0;
    console.log(`   ✅ Total de abrigados no sistema: ${totalSheltered}`);
  }
  
  console.log('='.repeat(60));
  
  return stats;
}

// ==================== EXECUÇÃO ====================

async function runAutomation() {
  console.log('🎯 AUTOMAÇÃO DE CRIAÇÃO DE ABRIGADOS EM MASSA');
  console.log('='.repeat(60));
  console.log('');
  
  // Fazer login
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('❌ Não foi possível fazer login. Abortando...');
    process.exit(1);
  }
  
  // Criar abrigados para todos os abrigos
  await createShelteredForAllShelters(SHELTERED_PER_SHELTER);
  
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

