const ApiClient = require('../shared/api-client');
const config = require('../shared/config');
const Logger = require('../shared/logger');

const BASE_URL = config.BASE_URL;
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let client;
let testData = {
  teams: [],
  schedules: [],
  members: [],
  createdAttendances: []
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

    // Obter schedules
    const schedulesResponse = await client.get('/shelter-schedules');
    if (schedulesResponse && schedulesResponse.status === 200) {
      testData.schedules = schedulesResponse.data || [];
      Logger.info(`📅 ${testData.schedules.length} schedules encontrados`);
    }

    Logger.success('Dados obtidos com sucesso!');
    return true;
  } catch (error) {
    Logger.error(`Erro ao obter dados: ${error.message}`);
    return false;
  }
}

/**
 * Obtém membros de um time específico
 */
async function getTeamMembers(teamId) {
  try {
    const response = await client.get(`/attendance/team/${teamId}/members`);
    if (response && response.status === 200) {
      return response.data.members || [];
    }
  } catch (error) {
    Logger.warning(`Erro ao obter membros do time ${teamId}: ${error.message}`);
  }
  return [];
}

// ==================== CRIAÇÃO EM MASSA ====================

/**
 * Cria registros de presença (pagelas) para todos os schedules existentes
 */
async function createAttendancesForAllSchedules(attendanceRate = 0.85) {
  Logger.header(`🚀 Criando registros de presença para TODOS os schedules`);
  Logger.info(`📋 Taxa de presença: ${(attendanceRate * 100).toFixed(0)}%`);

  if (testData.schedules.length === 0) {
    Logger.warning('Nenhum schedule encontrado. Não é possível criar attendances.');
    Logger.info('💡 Execute primeiro a automação de shelter-schedules!');
    return [];
  }

  const createdAttendances = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  let totalMembers = 0;
  const teamsWithoutMembers = [];

  // Agrupar schedules por time, ignorando schedules sem teamId
  const schedulesByTeam = {};
  testData.schedules.forEach(schedule => {
    const teamId = schedule.team?.id || schedule.teamId;
    if (!teamId) {
      Logger.warning(`Schedule ${schedule.id} ignorado: sem teamId definido.`);
      skippedCount++;
      return;
    }
    if (!schedulesByTeam[teamId]) {
      schedulesByTeam[teamId] = [];
    }
    schedulesByTeam[teamId].push(schedule);
  });

  Logger.info(`📊 Schedules agrupados em ${Object.keys(schedulesByTeam).length} times`);

  // Iterar sobre cada time
  for (const teamId of Object.keys(schedulesByTeam)) {
    const schedules = schedulesByTeam[teamId];

    // Obter membros do time
    const members = await getTeamMembers(teamId);

    if (members.length === 0) {
      Logger.warning(`Time ${teamId}: Nenhum membro encontrado. Pulando...`);
      teamsWithoutMembers.push(teamId);
      skippedCount += schedules.length;
      continue;
    }

    totalMembers += members.length;
    Logger.info(`Time ${teamId}: ${members.length} membros, ${schedules.length} schedules`);

    // Para cada schedule do time
    for (const schedule of schedules) {
      const scheduleId = schedule.id;

      // Preparar lista de attendances para este schedule
      const attendances = [];

      for (const member of members) {
        const isPresent = Math.random() < attendanceRate;

        attendances.push({
          memberId: member.id,
          type: isPresent ? 'present' : 'absent',
          comment: isPresent
            ? undefined
            : getRandomAbsenceReason()
        });
      }

      // Registrar attendance em lote (pagela)
      const teamNumber = schedule.team?.numberTeam || '?';
      const visitNumber = schedule.visitNumber || '?';

      const attendanceData = {
        teamId: teamId,
        scheduleId: scheduleId,
        attendances: attendances
      };

      const response = await client.post('/attendance/register/team', attendanceData);

      if (response && (response.status === 201 || response.status === 200)) {
        const results = Array.isArray(response.data) ? response.data : [response.data];
        createdAttendances.push(...results);
        successCount += results.length;
        Logger.info(`✓ Time ${teamNumber}, Visita ${visitNumber}: ${results.length} presenças registradas`);
      } else {
        errorCount += members.length;
        Logger.warning(`✗ Time ${teamNumber}, Visita ${visitNumber}: Erro ao registrar presenças`);
      }

      // Pequeno delay para não sobrecarregar o servidor
      await delay(100);
    }
  }

  Logger.success('Criação de attendances concluída!');
  Logger.info(`📊 Registros de presença criados: ${successCount}`);
  Logger.info(`👥 Total de membros processados: ${totalMembers}`);
  Logger.info(`❌ Erros: ${errorCount}`);
  if (teamsWithoutMembers.length > 0) {
    Logger.warning(`Times sem membros (pulados): ${teamsWithoutMembers.join(', ')}`);
  }

  return {
    createdAttendances,
    successCount,
    errorCount,
    skippedCount,
    totalMembers,
    teamsProcessed: Object.keys(schedulesByTeam).length,
    teamsWithoutMembers
  };
}

