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

const DOCUMENT_NAMES = [
  'Manual do Usuário',
  'Guia de Boas Práticas',
  'Regulamento Interno',
  'Política de Privacidade',
  'Termos de Uso',
  'Guia de Instalação',
  'Documentação Técnica',
  'Manual de Operação',
  'Guia de Referência',
  'Documento de Procedimentos',
  'Manual de Treinamento',
  'Guia de Configuração',
  'Documentação do Sistema',
  'Manual Administrativo',
  'Guia de Manutenção'
];

const DESCRIPTIONS = [
  'Documento completo com todas as informações necessárias.',
  'Guia detalhado para uso correto do sistema.',
  'Documentação oficial do projeto.',
  'Material de referência e consulta.',
  'Documento com instruções passo a passo.',
  'Guia completo de utilização.',
  'Documentação técnica detalhada.',
  'Manual de operação e manutenção.',
  'Material de apoio e consulta.',
  'Documento com procedimentos e normas.',
  'Guia de treinamento e capacitação.',
  'Documentação de configuração.',
  'Manual completo do sistema.',
  'Documento administrativo oficial.',
  'Guia de manutenção e suporte.'
];

// Links reais para documentos PDF públicos
const DOCUMENT_URLS = [
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://www.africau.edu/images/default/sample.pdf',
  'https://www.learningcontainer.com/wp-content/uploads/2020/04/sample-pdf-file.pdf',
  'https://www.adobe.com/support/products/enterprise/knowledgecenter/media/c4611_sample_explain.pdf'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ==================== CRIAR DOCUMENTO ====================

async function createDocument() {
  const documentData = {
    name: getRandomElement(DOCUMENT_NAMES),
    description: getRandomElement(DESCRIPTIONS),
    media: {
      title: `Documento: ${getRandomElement(DOCUMENT_NAMES)}`,
      description: 'Documento em formato PDF',
      uploadType: 'link',
      url: getRandomElement(DOCUMENT_URLS),
      isLocalFile: false,
      mediaType: 'document'
    }
  };

  try {
    const formData = new FormData();
    formData.append('documentData', JSON.stringify(documentData));

    const response = await makeRequest('POST', '/documents', formData, true);
    
    if (response && (response.status === 201 || response.status === 200)) {
      console.log(`  ✅ Documento criado: "${documentData.name}"`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar documento: "${documentData.name}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar documento:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLOS DOCUMENTOS ====================

async function createMultipleDocuments(count = 15) {
  console.log(`\n📄 Criando ${count} documentos...\n`);
  
  const createdDocuments = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const document = await createDocument();
    
    if (document) {
      createdDocuments.push(document);
      successCount++;
    } else {
      errorCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Criação concluída:`);
  console.log(`  ✅ Sucesso: ${successCount}`);
  console.log(`  ❌ Erros: ${errorCount}`);
  console.log(`  📊 Total criado: ${createdDocuments.length}`);

  return createdDocuments;
}

// ==================== TESTES ====================

async function testListAllDocuments() {
  console.log('\n📋 Testando listagem de todos os documentos...');
  
  const response = await makeRequest('GET', '/documents');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} documentos encontrados`);
    return true;
  } else {
    console.log('  ❌ Erro ao listar documentos');
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Documents...\n');

  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  const createdDocuments = await createMultipleDocuments(15);

  if (createdDocuments.length === 0) {
    console.log('\n⚠️ Nenhum documento foi criado. Abortando testes...');
    return;
  }

  console.log('\n🧪 Executando testes...\n');

  await testListAllDocuments();

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA AUTOMAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Documentos criados: ${createdDocuments.length}`);
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

