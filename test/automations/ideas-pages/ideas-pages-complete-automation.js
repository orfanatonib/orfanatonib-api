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

const PAGE_TITLES = [
  'Ideias para Ministérios',
  'Recursos e Materiais',
  'Atividades e Dinâmicas',
  'Ideias Criativas',
  'Projetos e Iniciativas',
  'Materiais de Ensino',
  'Ideias para Eventos',
  'Recursos Didáticos',
  'Atividades Práticas',
  'Materiais de Apoio',
  'Ideias para Jovens',
  'Recursos para Crianças',
  'Atividades Missionárias',
  'Ideias para Família',
  'Materiais de Estudo'
];

const SUBTITLES = [
  'Recursos práticos para ministérios',
  'Materiais e ideias criativas',
  'Atividades e dinâmicas',
  'Ideias inovadoras',
  'Projetos e iniciativas',
  'Materiais de ensino',
  'Ideias para eventos',
  'Recursos didáticos',
  'Atividades práticas',
  'Materiais de apoio'
];

const DESCRIPTIONS = [
  'Coleção de ideias e recursos práticos para diversos ministérios.',
  'Materiais e ideias criativas para atividades e eventos.',
  'Atividades e dinâmicas para grupos e reuniões.',
  'Ideias inovadoras para ministérios e projetos.',
  'Projetos e iniciativas para a igreja.',
  'Materiais de ensino e recursos didáticos.',
  'Ideias criativas para eventos e celebrações.',
  'Recursos didáticos para ensino bíblico.',
  'Atividades práticas para grupos.',
  'Materiais de apoio para ministérios.',
  'Ideias especiais para jovens.',
  'Recursos e atividades para crianças.',
  'Atividades e projetos missionários.',
  'Ideias para fortalecer a família.',
  'Materiais de estudo e reflexão.'
];

const SECTION_TITLES = [
  'Atividades',
  'Recursos',
  'Materiais',
  'Ideias',
  'Projetos',
  'Dinâmicas',
  'Exercícios',
  'Tarefas',
  'Atividades Práticas',
  'Recursos Didáticos'
];

const SECTION_DESCRIPTIONS = [
  'Atividades práticas para aplicar.',
  'Recursos úteis para ministérios.',
  'Materiais de apoio disponíveis.',
  'Ideias criativas e inovadoras.',
  'Projetos para desenvolver.',
  'Dinâmicas para grupos.',
  'Exercícios práticos.',
  'Tarefas e atividades.',
  'Atividades práticas para grupos.',
  'Recursos didáticos para ensino.'
];

// Links reais para vídeos do YouTube
const VIDEO_URLS = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
  'https://www.youtube.com/watch?v=OPf0YbXqDm0'
];

// Links reais para documentos PDF públicos
const DOCUMENT_URLS = [
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'https://www.learningcontainer.com/wp-content/uploads/2020/04/sample-pdf-file.pdf',
  'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf'
];

// Links reais para imagens do Unsplash
const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&q=80',
  'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&q=80',
  'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800&q=80',
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80'
];

const MEDIA_TITLES = {
  video: ['Tutorial em Vídeo', 'Vídeo Explicativo', 'Demonstração', 'Aula em Vídeo', 'Vídeo Tutorial'],
  document: ['Material em PDF', 'Guia Prático', 'Documento de Apoio', 'Material Didático', 'PDF de Referência'],
  image: ['Ilustração', 'Diagrama', 'Imagem de Referência', 'Exemplo Visual', 'Imagem Ilustrativa']
};

const MEDIA_DESCRIPTIONS = {
  video: ['Vídeo tutorial explicativo.', 'Vídeo com demonstração prática.', 'Aula em formato de vídeo.', 'Tutorial passo a passo.', 'Vídeo educativo.'],
  document: ['Material em formato PDF.', 'Guia prático em PDF.', 'Documento de apoio.', 'Material didático em PDF.', 'PDF de referência.'],
  image: ['Ilustração explicativa.', 'Diagrama visual.', 'Imagem de referência.', 'Exemplo visual.', 'Imagem ilustrativa.']
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

// ==================== CRIAR IDEAS PAGE ====================

async function createIdeasPage() {
  const sectionCount = Math.floor(Math.random() * 3) + 2; // 2 a 4 seções
  const sections = [];

  for (let i = 0; i < sectionCount; i++) {
    const mediaCount = Math.floor(Math.random() * 4) + 2; // 2 a 5 mídias por seção
    const medias = [];

    // Misturar tipos de mídia
    const videoCount = Math.floor(mediaCount / 3);
    const documentCount = Math.floor(mediaCount / 3);
    const imageCount = mediaCount - videoCount - documentCount;

    // Adicionar vídeos
    if (videoCount > 0) {
      const videos = getRandomElements(VIDEO_URLS, videoCount);
      videos.forEach((url, index) => {
        medias.push({
          title: getRandomElement(MEDIA_TITLES.video),
          description: getRandomElement(MEDIA_DESCRIPTIONS.video),
          mediaType: 'video',
          uploadType: 'link',
          url: url,
          isLocalFile: false
        });
      });
    }

    // Adicionar documentos
    if (documentCount > 0) {
      const documents = getRandomElements(DOCUMENT_URLS, documentCount);
      documents.forEach((url, index) => {
        medias.push({
          title: getRandomElement(MEDIA_TITLES.document),
          description: getRandomElement(MEDIA_DESCRIPTIONS.document),
          mediaType: 'document',
          uploadType: 'link',
          url: url,
          isLocalFile: false
        });
      });
    }

    // Adicionar imagens
    if (imageCount > 0) {
      const images = getRandomElements(IMAGE_URLS, imageCount);
      images.forEach((url, index) => {
        medias.push({
          title: getRandomElement(MEDIA_TITLES.image),
          description: getRandomElement(MEDIA_DESCRIPTIONS.image),
          mediaType: 'image',
          uploadType: 'link',
          url: url,
          isLocalFile: false
        });
      });
    }

    sections.push({
      title: `${getRandomElement(SECTION_TITLES)} ${i + 1}`,
      description: getRandomElement(SECTION_DESCRIPTIONS),
      public: false, // Privado
      medias: medias
    });
  }

  const pageData = {
    title: getRandomElement(PAGE_TITLES),
    subtitle: getRandomElement(SUBTITLES),
    description: getRandomElement(DESCRIPTIONS),
    public: false, // Privado
    sections: sections
  };

  try {
    const formData = new FormData();
    formData.append('ideasMaterialsPageData', JSON.stringify(pageData));

    const response = await makeRequest('POST', '/ideas-pages', formData, true);
    
    if (response && response.status === 201) {
      const totalMedias = sections.reduce((sum, section) => sum + section.medias.length, 0);
      console.log(`  ✅ Página criada: "${pageData.title}" (${sectionCount} seções, ${totalMedias} mídias)`);
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
  console.log(`\n💡 Criando ${count} páginas de ideias...\n`);
  
  const createdPages = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const page = await createIdeasPage();
    
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
  
  const response = await makeRequest('GET', '/ideas-pages');
  
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
  
  const response = await makeRequest('GET', `/ideas-pages/${pageId}`);
  
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
  console.log('🚀 Iniciando automação de Ideas Pages...\n');

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

