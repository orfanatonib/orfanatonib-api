const ApiClient = require('../shared/api-client');
const config = require('../shared/config');
const Logger = require('../shared/logger');

const BASE_URL = config.BASE_URL;
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let client;
let testData = {
  teams: [],
  shelters: [],
  createdSchedules: []
};

// ==================== UTILITÁRIOS ====================

async function getTestData() {
  Logger.section('📊 Obtendo dados necessários para os testes...');

  try {
    // Obter teams
    const teamsResponse = await client.get('/teams');
    if (teamsResponse && teamsResponse.status === 200) {
      testData.teams = teamsResponse.data || [];
      Logger.info(`🎯 ${testData.teams.length} teams encontrados`);
    }

    // Obter shelters
    const sheltersResponse = await client.get('/shelters/simple');
    if (sheltersResponse && sheltersResponse.status === 200) {
      testData.shelters = sheltersResponse.data || [];
      Logger.info(`🏠 ${testData.shelters.length} shelters encontrados`);
    }

    Logger.success('Dados obtidos com sucesso!');
    return true;
  } catch (error) {
    Logger.error(`Erro ao obter dados: ${error.message}`);
    return false;
  }
}

// ==================== CRIAÇÃO EM MASSA ====================

/**
 * Cria schedules para todos os times
 * Gera múltiplas visitas ao longo do ano
 */
async function createSchedulesForAllTeams(schedulesPerTeam = 12) {
  Logger.header(`🚀 Criando schedules para TODOS os times`);
  Logger.info(`📋 Schedules por time: ${schedulesPerTeam}`);

  if (testData.teams.length === 0) {
    Logger.warning('Nenhum team encontrado. Não é possível criar schedules.');
    return [];
  }

  const createdSchedules = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  const currentYear = new Date().getFullYear();

  // Iterar sobre TODOS os times
  for (let teamIndex = 0; teamIndex < testData.teams.length; teamIndex++) {
    const team = testData.teams[teamIndex];
    const teamId = team.id;
    const teamNumber = team.numberTeam || teamIndex + 1;

    // Verificar schedules existentes para este time
    const existingSchedulesResponse = await client.get(`/shelter-schedules?teamId=${teamId}`);
    const existingSchedules = existingSchedulesResponse && existingSchedulesResponse.status === 200
      ? existingSchedulesResponse.data || []
      : [];

    // Obter números de visita já existentes
    const existingVisitNumbers = new Set();
    existingSchedules.forEach(s => {
      if (s.visitNumber) existingVisitNumbers.add(s.visitNumber);
    });

    Logger.info(`Time ${teamNumber}: ${existingSchedules.length} schedules existentes`);

    // Criar múltiplos schedules para cada time
    for (let visitNum = 1; visitNum <= schedulesPerTeam; visitNum++) {
      // Verificar se já existe este número de visita
      if (existingVisitNumbers.has(visitNum)) {
        skippedCount++;
        continue;
      }

      // Calcular datas (distribuir ao longo do ano)
      // Reunião: segunda-feira antes da visita
      // Visita: sábado
      const monthIndex = (visitNum - 1) % 12;
      const weekInMonth = Math.floor(Math.random() * 3) + 1; // 1-3 semana do mês

      const meetingDate = generateDate(currentYear, monthIndex, weekInMonth, 1); // Segunda
      const visitDate = generateDate(currentYear, monthIndex, weekInMonth, 6); // Sábado

      const scheduleData = {
        teamId: teamId,
        visitNumber: visitNum,
        visitDate: visitDate,
        meetingDate: meetingDate,
        lessonContent: `Lição ${visitNum} - ${getLessonTheme(visitNum)}`,
        observation: Math.random() > 0.5 ? `Observação da visita ${visitNum}` : undefined,
        meetingRoom: `Sala ${Math.floor(Math.random() * 5) + 1}`
      };

      const response = await client.post('/shelter-schedules', scheduleData);
      if (response && (response.status === 201 || response.status === 200)) {
        createdSchedules.push(response.data);
        testData.createdSchedules.push(response.data);
        successCount++;
        existingVisitNumbers.add(visitNum);
      } else {
        errorCount++;
        if (errorCount <= 5) {
          Logger.warning(`Erro ao criar schedule para time ${teamNumber} (visita ${visitNum})`);
        }
      }

      // Pequeno delay para não sobrecarregar o servidor
      await delay(50);
    }

    // Log de progresso a cada 5 times
    if ((teamIndex + 1) % 5 === 0) {
      Logger.progress(teamIndex + 1, testData.teams.length, 'teams processados');
    }
  }

  Logger.success('Criação de schedules concluída!');
  Logger.info(`📊 Schedules criados: ${successCount}`);
  Logger.info(`⏭️  Schedules já existentes (pulados): ${skippedCount}`);
  Logger.info(`❌ Erros: ${errorCount}`);

  return {
    createdSchedules,
    successCount,
    skippedCount,
    errorCount,
    teamsProcessed: testData.teams.length
  };
}

// ==================== FUNÇÕES AUXILIARES ====================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gera uma data específica
 * @param {number} year - Ano
 * @param {number} monthIndex - Índice do mês (0-11)
 * @param {number} weekNumber - Semana do mês (1-4)
 * @param {number} dayOfWeek - Dia da semana (0=domingo, 1=segunda, 6=sábado)
 */
