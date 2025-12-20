const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3000';

// Credenciais de admin
const ADMIN_CREDENTIALS = {
  email: 'superuser@orfanatonib.com',
  password: 'Abc@123'
};

let authToken = '';
let testData = {
  visitMaterialPages: []
};

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

async function getTestData() {
  console.log('📊 Obtendo dados necessários para os testes...');
  
  try {
    // Obter visit material pages existentes
    const pagesResponse = await makeRequest('GET', '/visit-material-pages');
    if (pagesResponse) {
      testData.visitMaterialPages = pagesResponse.data || [];
      console.log(`  📚 ${testData.visitMaterialPages.length} visit material pages encontradas`);
    }

    console.log('✅ Dados obtidos com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao obter dados:', error.message);
    return false;
  }
}

// ==================== DADOS MOCKADOS ====================

const OLD_TESTAMENT_TITLES = [
  'Gênesis - A Criação',
  'Êxodo - A Libertação',
  'Levítico - A Santidade',
  'Números - A Jornada',
  'Deuteronômio - A Lei',
  'Josué - A Conquista',
  'Juízes - Os Líderes',
  'Rute - A Fidelidade',
  '1 Samuel - O Reino',
  '2 Samuel - O Reinado',
  '1 Reis - A Divisão',
  '2 Reis - A Queda',
  '1 Crônicas - A História',
  '2 Crônicas - O Templo',
  'Esdras - A Restauração',
  'Neemias - A Reconstrução',
  'Ester - A Providência',
  'Jó - O Sofrimento',
  'Salmos - Os Cânticos',
  'Provérbios - A Sabedoria',
  'Eclesiastes - A Vaidade',
  'Cantares - O Amor',
  'Isaías - O Profeta',
  'Jeremias - A Lamentação',
  'Lamentações - A Tristeza',
  'Ezequiel - A Visão',
  'Daniel - A Profecia',
  'Oséias - O Amor Fiel',
  'Joel - O Dia do Senhor',
  'Amós - A Justiça',
  'Obadias - A Vingança',
  'Jonas - A Obediência',
  'Miquéias - A Esperança',
  'Naum - O Juízo',
  'Habacuque - A Fé',
  'Sofonias - O Dia',
  'Ageu - A Reconstrução',
  'Zacarias - A Restauração',
  'Malaquias - O Mensageiro'
];

const NEW_TESTAMENT_TITLES = [
  'Mateus - O Evangelho do Reino',
  'Marcos - O Evangelho da Ação',
  'Lucas - O Evangelho da Graça',
  'João - O Evangelho da Vida',
  'Atos - A Igreja',
  'Romanos - A Justificação',
  '1 Coríntios - A Unidade',
  '2 Coríntios - O Ministério',
  'Gálatas - A Liberdade',
  'Efésios - A Igreja',
  'Filipenses - A Alegria',
  'Colossenses - A Supremacia',
  '1 Tessalonicenses - A Vinda',
  '2 Tessalonicenses - A Esperança',
  '1 Timóteo - O Ministério',
  '2 Timóteo - A Fidelidade',
  'Tito - A Ordem',
  'Filemom - O Perdão',
  'Hebreus - A Superioridade',
  'Tiago - A Fé',
  '1 Pedro - A Esperança',
  '2 Pedro - O Conhecimento',
  '1 João - O Amor',
  '2 João - A Verdade',
  '3 João - A Hospitalidade',
  'Judas - A Contenda',
  'Apocalipse - A Revelação'
];

const SUBTITLES = [
  'Estudo bíblico para esta semana',
  'Material de estudo e reflexão',
  'Lições e ensinamentos',
  'Estudo aprofundado da Palavra',
  'Reflexão e meditação',
  'Estudo semanal',
  'Material de apoio',
  'Guia de estudo bíblico'
];

const DESCRIPTIONS = [
  'Material completo para estudo e reflexão bíblica desta semana.',
  'Conteúdo preparado especialmente para o estudo da Palavra de Deus.',
  'Recursos e materiais para aprofundar o conhecimento bíblico.',
  'Estudo detalhado com reflexões e aplicações práticas.',
  'Material de apoio para grupos de estudo e meditação.',
  'Conteúdo rico e abrangente para o crescimento espiritual.',
  'Estudo bíblico com aplicações práticas para o dia a dia.',
  'Material completo para estudo individual e em grupo.'
];

// Links reais e funcionais para vídeos do YouTube
const VIDEO_URLS = [
  'https://www.youtube.com/watch?v=jNQXAC9IVRw', // YouTube - vídeo público
  'https://www.youtube.com/watch?v=9bZkp7q19f0', // YouTube - vídeo público
  'https://www.youtube.com/watch?v=kJQP7kiw5Fk', // YouTube - vídeo público
  'https://www.youtube.com/watch?v=fJ9rUzIMcZQ', // YouTube - vídeo público
  'https://www.youtube.com/watch?v=OPf0YbXqDm0', // YouTube - vídeo público
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ'  // YouTube - vídeo público
];

// Links reais para documentos PDF públicos
const DOCUMENT_URLS = [
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'https://www.learningcontainer.com/wp-content/uploads/2020/04/sample-pdf-file.pdf',
  'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf'
];

// Links reais para imagens do Unsplash (imagens públicas e gratuitas)
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

// Links reais para arquivos de áudio MP3 públicos
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

// ==================== CRIAR VISIT MATERIAL PAGE ====================
// NOTA: Esta automação usa apenas links (uploadType: 'link'), sem upload de arquivos

