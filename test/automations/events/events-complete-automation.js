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

const EVENT_TITLES = [
  'Culto de Adoração',
  'Estudo Bíblico',
  'Oração e Intercessão',
  'Reunião de Jovens',
  'Escola Bíblica Dominical',
  'Culto de Celebração',
  'Reunião de Oração',
  'Encontro de Casais',
  'Culto de Missões',
  'Reunião de Líderes',
  'Culto de Avivamento',
  'Reunião de Crianças',
  'Culto de Gratidão',
  'Reunião de Adolescentes',
  'Culto de Consagração'
];

const LOCATIONS = [
  'Templo Principal',
  'Salão de Eventos',
  'Auditório',
  'Sala de Reuniões',
  'Pátio Externo',
  'Capela',
  'Sala de Jovens',
  'Sala de Crianças',
  'Online - Zoom',
  'Online - YouTube'
];

const DESCRIPTIONS = [
  'Venha participar deste momento especial de adoração e comunhão.',
  'Estudo aprofundado da Palavra de Deus com aplicações práticas.',
  'Momento de oração e intercessão pela igreja e pela nação.',
  'Encontro especial para jovens com música, palavra e comunhão.',
  'Aulas bíblicas para todas as idades com material didático.',
  'Celebração especial com testemunhos e ministração da Palavra.',
  'Reunião dedicada à oração e busca pela presença de Deus.',
  'Encontro para casais com ministração específica.',
  'Culto especial focado em missões e evangelismo.',
  'Reunião de líderes para planejamento e edificação.',
  'Culto de avivamento com ministração especial.',
  'Atividades e ensino bíblico para crianças.',
  'Culto de gratidão com testemunhos e celebração.',
  'Encontro para adolescentes com dinâmicas e palavra.',
  'Culto de consagração e busca pela santidade.'
];

// Links reais para imagens do Unsplash
const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=800&q=80'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(daysFromNow = 30) {
  const today = new Date();
  const randomDays = Math.floor(Math.random() * daysFromNow);
  const eventDate = new Date(today);
  eventDate.setDate(today.getDate() + randomDays);
  eventDate.setHours(19, 0, 0, 0); // 19:00
  return eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ==================== CRIAR EVENTO ====================

async function createEvent() {
  const eventData = {
    title: getRandomElement(EVENT_TITLES),
    date: getRandomDate(60), // Eventos nos próximos 60 dias
    location: getRandomElement(LOCATIONS),
    description: getRandomElement(DESCRIPTIONS),
    media: {
      title: `Imagem do evento: ${getRandomElement(EVENT_TITLES)}`,
      description: 'Imagem promocional do evento',
      uploadType: 'link',
      url: getRandomElement(IMAGE_URLS),
      isLocalFile: false,
      mediaType: 'image'
    }
  };

  try {
    const formData = new FormData();
    formData.append('eventData', JSON.stringify(eventData));

    const response = await makeRequest('POST', '/events', formData, true);
    
    if (response && response.status === 201) {
      console.log(`  ✅ Evento criado: "${eventData.title}" - ${eventData.date}`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar evento: "${eventData.title}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar evento:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLOS EVENTOS ====================

async function createMultipleEvents(count = 15) {
  console.log(`\n📅 Criando ${count} eventos...\n`);
  
  const createdEvents = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const event = await createEvent();
    
    if (event) {
      createdEvents.push(event);
      successCount++;
    } else {
      errorCount++;
    }

    // Pequeno delay para não sobrecarregar o servidor
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Criação concluída:`);
  console.log(`  ✅ Sucesso: ${successCount}`);
  console.log(`  ❌ Erros: ${errorCount}`);
  console.log(`  📊 Total criado: ${createdEvents.length}`);

  return createdEvents;
}

// ==================== TESTES ====================

async function testListAllEvents() {
  console.log('\n📋 Testando listagem de todos os eventos...');
  
  const response = await makeRequest('GET', '/events');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} eventos encontrados`);
    return true;
  } else {
    console.log('  ❌ Erro ao listar eventos');
    return false;
  }
}

async function testGetUpcomingEvents() {
  console.log('\n📅 Testando busca de eventos futuros...');
  
  const response = await makeRequest('GET', '/events/upcoming');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} eventos futuros encontrados`);
    return true;
  } else {
    console.log('  ❌ Erro ao buscar eventos futuros');
    return false;
  }
}

async function testGetEventById(eventId) {
  console.log(`\n🔍 Testando busca de evento por ID: ${eventId}...`);
  
  const response = await makeRequest('GET', `/events/${eventId}`);
  
  if (response && response.status === 200) {
    console.log(`  ✅ Evento encontrado: "${response.data.title}"`);
    return true;
  } else {
    console.log('  ❌ Erro ao buscar evento');
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Events...\n');

  // Login
  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  // Criar múltiplos eventos
  const createdEvents = await createMultipleEvents(15);

  if (createdEvents.length === 0) {
    console.log('\n⚠️ Nenhum evento foi criado. Abortando testes...');
    return;
  }

  // Testes
  console.log('\n🧪 Executando testes...\n');

  await testListAllEvents();
  await testGetUpcomingEvents();
  
  const firstEvent = createdEvents[0];
  if (firstEvent) {
    await testGetEventById(firstEvent.id);
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA AUTOMAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Eventos criados: ${createdEvents.length}`);
  console.log('='.repeat(60));
}

// Executar automação
runAutomation()
  .then(() => {
    console.log('\n✅ Automação concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal na automação:', error);
    process.exit(1);
  });

