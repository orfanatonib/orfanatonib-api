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

const SECTION_CAPTIONS = [
  'Culto de Domingo',
  'Reunião de Oração',
  'Estudo Bíblico',
  'Atividades com Crianças',
  'Reunião de Jovens',
  'Evento Especial',
  'Momento de Adoração',
  'Encontro de Casais',
  'Culto de Missões',
  'Reunião de Líderes',
  'Culto de Avivamento',
  'Retiro Espiritual',
  'Culto de Gratidão',
  'Reunião de Adolescentes',
  'Culto de Consagração',
  'Atividades Missionárias',
  'Celebração',
  'Encontro',
  'Atividade Especial',
  'Momento Especial'
];

const SECTION_DESCRIPTIONS = [
  'Fotos do culto de domingo.',
  'Imagens da reunião de oração.',
  'Fotos do estudo bíblico.',
  'Registro das atividades com crianças.',
  'Fotos da reunião de jovens.',
  'Imagens do evento especial.',
  'Momentos especiais de adoração.',
  'Fotos do encontro de casais.',
  'Imagens do culto de missões.',
  'Fotos da reunião de líderes.',
  'Momentos do culto de avivamento.',
  'Fotos do retiro espiritual.',
  'Imagens do culto de gratidão.',
  'Fotos da reunião de adolescentes.',
  'Momentos do culto de consagração.',
  'Registro das atividades missionárias.',
  'Fotos da celebração.',
  'Imagens do encontro.',
  'Fotos da atividade especial.',
  'Momentos especiais capturados.'
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
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
  'https://images.unsplash.com/photo-1509824227185-9c5a01ceba0d?w=800&q=80',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&q=80',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&q=80',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80',
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80'
];

const IMAGE_TITLES = [
  'Foto 1',
  'Imagem 1',
  'Foto do Evento',
  'Imagem do Momento',
  'Registro Fotográfico',
  'Foto Especial',
  'Imagem Especial',
  'Foto do Culto',
  'Imagem da Reunião',
  'Foto do Encontro'
];

const IMAGE_DESCRIPTIONS = [
  'Foto do evento.',
  'Imagem do momento.',
  'Registro fotográfico.',
  'Foto especial.',
  'Imagem especial.',
  'Foto do culto.',
  'Imagem da reunião.',
  'Foto do encontro.',
  'Registro do evento.',
  'Imagem do momento especial.'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

// ==================== CRIAR IMAGE SECTION ÓRFÃ ====================

async function createOrphanSection() {
  const imageCount = Math.floor(Math.random() * 5) + 2; // 2 a 6 imagens
  const selectedImages = getRandomElements(IMAGE_URLS, imageCount);

  const sectionData = {
    caption: getRandomElement(SECTION_CAPTIONS),
    description: getRandomElement(SECTION_DESCRIPTIONS),
    public: false, // Privado
    mediaItems: selectedImages.map((url, index) => ({
      title: IMAGE_TITLES[index % IMAGE_TITLES.length] || `Imagem ${index + 1}`,
      description: IMAGE_DESCRIPTIONS[index % IMAGE_DESCRIPTIONS.length] || `Descrição da imagem ${index + 1}`,
      uploadType: 'link',
      url: url,
      isLocalFile: false,
      mediaType: 'image'
    }))
  };

  try {
    const formData = new FormData();
    formData.append('sectionData', JSON.stringify(sectionData));

    const response = await makeRequest('POST', '/image-sections', formData, true);
    
    if (response && response.status === 201) {
      console.log(`  ✅ Seção órfã criada: "${sectionData.caption}" (${imageCount} imagens)`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar seção órfã: "${sectionData.caption}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar seção órfã:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLAS SEÇÕES ÓRFÃS ====================

async function createMultipleOrphanSections(count = 15) {
  console.log(`\n🖼️ Criando ${count} seções órfãs de imagens...\n`);
  
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
  
  const response = await makeRequest('GET', '/image-sections');
  
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
  
  const response = await makeRequest('GET', `/image-sections/${sectionId}`);
  
  if (response && response.status === 200) {
    console.log(`  ✅ Seção encontrada: "${response.data.caption}"`);
    return true;
  } else {
    console.log('  ❌ Erro ao buscar seção');
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Image Sections Órfãs...\n');

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

