const axios = require('axios');

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

async function makeRequest(method, url, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    console.error(`❌ Erro na requisição ${method} ${url}:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== DADOS MOCKADOS ====================

const TITLES = [
  'Aviso Importante',
  'Novidades no Sistema',
  'Atualização de Horários',
  'Evento Especial',
  'Manutenção Programada',
  'Nova Funcionalidade',
  'Aviso de Segurança',
  'Mudanças Importantes',
  'Comunicado Oficial',
  'Informação Relevante',
  'Atualização de Políticas',
  'Novo Conteúdo Disponível',
  'Aviso de Suspensão',
  'Mudança de Local',
  'Informação Urgente'
];

const DESCRIPTIONS = [
  'Informamos que haverá uma atualização importante no sistema.',
  'Temos o prazer de anunciar novas funcionalidades disponíveis.',
  'Os horários de atendimento foram atualizados.',
  'Convidamos todos para participar do nosso evento especial.',
  'Informamos sobre a manutenção programada do sistema.',
  'Nova funcionalidade foi adicionada para melhorar sua experiência.',
  'Aviso importante sobre segurança e privacidade.',
  'Mudanças importantes que afetam todos os usuários.',
  'Comunicado oficial da administração.',
  'Informação relevante que todos devem conhecer.',
  'Atualização nas políticas de uso do sistema.',
  'Novo conteúdo foi adicionado e está disponível.',
  'Aviso sobre suspensão temporária de serviços.',
  'Mudança de local para as próximas reuniões.',
  'Informação urgente que requer atenção imediata.'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ==================== CRIAR INFORMATIVO ====================

async function createInformative() {
  const informativeData = {
    title: getRandomElement(TITLES),
    description: getRandomElement(DESCRIPTIONS),
    public: Math.random() > 0.3 // 70% públicos
  };

  try {
    const response = await makeRequest('POST', '/informatives', informativeData);
    
    if (response && (response.status === 201 || response.status === 200)) {
      console.log(`  ✅ Informativo criado: "${informativeData.title}" (${informativeData.public ? 'Público' : 'Privado'})`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar informativo: "${informativeData.title}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar informativo:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLOS INFORMATIVOS ====================

async function createMultipleInformatives(count = 15) {
  console.log(`\n📢 Criando ${count} informativos...\n`);
  
  const createdInformatives = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const informative = await createInformative();
    
    if (informative) {
      createdInformatives.push(informative);
      successCount++;
    } else {
      errorCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n✅ Criação concluída:`);
  console.log(`  ✅ Sucesso: ${successCount}`);
  console.log(`  ❌ Erros: ${errorCount}`);
  console.log(`  📊 Total criado: ${createdInformatives.length}`);

  return createdInformatives;
}

// ==================== TESTES ====================

async function testListAllInformatives() {
  console.log('\n📋 Testando listagem de todos os informativos...');
  
  const response = await makeRequest('GET', '/informatives');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} informativos encontrados`);
    return true;
  } else {
    console.log('  ❌ Erro ao listar informativos');
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Informatives...\n');

  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  const createdInformatives = await createMultipleInformatives(15);

  if (createdInformatives.length === 0) {
    console.log('\n⚠️ Nenhum informativo foi criado. Abortando testes...');
    return;
  }

  console.log('\n🧪 Executando testes...\n');

  await testListAllInformatives();

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA AUTOMAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Informativos criados: ${createdInformatives.length}`);
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

