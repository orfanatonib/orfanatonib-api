const axios = require('axios');
const config = require('../shared/config');
const FormData = require('form-data');

const BASE_URL = config.BASE_URL;

// Credenciais de admin
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let authToken = '';

// Links reais e funcionais
const VIDEO_URLS = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
  'https://www.youtube.com/watch?v=OPf0YbXqDm0',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
];

const DOCUMENT_URLS = [
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'https://www.learningcontainer.com/wp-content/uploads/2020/04/sample-pdf-file.pdf',
  'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf'
];

const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&q=80',
  'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&q=80',
  'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800&q=80',
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80',
  'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80'
];

const AUDIO_URLS = [
  'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://file-examples.com/storage/fe68c0c0e1e3a5c5a8e5f0a/2017/11/file_example_MP3_700KB.mp3'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

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

async function getAllPages() {
  console.log('📚 Buscando todas as páginas...');
  const response = await makeRequest('GET', '/visit-material-pages');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} páginas encontradas`);
    return response.data;
  }
  
  return [];
}

async function getPageDetails(pageId) {
  const response = await makeRequest('GET', `/visit-material-pages/${pageId}`);
  if (response && response.status === 200) {
    return response.data;
  }
  return null;
}

async function updatePageWithValidLinks(page) {
  console.log(`\n✏️ Atualizando página: "${page.title}" (ID: ${page.id})`);
  
  // Buscar dados completos da página
  const pageDetails = await getPageDetails(page.id);
  if (!pageDetails) {
    console.log(`  ⚠️ Não foi possível obter detalhes da página`);
    return false;
  }
  
  // Criar novos media items com links válidos (substituir os existentes)
  const videos = getRandomElements(VIDEO_URLS, Math.floor(Math.random() * 3) + 1).map((url, index) => ({
    title: `Vídeo ${index + 1} - ${pageDetails.testament === 'OLD_TESTAMENT' ? 'Antigo Testamento' : 'Novo Testamento'}`,
    description: `Vídeo educativo sobre ${pageDetails.testament === 'OLD_TESTAMENT' ? 'o Antigo Testamento' : 'o Novo Testamento'}`,
    uploadType: 'link',
    url: url,
    isLocalFile: false,
    mediaType: 'video'
  }));

  const documents = getRandomElements(DOCUMENT_URLS, Math.floor(Math.random() * 2) + 1).map((url, index) => ({
    title: `Documento ${index + 1} - Estudo`,
    description: `Material de estudo em PDF`,
    uploadType: 'link',
    url: url,
    isLocalFile: false,
    mediaType: 'document'
  }));

  const images = getRandomElements(IMAGE_URLS, Math.floor(Math.random() * 3) + 1).map((url, index) => ({
    title: `Imagem ${index + 1}`,
    description: `Ilustração bíblica`,
    uploadType: 'link',
    url: url,
    isLocalFile: false,
    mediaType: 'image'
  }));

  const audios = getRandomElements(AUDIO_URLS, Math.floor(Math.random() * 2) + 1).map((url, index) => ({
    title: `Áudio ${index + 1} - Meditação`,
    description: `Áudio para meditação e reflexão`,
    uploadType: 'link',
    url: url,
    isLocalFile: false,
    mediaType: 'audio'
  }));

  const updateData = {
    id: pageDetails.id,
    pageTitle: pageDetails.title,
    pageSubtitle: pageDetails.subtitle,
    testament: pageDetails.testament,
    pageDescription: pageDetails.description,
    currentWeek: pageDetails.currentWeek || false,
    videos: videos,
    documents: documents,
    images: images,
    audios: audios
  };

  try {
    const formData = new FormData();
    formData.append('visitMaterialsPageData', JSON.stringify(updateData));

    const response = await makeRequest('PATCH', `/visit-material-pages/${pageDetails.id}`, formData, true);
    
    if (response && response.status === 200) {
      console.log(`  ✅ Página atualizada com sucesso`);
      return true;
    } else {
      // Se falhou, tentar sem media items primeiro
      console.log(`  ⚠️ Tentando atualizar sem media items...`);
      const updateDataMinimal = {
        id: pageDetails.id,
        pageTitle: pageDetails.title,
        pageSubtitle: pageDetails.subtitle,
        testament: pageDetails.testament,
        pageDescription: pageDetails.description,
        currentWeek: pageDetails.currentWeek || false,
        videos: [],
        documents: [],
        images: [],
        audios: []
      };
      
      const formDataMinimal = new FormData();
      formDataMinimal.append('visitMaterialsPageData', JSON.stringify(updateDataMinimal));
      
      const responseMinimal = await makeRequest('PATCH', `/visit-material-pages/${pageDetails.id}`, formDataMinimal, true);
      if (responseMinimal && responseMinimal.status === 200) {
        console.log(`  ✅ Página atualizada (sem media items)`);
        // Agora tentar adicionar os media items
        await new Promise(resolve => setTimeout(resolve, 500));
        return await updatePageWithValidLinks(page);
      }
      
      console.log(`  ⚠️ Erro ao atualizar página`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao atualizar página:`, error.response?.data?.message || error.message);
    return false;
  }
}

async function fixAllPages() {
  console.log('🔧 Iniciando correção de links quebrados...\n');

  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  const pages = await getAllPages();

  if (pages.length === 0) {
    console.log('⚠️ Nenhuma página encontrada para atualizar.');
    return;
  }

  console.log(`\n📝 Atualizando ${pages.length} páginas com links válidos...\n`);

  let successCount = 0;
  let errorCount = 0;
  const failedPages = [];

  for (const page of pages) {
    const success = await updatePageWithValidLinks(page);
    if (success) {
      successCount++;
    } else {
      errorCount++;
      failedPages.push(page);
    }

    // Pequeno delay para não sobrecarregar o servidor
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Tentar novamente as páginas que falharam
  if (failedPages.length > 0) {
    console.log(`\n🔄 Tentando novamente ${failedPages.length} páginas que falharam...\n`);
    
    for (const page of failedPages) {
      console.log(`  🔄 Retentando: "${page.title}"`);
      const success = await updatePageWithValidLinks(page);
      if (success) {
        successCount++;
        errorCount--;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA CORREÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Páginas atualizadas: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📚 Total processado: ${pages.length}`);
  console.log('='.repeat(60));
}

// Executar correção
fixAllPages()
  .then(() => {
    console.log('\n✅ Correção concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal na correção:', error);
    process.exit(1);
  });

