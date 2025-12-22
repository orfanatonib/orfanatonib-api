const axios = require('axios');
const FormData = require('form-data');

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

const GALLERY_TITLES = [
  'Galeria de Eventos',
  'Fotos dos Cultos',
  'Retiros e Acampamentos',
  'Atividades com Crianças',
  'Reuniões de Jovens',
  'Eventos Especiais',
  'Momentos de Adoração',
  'Encontros e Conferências',
  'Atividades Missionárias',
  'Celebrações',
  'Fotos da Igreja',
  'Eventos Comunitários',
  'Atividades Sociais',
  'Momentos Especiais',
  'Galeria de Memórias'
];

const GALLERY_DESCRIPTIONS = [
  'Registro fotográfico dos eventos realizados.',
  'Fotos dos cultos e momentos de adoração.',
  'Imagens dos retiros e acampamentos.',
  'Fotos das atividades com crianças.',
  'Registro das reuniões de jovens.',
  'Fotos dos eventos especiais da igreja.',
  'Momentos especiais de adoração e louvor.',
  'Imagens dos encontros e conferências.',
  'Fotos das atividades missionárias.',
  'Registro das celebrações e festas.',
  'Galeria de fotos da igreja.',
  'Fotos dos eventos comunitários.',
  'Imagens das atividades sociais.',
  'Momentos especiais registrados.',
  'Galeria de memórias da igreja.'
];

const SECTION_CAPTIONS = [
  'Culto de Domingo',
  'Reunião de Oração',
  'Estudo Bíblico',
  'Atividades',
  'Momento Especial',
  'Celebração',
  'Encontro',
  'Evento',
  'Reunião',
  'Atividade'
];

const SECTION_DESCRIPTIONS = [
  'Fotos do culto de domingo.',
  'Imagens da reunião de oração.',
  'Fotos do estudo bíblico.',
  'Registro das atividades realizadas.',
  'Momentos especiais capturados.',
  'Fotos da celebração.',
  'Imagens do encontro.',
  'Registro do evento.',
  'Fotos da reunião.',
  'Imagens da atividade.'
];

// Links reais para imagens do Unsplash
const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&q=80',
  'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&q=80',
  'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800&q=80',
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80',
  'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
  'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=800&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

// ==================== CRIAR IMAGE PAGE ====================

async function createImagePage() {
  const sectionCount = Math.floor(Math.random() * 3) + 2; // 2 a 4 seções
  const sections = [];

  for (let i = 0; i < sectionCount; i++) {
    const imageCount = Math.floor(Math.random() * 4) + 2; // 2 a 5 imagens por seção
    const selectedImages = getRandomElements(IMAGE_URLS, imageCount);

    sections.push({
      caption: `${getRandomElement(SECTION_CAPTIONS)} ${i + 1}`,
      description: getRandomElement(SECTION_DESCRIPTIONS),
      public: false, // Privado
      mediaItems: selectedImages.map((url, index) => ({
        title: `Imagem ${index + 1}`,
        description: `Foto ${index + 1} da seção`,
        uploadType: 'link',
        url: url,
        isLocalFile: false,
        mediaType: 'image'
      }))
    });
  }

  const pageData = {
    title: getRandomElement(GALLERY_TITLES),
    description: getRandomElement(GALLERY_DESCRIPTIONS),
    public: false, // Privado
    sections: sections
  };

  try {
    const formData = new FormData();
    formData.append('imageData', JSON.stringify(pageData));

    const response = await makeRequest('POST', '/image-pages', formData, true);
    
    if (response && response.status === 201) {
      const totalImages = sections.reduce((sum, section) => sum + section.mediaItems.length, 0);
      console.log(`  ✅ Galeria criada: "${pageData.title}" (${sectionCount} seções, ${totalImages} imagens)`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar galeria: "${pageData.title}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar galeria:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLAS PÁGINAS ====================

async function createMultiplePages(count = 10) {
  console.log(`\n🖼️ Criando ${count} galerias de imagens...\n`);
  
  const createdPages = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const page = await createImagePage();
    
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
  console.log('\n📋 Testando listagem de todas as galerias...');
  
  const response = await makeRequest('GET', '/image-pages');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} galerias encontradas`);
    return true;
  } else {
    console.log('  ❌ Erro ao listar galerias');
    return false;
  }
}

async function testGetPageById(pageId) {
  console.log(`\n🔍 Testando busca de galeria por ID: ${pageId}...`);
  
  const response = await makeRequest('GET', `/image-pages/${pageId}`);
  
  if (response && response.status === 200) {
    console.log(`  ✅ Galeria encontrada: "${response.data.title}"`);
    return true;
  } else {
    console.log('  ❌ Erro ao buscar galeria');
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Image Pages...\n');

  // Login
  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  // Criar múltiplas páginas
  const createdPages = await createMultiplePages(10);

  if (createdPages.length === 0) {
    console.log('\n⚠️ Nenhuma galeria foi criada. Abortando testes...');
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
  console.log(`✅ Galerias criadas: ${createdPages.length}`);
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

