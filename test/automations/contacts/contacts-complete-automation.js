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

const NAMES = [
  'Maria Silva',
  'João Santos',
  'Ana Costa',
  'Pedro Oliveira',
  'Carla Ferreira',
  'Lucas Almeida',
  'Juliana Souza',
  'Rafael Lima',
  'Fernanda Rocha',
  'Bruno Martins',
  'Patricia Gomes',
  'Ricardo Dias',
  'Camila Araújo',
  'Thiago Ribeiro',
  'Larissa Barbosa'
];

const EMAILS = [
  'maria.silva@email.com',
  'joao.santos@email.com',
  'ana.costa@email.com',
  'pedro.oliveira@email.com',
  'carla.ferreira@email.com',
  'lucas.almeida@email.com',
  'juliana.souza@email.com',
  'rafael.lima@email.com',
  'fernanda.rocha@email.com',
  'bruno.martins@email.com'
];

const PHONES = [
  '(11) 98765-4321',
  '(21) 97654-3210',
  '(31) 96543-2109',
  '(41) 95432-1098',
  '(51) 94321-0987',
  '(61) 93210-9876',
  '(71) 92109-8765',
  '(81) 91098-7654',
  '(85) 90987-6543',
  '(92) 89876-5432'
];

const MESSAGES = [
  'Gostaria de mais informações sobre os eventos.',
  'Como posso me inscrever para participar?',
  'Quero saber mais sobre os projetos sociais.',
  'Gostaria de fazer uma doação.',
  'Como posso me tornar voluntário?',
  'Preciso de informações sobre os horários.',
  'Gostaria de conhecer melhor o trabalho de vocês.',
  'Como posso ajudar nas atividades?',
  'Quero saber sobre os cursos oferecidos.',
  'Gostaria de agendar uma visita.',
  'Preciso de informações sobre inscrições.',
  'Como posso entrar em contato com a equipe?',
  'Gostaria de saber sobre os programas disponíveis.',
  'Quero participar das reuniões.',
  'Preciso de mais detalhes sobre os serviços.'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ==================== CRIAR CONTATO ====================

async function createContact() {
  const contactData = {
    name: getRandomElement(NAMES),
    email: getRandomElement(EMAILS),
    phone: getRandomElement(PHONES),
    message: getRandomElement(MESSAGES)
  };

  try {
    // Contato não precisa de autenticação
    const response = await axios.post(`${BASE_URL}/contact`, contactData, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response && (response.status === 201 || response.status === 200)) {
      console.log(`  ✅ Contato criado: "${contactData.name}" - ${contactData.email}`);
      return response.data;
    } else {
      console.log(`  ⚠️ Erro ao criar contato: "${contactData.name}"`);
      return null;
    }
  } catch (error) {
    console.error(`  ❌ Erro ao criar contato:`, error.response?.data || error.message);
    return null;
  }
}

// ==================== CRIAR MÚLTIPLOS CONTATOS ====================

async function createMultipleContacts(count = 15) {
  console.log(`\n📧 Criando ${count} contatos...\n`);
  
  const createdContacts = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < count; i++) {
    const contact = await createContact();
    
    if (contact) {
      createdContacts.push(contact);
      successCount++;
    } else {
      errorCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`\n✅ Criação concluída:`);
  console.log(`  ✅ Sucesso: ${successCount}`);
  console.log(`  ❌ Erros: ${errorCount}`);
  console.log(`  📊 Total criado: ${createdContacts.length}`);

  return createdContacts;
}

// ==================== TESTES ====================

async function testListAllContacts() {
  console.log('\n📋 Testando listagem de todos os contatos...');
  
  const response = await makeRequest('GET', '/contact');
  
  if (response && response.status === 200) {
    console.log(`  ✅ ${response.data.length} contatos encontrados`);
    return true;
  } else {
    console.log('  ❌ Erro ao listar contatos');
    return false;
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAutomation() {
  console.log('🚀 Iniciando automação de Contacts...\n');

  if (!await login()) {
    console.error('❌ Falha no login. Abortando...');
    return;
  }

  const createdContacts = await createMultipleContacts(15);

  if (createdContacts.length === 0) {
    console.log('\n⚠️ Nenhum contato foi criado. Abortando testes...');
    return;
  }

  console.log('\n🧪 Executando testes...\n');

  await testListAllContacts();

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA AUTOMAÇÃO');
  console.log('='.repeat(60));
  console.log(`✅ Contatos criados: ${createdContacts.length}`);
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

