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

const SECTION_TITLES = [
  'Atividades para Jovens',
  'Recursos Didáticos',
  'Dinâmicas de Grupo',
  'Materiais de Ensino',
  'Ideias Criativas',
  'Atividades Práticas',
  'Exercícios Bíblicos',
  'Projetos Missionários',
  'Recursos para Crianças',
  'Atividades para Família',
  'Materiais de Apoio',
  'Ideias para Eventos',
  'Dinâmicas de Oração',
  'Atividades de Adoração',
  'Recursos para Líderes',
  'Materiais de Estudo',
  'Ideias para Ministérios',
  'Atividades Sociais',
  'Projetos Comunitários',
  'Recursos Educacionais'
];

const SECTION_DESCRIPTIONS = [
  'Atividades práticas e dinâmicas para jovens.',
  'Recursos didáticos para ensino bíblico.',
  'Dinâmicas de grupo para reuniões.',
  'Materiais de ensino e aprendizado.',
  'Ideias criativas para ministérios.',
  'Atividades práticas para aplicar.',
  'Exercícios bíblicos para estudo.',
  'Projetos e atividades missionárias.',
  'Recursos e atividades para crianças.',
  'Atividades para fortalecer a família.',
  'Materiais de apoio para ministérios.',
  'Ideias criativas para eventos.',
  'Dinâmicas de oração e intercessão.',
  'Atividades de adoração e louvor.',
  'Recursos para líderes e coordenadores.',
  'Materiais de estudo bíblico.',
  'Ideias para diversos ministérios.',
  'Atividades sociais e comunitárias.',
  'Projetos para a comunidade.',
  'Recursos educacionais diversos.'
];

// Links reais para vídeos do YouTube
const VIDEO_URLS = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw',
  'https://www.youtube.com/watch?v=9bZkp7q19f0',
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
  'https://www.youtube.com/watch?v=OPf0YbXqDm0',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://www.youtube.com/watch?v=LXb3EKWsInQ',
  'https://www.youtube.com/watch?v=ScMzIvxBSi4'
];

// Links reais para documentos PDF públicos
const DOCUMENT_URLS = [
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'https://www.learningcontainer.com/wp-content/uploads/2020/04/sample-pdf-file.pdf',
  'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf',
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
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
  'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80'
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

// ==================== CRIAR IDEAS SECTION ÓRFÃ ====================

async function createOrphanSection() {
  const mediaCount = Math.floor(Math.random() * 4) + 2; // 2 a 5 mídias
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

  const sectionData = {
    title: getRandomElement(SECTION_TITLES),
    description: getRandomElement(SECTION_DESCRIPTIONS),
    public: false, // Privado
    medias: medias
  };

  try {
    const formData = new FormData();
    formData.append('sectionData', JSON.stringify(sectionData));

    const response = await makeRequest('POST', '/ideas-sections', formData, true);
    
    if (response && response.status === 201) {
      console.log(`  ✅ Seção órfã criada: "${sectionData.title}" (${mediaCount} mídias)`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar seção órfã: "${sectionData.title}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar seção órfã:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLAS SEÇÕES ÓRFÃS ====================

async function createMultipleOrphanSections(count = 15) {
  console.log(`\n📦 Criando ${count} seções órfãs de ideias...\n`);
  
  const createdSections = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const section = await createOrphanSection();
    
    if (section) {
      createdSections.push(section);
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
  console.log(`  📊 Total criado: ${createdSections.length}`);

  return createdSections;
}

// ==================== TESTES ====================

async function testListAllOrphanSections() {
  console.log('\n📋 Testando listagem de todas as seções órfãs...');
  
  const response = await makeRequest('GET', '/ideas-sections');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} seções órfãs encontradas`);
    return true;
  } else {
    console.log('  ❌ Erro ao listar seções órfãs');
    return false;
  }
}

async function testGetSectionById(sectionId) {
  console.log(`\n🔍 Testando busca de seção por ID: ${sectionId}...`);
  
  const response = await makeRequest('GET', `/ideas-sections/${sectionId}`);
  
  if (response && response.status === 200) {
    console.log(`  ✅ Seção encontrada: "${response.data.title}"`);
    return true;
  } else {
    console.log('  ❌ Erro ao buscar seção');
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Ideas Sections Órfãs...\n');

  // Login
  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  // Criar múltiplas seções órfãs
  const createdSections = await createMultipleOrphanSections(15);

  if (createdSections.length === 0) {
    console.log('\n⚠️ Nenhuma seção órfã foi criada. Abortando testes...');
    return;
  }

  // Testes
  console.log('\n🧪 Executando testes...\n');

  await testListAllOrphanSections();
  
  const firstSection = createdSections[0];
  if (firstSection) {
    await testGetSectionById(firstSection.id);
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA AUTOMAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Seções órfãs criadas: ${createdSections.length}`);
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