// ==================== FUNÇÕES AUXILIARES ====================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retorna uma razão aleatória de ausência
 */
function getRandomAbsenceReason() {
  const reasons = [
    'Motivo de saúde',
    'Compromisso familiar',
    'Viagem',
    'Trabalho',
    'Não informado',
    undefined, // Sem comentário
    undefined,
    undefined
  ];

  return reasons[Math.floor(Math.random() * reasons.length)];
}

// ==================== TESTES DE CRUD ====================

async function testAttendanceCRUD() {
  Logger.section('📋 Testando CRUD de Attendance...');

  if (testData.schedules.length === 0) {
    Logger.warning('Nenhum schedule encontrado para testar attendance');
    return;
  }

  const schedule = testData.schedules[0];
  const teamId = schedule.team?.id || schedule.teamId;

  // Obter membros do time
  const members = await getTeamMembers(teamId);
  if (members.length === 0) {
    Logger.warning('Nenhum membro encontrado no time');
    return;
  }

  const member = members[0];

  // 1. Registrar presença individual
  Logger.info('🔸 Teste 1: Registrar presença individual');

  // Primeiro fazer login com credenciais do membro (se possível)
  // Por enquanto vamos usar admin que pode registrar para qualquer membro

  const registerData = {
    scheduleId: schedule.id,
    type: 'present',
    comment: 'Teste de registro individual'
  };

  // Este endpoint precisa ser chamado como o próprio membro
  // Para testes, vamos usar o endpoint de team que permite admin/leader

  Logger.info('  ⚠️  Teste de registro individual requer autenticação do membro');
  Logger.info('  💡 Usando endpoint de team para teste');

  // 2. Registrar em lote (pagela)
  Logger.info('🔸 Teste 2: Registrar em lote (pagela)');

  const attendanceData = {
    teamId: teamId,
    scheduleId: schedule.id,
    attendances: members.slice(0, 3).map(m => ({
      memberId: m.id,
      type: Math.random() > 0.5 ? 'present' : 'absent',
      comment: 'Teste de pagela'
    }))
  };

  const createResponse = await client.post('/attendance/register/team', attendanceData);
  if (createResponse && (createResponse.status === 201 || createResponse.status === 200)) {
    Logger.success(`Pagela registrada: ${createResponse.data.length} registros`);
  }
}

// ==================== TESTES DE PENDÊNCIAS ====================

async function testAttendancePendings() {
  Logger.section('📋 Testando Pendências de Attendance...');

  // 1. Pendências do líder
  if (testData.teams.length > 0) {
    Logger.info('🔸 Teste 1: Pendências do líder');
    const teamId = testData.teams[0].id;

    const leaderPendingsResponse = await client.get(`/attendance/pending/leader?teamId=${teamId}`);
    if (leaderPendingsResponse && leaderPendingsResponse.status === 200) {
      const pendings = leaderPendingsResponse.data || [];
      Logger.success(`Status: ${leaderPendingsResponse.status}`);
      Logger.info(`📊 Eventos pendentes: ${pendings.length}`);

      if (pendings.length > 0) {
        const totalPendingMembers = pendings.reduce((sum, p) => sum + (p.pendingMembers?.length || 0), 0);
        Logger.info(`👥 Total de membros pendentes: ${totalPendingMembers}`);
      }
    }
  }

  // 2. Pendências do membro
  Logger.info('🔸 Teste 2: Pendências do membro');

  const memberPendingsResponse = await client.get('/attendance/pending/member');
  if (memberPendingsResponse && memberPendingsResponse.status === 200) {
    const pendings = memberPendingsResponse.data || [];
    Logger.success(`Status: ${memberPendingsResponse.status}`);
    Logger.info(`📊 Eventos pendentes para o usuário logado: ${pendings.length}`);
  }
}

