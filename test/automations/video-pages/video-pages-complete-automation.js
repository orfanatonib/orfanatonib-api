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

const PAGE_TITLES = [
  'Sermões e Pregações',
  'Estudos Bíblicos em Vídeo',
  'Mensagens de Fé',
  'Palestras e Conferências',
  'Testemunhos e Histórias',
  'Ensinamentos Bíblicos',
  'Cultos e Adoração',
  'Lições para Jovens',
  'Mensagens para Família',
  'Estudos Teológicos',
  'Reflexões Diárias',
  'Mensagens de Esperança',
  'Ensinamentos Práticos',
  'Palavras de Fé',
  'Mensagens Inspiradoras'
];

const DESCRIPTIONS = [
  'Coleção de vídeos com mensagens edificantes e estudos bíblicos.',
  'Vídeos com ensinamentos profundos da Palavra de Deus.',
  'Mensagens de fé e esperança para fortalecer sua caminhada.',
  'Palestras e conferências sobre temas relevantes.',
  'Testemunhos transformadores e histórias de superação.',
  'Ensinamentos bíblicos com aplicações práticas para o dia a dia.',
  'Gravações de cultos e momentos de adoração.',
  'Conteúdo especial para jovens com linguagem atual.',
  'Mensagens direcionadas para fortalecer a família.',
  'Estudos teológicos aprofundados sobre doutrinas bíblicas.',
  'Reflexões diárias para meditação e crescimento espiritual.',
  'Mensagens de esperança em tempos difíceis.',
  'Ensinamentos práticos para aplicar na vida cristã.',
  'Palavras de fé para encorajar e edificar.',
  'Mensagens inspiradoras para transformar vidas.'
];

// Links reais e funcionais para vídeos do YouTube
const VIDEO_URLS = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
  'https://www.youtube.com/watch?v=OPf0YbXqDm0',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=LXb3EKWsInQ',
  'https://www.youtube.com/watch?v=ScMzIvxBSi4',
  'https://www.youtube.com/watch?v=9xwazD5SyVg',
  'https://www.youtube.com/watch?v=1G4isv_Fylg'
];

const VIDEO_TITLES = [
  'Mensagem de Fé e Esperança',
  'Estudo Bíblico: O Poder da Oração',
  'Palavra de Fé para Hoje',
  'Ensinamento: Vivendo em Santidade',
  'Mensagem: O Amor de Deus',
  'Estudo: A Fé que Transforma',
  'Palavra: Caminhando com Cristo',
  'Mensagem: Vitória em Cristo',
  'Estudo: A Graça de Deus',
  'Palavra: Esperança em Tempos Difíceis'
];

const VIDEO_DESCRIPTIONS = [
  'Mensagem edificante sobre fé e esperança em Deus.',
  'Estudo aprofundado sobre o poder da oração na vida cristã.',
  'Palavra de fé para fortalecer sua caminhada diária.',
  'Ensinamento sobre como viver em santidade.',
  'Mensagem sobre o amor incondicional de Deus.',
  'Estudo sobre como a fé transforma vidas.',
  'Palavra sobre caminhar com Cristo no dia a dia.',
  'Mensagem sobre a vitória que temos em Cristo.',
  'Estudo sobre a graça maravilhosa de Deus.',
  'Palavra de esperança para tempos difíceis.'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

// ==================== CRIAR VIDEO PAGE ====================

async function createVideoPage() {
  const videoCount = Math.floor(Math.random() * 5) + 3; // 3 a 7 vídeos
  const selectedVideos = getRandomElements(VIDEO_URLS, videoCount);
  
  const pageData = {
    title: getRandomElement(PAGE_TITLES),
    description: getRandomElement(DESCRIPTIONS),
    public: false, // Privado
    videos: selectedVideos.map((url, index) => ({
      title: VIDEO_TITLES[index % VIDEO_TITLES.length] || `Vídeo ${index + 1}`,
      description: VIDEO_DESCRIPTIONS[index % VIDEO_DESCRIPTIONS.length] || `Descrição do vídeo ${index + 1}`,
      uploadType: 'link',
      url: url,
      isLocalFile: false,
      mediaType: 'video'
    }))
  };

  try {
    const formData = new FormData();
    formData.append('videosPageData', JSON.stringify(pageData));

    const response = await makeRequest('POST', '/video-pages', formData, true);
    
    if (response && response.status === 201) {
      console.log(`  ✅ Página criada: "${pageData.title}" (${videoCount} vídeos)`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar página: "${pageData.title}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar página:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLAS PÁGINAS ====================

async function createMultiplePages(count = 10) {
  console.log(`\n📹 Criando ${count} páginas de vídeos...\n`);
  
  const createdPages = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const page = await createVideoPage();
    
    if (page) {
      createdPages.push(page);
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
  console.log(`  📊 Total criado: ${createdPages.length}`);

  return createdPages;
}

// ==================== TESTES ====================

async function testListAllPages() {
  console.log('\n📋 Testando listagem de todas as páginas...');
  
  const response = await makeRequest('GET', '/video-pages');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} páginas encontradas`);
    return true;
  } else {
    console.log('  ❌ Erro ao listar páginas');
    return false;
  }
}

async function testGetPageById(pageId) {
  console.log(`\n🔍 Testando busca de página por ID: ${pageId}...`);
  
  const response = await makeRequest('GET', `/video-pages/${pageId}`);
  
  if (response && response.status === 200) {
    console.log(`  ✅ Página encontrada: "${response.data.title}"`);
    return true;
  } else {
    console.log('  ❌ Erro ao buscar página');
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Video Pages...\n');

  // Login
  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  // Criar múltiplas páginas
  const createdPages = await createMultiplePages(10);

  if (createdPages.length === 0) {
    console.log('\n⚠️ Nenhuma página foi criada. Abortando testes...');
    return;
  }

  // Testes
  console.log('\n🧪 Executando testes...\n');

  await testListAllPages();
  
  const firstPage = createdPages[0];
  if (firstPage) {
    await testGetPageById(firstPage.id);
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA AUTOMAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Páginas criadas: ${createdPages.length}`);
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