function generateDate(year, monthIndex, weekNumber, dayOfWeek) {
  const month = monthIndex + 1;
  const day = (weekNumber - 1) * 7 + dayOfWeek + 1;

  // Garantir que o dia não ultrapasse o limite do mês
  const maxDays = new Date(year, month, 0).getDate();
  const validDay = Math.min(day, maxDays);

  return `${year}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
}

/**
 * Retorna um tema de lição baseado no número da visita
 */
function getLessonTheme(visitNumber) {
  const themes = [
    'Amor e Bondade',
    'Respeito ao Próximo',
    'Honestidade e Verdade',
    'Gratidão',
    'Paciência e Perseverança',
    'Perdão',
    'Humildade',
    'Coragem',
    'Responsabilidade',
    'Solidariedade',
    'Fé e Esperança',
    'Paz Interior'
  ];

  return themes[(visitNumber - 1) % themes.length];
}

// ==================== TESTES DE CRUD ====================

async function testShelterScheduleCRUD() {
  Logger.section('📋 Testando CRUD de Shelter Schedule...');

  if (testData.teams.length === 0) {
    Logger.warning('Nenhum team encontrado para criar schedule');
    return;
  }

  const team = testData.teams[0];
  const teamId = team.id;

  // 1. Criar Schedule
  Logger.info('🔸 Teste 1: Criar Schedule');

  const createData = {
    teamId: teamId,
    visitNumber: 999, // Número alto para não conflitar
    visitDate: '2025-12-25',
    meetingDate: '2025-12-20',
    lessonContent: 'Lição de teste - CRUD',
    observation: 'Schedule de teste para CRUD',
    meetingRoom: 'Sala de Testes'
  };

  const createResponse = await client.post('/shelter-schedules', createData);
  if (createResponse && (createResponse.status === 201 || createResponse.status === 200)) {
    Logger.success(`Schedule criado: ID ${createResponse.data.id}`);
    const createdSchedule = createResponse.data;

    // 2. Buscar Schedule por ID
    Logger.info('🔸 Teste 2: Buscar Schedule por ID');
    const getResponse = await client.get(`/shelter-schedules/${createdSchedule.id}`);
    if (getResponse && getResponse.status === 200) {
      Logger.success(`Schedule encontrado: ID ${getResponse.data.id}`);
    }

    // 3. Atualizar Schedule
    Logger.info('🔸 Teste 3: Atualizar Schedule');
    const updateData = {
      lessonContent: 'Lição atualizada - CRUD',
      observation: 'Observação atualizada'
    };

    const updateResponse = await client.put(`/shelter-schedules/${createdSchedule.id}`, updateData);
    if (updateResponse && updateResponse.status === 200) {
      Logger.success(`Schedule atualizado: ID ${updateResponse.data.id}`);
    }

    // 4. Deletar Schedule
    Logger.info('🔸 Teste 4: Deletar Schedule');
    const deleteResponse = await client.delete(`/shelter-schedules/${createdSchedule.id}`);
    if (deleteResponse && (deleteResponse.status === 200 || deleteResponse.status === 204)) {
      Logger.success('Schedule deletado com sucesso');
    }
  }
}

// ==================== TESTES DE LISTAGEM ====================

async function testShelterScheduleListings() {
  Logger.section('📋 Testando Listagens de Shelter Schedule...');

  // 1. Listagem simples
  Logger.info('🔸 Teste 1: Listagem simples');
  const simpleResponse = await client.get('/shelter-schedules');
  if (simpleResponse && simpleResponse.status === 200) {
    Logger.success(`Status: ${simpleResponse.status}`);
    Logger.info(`📊 Total: ${simpleResponse.data?.length || 0}`);
  }

  // 2. Filtro por team
  if (testData.teams.length > 0) {
    Logger.info('🔸 Teste 2: Filtro por team');
    const teamId = testData.teams[0].id;
    const teamResponse = await client.get(`/shelter-schedules?teamId=${teamId}`);
    if (teamResponse && teamResponse.status === 200) {
      Logger.success(`Status: ${teamResponse.status}`);
      Logger.info(`📊 Schedules do time: ${teamResponse.data?.length || 0}`);
    }
  }
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runShelterScheduleAutomation() {
  Logger.header('🎯 AUTOMAÇÃO COMPLETA - MÓDULO SHELTER SCHEDULE');

  // Inicializar cliente
  client = new ApiClient(BASE_URL);

  // Login
  const loginSuccess = await client.login();
  if (!loginSuccess) {
    throw new Error('Falha no login do admin.');
  }

  // Obter dados
  const dataSuccess = await getTestData();
  if (!dataSuccess) {
    throw new Error('Falha ao obter dados. Encerrando automação.');
  }

  if (testData.teams.length === 0) {
    throw new Error('Nenhum time encontrado para criar schedules.');
  }

  // Criar schedules para TODOS os times
  const creationSummary = await createSchedulesForAllTeams(12); // 12 visitas por time (mensal)

  if (creationSummary.errorCount > 0) {
    throw new Error(`Ocorreram erros ao criar schedules (${creationSummary.errorCount}).`);
  }

  if (creationSummary.successCount === 0 && creationSummary.skippedCount === 0) {
    throw new Error('Nenhum schedule foi criado ou encontrado.');
  }

  // Executar testes
  await testShelterScheduleCRUD();
  await testShelterScheduleListings();

  Logger.header('🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO!');
  Logger.success('Sistema pronto!');
}

// Executar automação
runShelterScheduleAutomation()
  .then(() => {
    Logger.success('Automação de Shelter Schedules finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    Logger.error(`Erro durante a automação: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