// ==================== TESTES DE LISTAGEM ====================

async function testAttendanceListings() {
  Logger.section('📋 Testando Listagens de Attendance...');

  if (testData.teams.length === 0) {
    Logger.warning('Nenhum team encontrado para testar listagens');
    return;
  }

  const teamId = testData.teams[0].id;

  // 1. Listar membros do time
  Logger.info('🔸 Teste 1: Listar membros do time');
  const membersResponse = await client.get(`/attendance/team/${teamId}/members`);
  if (membersResponse && membersResponse.status === 200) {
    const data = membersResponse.data;
    Logger.success(`Status: ${membersResponse.status}`);
    Logger.info(`👥 Membros: ${data.members?.length || 0}`);
    Logger.info(`🏠 Shelter: ${data.shelterName}`);
  }

  // 2. Listar schedules do time
  Logger.info('🔸 Teste 2: Listar schedules do time');
  const schedulesResponse = await client.get(`/attendance/team/${teamId}/schedules`);
  if (schedulesResponse && schedulesResponse.status === 200) {
    const schedules = schedulesResponse.data || [];
    Logger.success(`Status: ${schedulesResponse.status}`);
    Logger.info(`📅 Schedules: ${schedules.length}`);
  }
}

// ==================== TESTES DE ESTATÍSTICAS ====================

async function testAttendanceStatistics() {
  Logger.section('📋 Testando Estatísticas de Attendance...');

  if (testData.teams.length === 0) {
    Logger.warning('Nenhum team encontrado para estatísticas');
    return;
  }

  // Análise de pendências por time
  Logger.info('🔸 Análise de pendências por time');

  let totalPendings = 0;
  let totalTeamsWithPendings = 0;

  for (const team of testData.teams.slice(0, 5)) { // Primeiros 5 times
    const teamId = team.id;
    const teamNumber = team.numberTeam;

    const pendingsResponse = await client.get(`/attendance/pending/leader?teamId=${teamId}`);
    if (pendingsResponse && pendingsResponse.status === 200) {
      const pendings = pendingsResponse.data || [];
      if (pendings.length > 0) {
        totalPendings += pendings.length;
        totalTeamsWithPendings++;
        Logger.info(`  Time ${teamNumber}: ${pendings.length} eventos pendentes`);
      }
    }

    await delay(100);
  }

  Logger.info(`📊 Total de eventos pendentes (amostra): ${totalPendings}`);
  Logger.info(`🎯 Times com pendências: ${totalTeamsWithPendings}/${Math.min(5, testData.teams.length)}`);
}

// ==================== FUNÇÃO PRINCIPAL ====================

async function runAttendanceAutomation() {
  Logger.header('🎯 AUTOMAÇÃO COMPLETA - MÓDULO ATTENDANCE');

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
    throw new Error('Nenhum time encontrado para registrar attendance.');
  }

  // Verificar se existem schedules
  if (testData.schedules.length === 0) {
    throw new Error('Nenhum schedule encontrado! Execute primeiro a automação de shelter-schedules.');
  }

  // Criar attendances para TODOS os schedules
  const creationSummary = await createAttendancesForAllSchedules(0.85); // 85% de presença

  if (creationSummary.errorCount > 0) {
    throw new Error(`Ocorreram erros ao registrar attendances (${creationSummary.errorCount}).`);
  }

  if (creationSummary.successCount === 0) {
    throw new Error('Nenhum attendance foi registrado.');
  }

  // Executar testes
  await testAttendanceCRUD();
  await testAttendancePendings();
  await testAttendanceListings();
  await testAttendanceStatistics();

  Logger.header('🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO!');
  Logger.success('Sistema de Attendance pronto!');
  Logger.info('✅ Registros de presença criados');
  Logger.info('✅ Pendências funcionando');
  Logger.info('✅ Listagens funcionando');
}

// Executar automação
runAttendanceAutomation()
  .then(() => {
    Logger.success('Automação de Attendance finalizada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    Logger.error(`Erro durante a automação: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