async function createVisitMaterialPage(testamentType = 'OLD_TESTAMENT') {
  const isOldTestament = testamentType === 'OLD_TESTAMENT';
  const titles = isOldTestament ? OLD_TESTAMENT_TITLES : NEW_TESTAMENT_TITLES;
  
  const pageData = {
    pageTitle: getRandomElement(titles),
    pageSubtitle: getRandomElement(SUBTITLES),
    testament: testamentType,
    pageDescription: getRandomElement(DESCRIPTIONS),
    // Todos os media items usam apenas links externos (sem upload de arquivos)
    videos: getRandomElements(VIDEO_URLS, Math.floor(Math.random() * 3) + 1).map((url, index) => ({
      title: `Vídeo ${index + 1} - ${isOldTestament ? 'Antigo Testamento' : 'Novo Testamento'}`,
      description: `Vídeo educativo sobre ${isOldTestament ? 'o Antigo Testamento' : 'o Novo Testamento'}`,
      uploadType: 'link', // Apenas links externos
      url: url,
      isLocalFile: false,
      mediaType: 'video'
    })),
    documents: getRandomElements(DOCUMENT_URLS, Math.floor(Math.random() * 2) + 1).map((url, index) => ({
      title: `Documento ${index + 1} - Estudo`,
      description: `Material de estudo em PDF`,
      uploadType: 'link', // Apenas links externos
      url: url,
      isLocalFile: false,
      mediaType: 'document'
    })),
    images: getRandomElements(IMAGE_URLS, Math.floor(Math.random() * 3) + 1).map((url, index) => ({
      title: `Imagem ${index + 1}`,
      description: `Ilustração bíblica`,
      uploadType: 'link', // Apenas links externos
      url: url,
      isLocalFile: false,
      mediaType: 'image'
    })),
    audios: getRandomElements(AUDIO_URLS, Math.floor(Math.random() * 2) + 1).map((url, index) => ({
      title: `Áudio ${index + 1} - Meditação`,
      description: `Áudio para meditação e reflexão`,
      uploadType: 'link', // Apenas links externos
      url: url,
      isLocalFile: false,
      mediaType: 'audio'
    }))
  };

  try {
    const formData = new FormData();
    formData.append('visitMaterialsPageData', JSON.stringify(pageData));

    const response = await makeRequest('POST', '/visit-material-pages', formData, true);
    
    if (response && response.status === 201) {
      console.log(`  ✅ Página criada: "${pageData.pageTitle}" (${testamentType})`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar página: "${pageData.pageTitle}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar página:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLAS PÁGINAS ====================

async function createMultiplePages(count = 20) {
  console.log(`\n📚 Criando ${count} visit material pages...\n`);
  
  const createdPages = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    // Alternar entre Antigo e Novo Testamento
    const testamentType = i % 2 === 0 ? 'OLD_TESTAMENT' : 'NEW_TESTAMENT';
    
    const page = await createVisitMaterialPage(testamentType);
    
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
  
  const response = await makeRequest('GET', '/visit-material-pages');
  
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
  
  const response = await makeRequest('GET', `/visit-material-pages/${pageId}`);
  
  if (response && response.status === 200) {
    console.log(`  ✅ Página encontrada: "${response.data.title}"`);
    return true;
  } else {
    console.log('  ❌ Erro ao buscar página');
    return false;
  }
}

async function testGetCurrentMaterial() {
  console.log('\n📆 Testando busca de material atual...');
  
  const response = await makeRequest('GET', '/visit-material-pages/current-material');
  
  if (response && response.status === 200) {
    if (response.data.message) {
      console.log(`  ℹ️ ${response.data.message}`);
    } else {
      console.log(`  ✅ Material atual encontrado: "${response.data.title}"`);
    }
    return true;
  } else {
    console.log('  ❌ Erro ao buscar material atual');
    return false;
  }
}

async function testSetCurrentMaterial(pageId) {
  console.log(`\n📌 Testando definir material atual: ${pageId}...`);
  
  const response = await makeRequest('POST', `/visit-material-pages/current-material/${pageId}`);
  
  if (response && (response.status === 200 || response.status === 201)) {
    console.log('  ✅ Material atual definido com sucesso');
    return true;
  } else {
    console.log('  ❌ Erro ao definir material atual');
    return false;
  }
}

async function testUpdatePage(pageId) {
  console.log(`\n✏️ Testando atualização de página: ${pageId}...`);
  
  const updateData = {
    id: pageId,
    pageTitle: 'Título Atualizado - Teste',
    pageSubtitle: 'Subtítulo atualizado',
    testament: 'NEW_TESTAMENT',
    pageDescription: 'Descrição atualizada para teste',
    currentWeek: false,
    videos: [],
    documents: [],
    images: [],
    audios: []
  };

  try {
    const formData = new FormData();
    formData.append('visitMaterialsPageData', JSON.stringify(updateData));

    const response = await makeRequest('PATCH', `/visit-material-pages/${pageId}`, formData, true);
    
    if (response && response.status === 200) {
      console.log('  ✅ Página atualizada com sucesso');
      return true;
    } else {
      console.log('  ❌ Erro ao atualizar página');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Erro ao atualizar página:', error.response?.data || error.message);
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Visit Material Pages...\n');

  // Login
  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  // Obter dados existentes
  await getTestData();

  // Criar múltiplas páginas
  const createdPages = await createMultiplePages(30);

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
    await testGetCurrentMaterial();
    await testSetCurrentMaterial(firstPage.id);
    await testUpdatePage(firstPage.id);
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA AUTOMAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Páginas criadas: ${createdPages.length}`);
  console.log(`📚 Total de páginas no sistema: ${testData.visitMaterialPages.length + createdPages.length}`);
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

