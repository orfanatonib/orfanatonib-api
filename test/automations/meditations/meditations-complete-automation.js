const axios = require('axios');
const config = require('../shared/config');
const FormData = require('form-data');

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

async function makeRequest(method, url, data = null, isFormData = false) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    };
    
    if (isFormData) {
      config.headers = {
        ...config.headers,
        ...data.getHeaders()
      };
      config.data = data;
    } else if (data) {
      config.headers['Content-Type'] = 'application/json';
      config.data = data;
    } else {
      config.headers['Content-Type'] = 'application/json';
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    console.error(`❌ Erro na requisição ${method} ${url}:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== DADOS MOCKADOS ====================

const TOPICS = [
  'A Fé que Move Montanhas',
  'O Poder da Oração',
  'Amor Incondicional',
  'Gratidão e Alegria',
  'Paz e Serenidade',
  'Esperança em Tempos Difíceis',
  'Perdão e Reconciliação',
  'Humildade e Serviço',
  'Fidelidade e Compromisso',
  'Sabedoria e Discernimento',
  'Coragem e Força',
  'Compaixão e Misericórdia',
  'Unidade e Comunhão',
  'Santidade e Pureza',
  'Obediência e Submissão'
];

const VERSES = [
  'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito.',
  'Tudo posso naquele que me fortalece.',
  'Entrega o teu caminho ao Senhor; confia nele, e ele o fará.',
  'O Senhor é o meu pastor; nada me faltará.',
  'Buscai primeiro o reino de Deus e a sua justiça.',
  'Não temas, porque eu sou contigo.',
  'O amor é paciente, o amor é bondoso.',
  'Lança sobre o Senhor o teu cuidado, e ele te susterá.',
  'Confia no Senhor de todo o teu coração.',
  'Alegrai-vos sempre no Senhor.',
  'Tudo tem o seu tempo determinado.',
  'O Senhor é a minha luz e a minha salvação.',
  'Bem-aventurados os pacificadores.',
  'Vinde a mim, todos os que estais cansados.',
  'Eu sou o caminho, e a verdade, e a vida.'
];

const DAY_TOPICS = [
  'Reflexão sobre a Fé',
  'O Poder da Oração',
  'Amor e Compaixão',
  'Gratidão e Alegria',
  'Paz Interior',
  'Esperança e Confiança',
  'Perdão e Graça',
  'Serviço e Humildade',
  'Fidelidade e Compromisso',
  'Sabedoria Divina'
];

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Links reais para imagens do Unsplash
const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&q=80',
  'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&q=80',
  'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800&q=80'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

function getWeekDates(weekOffset = 0) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.
  
  // Calcular a segunda-feira da semana atual ou futura
  const monday = new Date(today);
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(today.getDate() - daysToMonday);
  monday.setDate(monday.getDate() + (weekOffset * 7)); // Adicionar semanas
  monday.setHours(0, 0, 0, 0);
  
  // Sexta-feira da mesma semana (4 dias depois da segunda)
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(0, 0, 0, 0);
  
  // Verificar se são realmente segunda e sexta
  const mondayDay = monday.getDay();
  const fridayDay = friday.getDay();
  
  if (mondayDay !== 1) {
    console.error(`Erro: segunda-feira calculada é dia ${mondayDay}, esperado 1`);
  }
  if (fridayDay !== 5) {
    console.error(`Erro: sexta-feira calculada é dia ${fridayDay}, esperado 5`);
  }
  
  // Formatar como YYYY-MM-DD (sem timezone)
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    startDate: formatDate(monday),
    endDate: formatDate(friday)
  };
}

// ==================== CRIAR MEDITAÇÃO ====================

async function createMeditation(weekOffset = 0) {
  const topic = getRandomElement(TOPICS);
  const { startDate, endDate } = getWeekDates(weekOffset);
  
  // Criar 5 dias (Monday a Friday)
  const days = WEEK_DAYS.map((day, index) => ({
    day: day,
    verse: getRandomElement(VERSES),
    topic: `${getRandomElement(DAY_TOPICS)} - ${day}`
  }));

  const meditationData = {
    topic: topic,
    startDate: startDate,
    endDate: endDate,
    media: {
      title: `Imagem: ${topic}`,
      description: 'Imagem para meditação semanal',
      uploadType: 'link',
      url: getRandomElement(IMAGE_URLS),
      isLocalFile: false,
      mediaType: 'image'
    },
    days: days
  };

  try {
    const formData = new FormData();
    formData.append('meditationData', JSON.stringify(meditationData));

    const response = await makeRequest('POST', '/meditations', formData, true);
    
    if (response && (response.status === 201 || response.status === 200)) {
      console.log(`  ✅ Meditação criada: "${topic}" (${startDate} a ${endDate})`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar meditação: "${topic}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar meditação:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLAS MEDITAÇÕES ====================

async function createMultipleMeditations(count = 10) {
  console.log(`\n🙏 Criando ${count} meditações...\n`);
  
  const createdMeditations = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    // Usar semanas diferentes para evitar conflitos de datas
    const meditation = await createMeditation(i);
    
    if (meditation) {
      createdMeditations.push(meditation);
      successCount++;
    } else {
      errorCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Criação concluída:`);
  console.log(`  ✅ Sucesso: ${successCount}`);
  console.log(`  ❌ Erros: ${errorCount}`);
  console.log(`  📊 Total criado: ${createdMeditations.length}`);

  return createdMeditations;
}

// ==================== TESTES ====================

async function testListAllMeditations() {
  console.log('\n📋 Testando listagem de todas as meditações...');
  
  const response = await makeRequest('GET', '/meditations');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} meditações encontradas`);
    return true;
  } else {
    console.log('  ❌ Erro ao listar meditações');
    return false;
  }
}

async function testGetThisWeekMeditation() {
  console.log('\n📆 Testando busca de meditação da semana...');
  
  const response = await makeRequest('GET', '/meditations/this-week');
  
  if (response && response.status === 200) {
    if (response.data.message) {
      console.log(`  ℹ️ ${response.data.message}`);
    } else {
      console.log(`  ✅ Meditação da semana encontrada: "${response.data.topic}"`);
    }
    return true;
  } else {
    console.log('  ❌ Erro ao buscar meditação da semana');
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Meditations...\n');

  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  const createdMeditations = await createMultipleMeditations(10);

  if (createdMeditations.length === 0) {
    console.log('\n⚠️ Nenhuma meditação foi criada. Abortando testes...');
    return;
  }

  console.log('\n🧪 Executando testes...\n');

  await testListAllMeditations();
  await testGetThisWeekMeditation();

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA AUTOMAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Meditações criadas: ${createdMeditations.length}`);
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

