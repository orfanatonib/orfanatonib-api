const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Credenciais de admin
const ADMIN_CREDENTIALS = {
  email: 'superuser@orfanatonib.com',
  password: 'Abc@123'
};

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
        'Content-Type': 'application/json',
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

// ==================== DADOS MOCKADOS ====================

const NAMES = [
  'Maria Silva',
  'João Santos',
  'Ana Costa',
  'Pedro Oliveira',
  'Carla Ferreira',
  'Lucas Almeida',
  'Juliana Souza',
  'Rafael Lima',
  'Fernanda Rocha',
  'Bruno Martins'
];

const EMAILS = [
  'maria.silva@email.com',
  'joao.santos@email.com',
  'ana.costa@email.com',
  'pedro.oliveira@email.com',
  'carla.ferreira@email.com',
  'lucas.almeida@email.com',
  'juliana.souza@email.com',
  'rafael.lima@email.com',
  'fernanda.rocha@email.com',
  'bruno.martins@email.com'
];

const CATEGORIES = [
  'content',
  'appearance',
  'usability',
  'broken_feature',
  'missing_feature',
  'performance',
  'mobile_experience',
  'suggestion',
  'complaint',
  'other'
];

const COMMENTS = [
  'O site está muito bom, mas poderia ter mais conteúdo.',
  'Gostei muito da interface, muito intuitiva.',
  'Encontrei um bug na página de login.',
  'Seria interessante ter uma versão mobile melhor.',
  'Adorei o design, muito moderno e limpo.',
  'O site está lento em alguns momentos.',
  'Falta uma funcionalidade de busca.',
  'Sugestão: adicionar mais imagens.',
  'O conteúdo está excelente, parabéns!',
  'Preciso de ajuda com uma funcionalidade.',
  'O site está muito bom, continue assim!',
  'Encontrei alguns problemas de navegação.',
  'Gostaria de ver mais recursos disponíveis.',
  'O desempenho está ótimo, parabéns!',
  'Sugestão de melhoria: adicionar filtros.'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomRating() {
  return Math.floor(Math.random() * 5) + 1; // 1 a 5
}

// ==================== CRIAR FEEDBACK ====================

async function createFeedback() {
  const feedbackData = {
    name: getRandomElement(NAMES),
    email: getRandomElement(EMAILS),
    rating: getRandomRating(),
    comment: getRandomElement(COMMENTS),
    category: getRandomElement(CATEGORIES)
  };

  try {
    const response = await makeRequest('POST', '/site-feedbacks', feedbackData);
    
    if (response && (response.status === 201 || response.status === 200)) {
      console.log(`  ✅ Feedback criado: "${feedbackData.name}" - Rating: ${feedbackData.rating}/5`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar feedback: "${feedbackData.name}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar feedback:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLOS FEEDBACKS ====================

async function createMultipleFeedbacks(count = 20) {
  console.log(`\n💭 Criando ${count} feedbacks...\n`);
  
  const createdFeedbacks = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const feedback = await createFeedback();
    
    if (feedback) {
      createdFeedbacks.push(feedback);
      successCount++;
    } else {
      errorCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n✅ Criação concluída:`);
  console.log(`  ✅ Sucesso: ${successCount}`);
  console.log(`  ❌ Erros: ${errorCount}`);
  console.log(`  📊 Total criado: ${createdFeedbacks.length}`);

  return createdFeedbacks;
}

// ==================== TESTES ====================

async function testListAllFeedbacks() {
  console.log('\n📋 Testando listagem de todos os feedbacks...');
  
  const response = await makeRequest('GET', '/site-feedbacks');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} feedbacks encontrados`);
    return true;
  } else {
    console.log('  ❌ Erro ao listar feedbacks');
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Feedbacks...\n');

  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  const createdFeedbacks = await createMultipleFeedbacks(20);

  if (createdFeedbacks.length === 0) {
    console.log('\n⚠️ Nenhum feedback foi criado. Abortando testes...');
    return;
  }

  console.log('\n🧪 Executando testes...\n');

  await testListAllFeedbacks();

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA AUTOMAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Feedbacks criados: ${createdFeedbacks.length}`);
  console.log('='.repeat(60));
}

runAutomation()
  .then(() => {
    console.log('\n✅ Automação concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal na automação:', error);
    process.exit(1);
  });

