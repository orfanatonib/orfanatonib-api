#!/usr/bin/env node

/**
 * Fix: vincular leaders e teachers aos abrigos.
 *
 * Estratégia:
 * - Listar TODOS os shelters via GET /shelters?page&limit (paginado)
 * - Buscar leader-profiles/simple e teacher-profiles/simple
 * - Para cada shelter, garantir teamsQuantity >= 1 e preencher teams[1..teamsQuantity]
 *   com leaderProfileIds e teacherProfileIds (IDs vindos do /simple)
 * - Atualizar via PUT /shelters/:id enviando multipart/form-data com shelterData
 *
 * Obs: o endpoint de shelters exige multipart com campo shelterData (mesmo sem arquivo).
 */

const axios = require('axios');
const config = require('../shared/config');
const FormData = require('form-data');

const BASE_URL = config.BASE_URL;
const ADMIN_CREDENTIALS = config.ADMIN_CREDENTIALS;

let authToken = '';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = colors.reset) {
  const ts = new Date().toLocaleTimeString('pt-BR');
  console.log(`${color}[${ts}] ${msg}${colors.reset}`);
}

async function login() {
  const res = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
  authToken = res.data.accessToken;
}

async function get(url) {
  return axios.get(`${BASE_URL}${url}`, {
    headers: { Authorization: `Bearer ${authToken}` },
    timeout: 30000,
  });
}

async function postJson(url, body) {
  return axios.post(`${BASE_URL}${url}`, body, {
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
}

async function putMultipart(url, shelterData) {
  const form = new FormData();
  form.append('shelterData', JSON.stringify(shelterData));
  return axios.put(`${BASE_URL}${url}`, form, {
    headers: { Authorization: `Bearer ${authToken}`, ...form.getHeaders() },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 30000,
  });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function pickSomeIds(ids, n) {
  if (!ids.length) return [];
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, ids.length));
}

async function listAllShelters(limit = 50) {
  const all = [];
  let page = 1;
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const res = await get(`/shelters?page=${page}&limit=${limit}`);
    const items = res.data?.items || [];
    all.push(...items);
    const pageCount = res.data?.pageCount;
    if (!pageCount || page >= pageCount) break;
    page++;
  }
  return all;
}

function genExtraTeacherUser(i) {
  const ts = Date.now();
  return {
    name: `Auto Teacher Extra ${i}`,
    email: `auto_teacher_extra_${i}_${ts}@teste.com`,
    password: 'Abc@123',
    phone: `(11) 95555-${String(i).padStart(4, '0')}`,
    role: 'teacher',
    active: true,
    completed: false,
    commonUser: true,
  };
}

async function main() {
  log('🔧 Fix vínculos: leaders/teachers -> shelters', colors.bright);

  // Health
  await axios.get(`${BASE_URL}/`);

  await login();

  const shelters = await listAllShelters(50);
  log(`🏠 Shelters encontrados (todas páginas): ${shelters.length}`, colors.blue);

  if (!shelters.length) {
    log('⚠️ Nenhum shelter para vincular.', colors.yellow);
    return;
  }

  // Carregar profiles depois de saber quantos shelters existem
  let leadersRes = await get('/leader-profiles/simple');
  let teachersRes = await get('/teacher-profiles/simple');

  let leaderIds = (leadersRes.data || []).map(x => x.leaderProfileId || x.id).filter(Boolean);
  let teacherIds = (teachersRes.data || []).map(x => x.teacherProfileId || x.id).filter(Boolean);

  log(`👨‍💼 Leader profiles: ${leaderIds.length}`, leaderIds.length ? colors.green : colors.yellow);
  log(`👩‍🏫 Teacher profiles: ${teacherIds.length}`, teacherIds.length ? colors.green : colors.yellow);

  // Garantir teachers suficientes (teacher profile é 1:1 com team)
  if (teacherIds.length < shelters.length) {
    const deficit = shelters.length - teacherIds.length;
    log(`⚠️ Teachers insuficientes para 1 por shelter. Criando ${deficit} users teacher extras...`, colors.yellow);
    for (let i = 1; i <= deficit; i++) {
      // eslint-disable-next-line no-await-in-loop
      await postJson('/users', genExtraTeacherUser(i));
    }
    // Recarregar teacher profiles
    teachersRes = await get('/teacher-profiles/simple');
    teacherIds = (teachersRes.data || []).map(x => x.teacherProfileId || x.id).filter(Boolean);
    log(`👩‍🏫 Teacher profiles (após criação): ${teacherIds.length}`, colors.green);
  }

  if (!leaderIds.length || !teacherIds.length) {
    log('❌ Sem leader/teacher profiles suficientes para vincular. Abortando.', colors.red);
    process.exit(1);
  }

  let updated = 0;
  let failed = 0;

  // IMPORTANTE: teacher profile só pode estar em UMA team (teacher_profiles.team_id),
  // então precisamos DISTRIBUIR sem reusar, senão os primeiros shelters ficam sem teacher.
  const teacherPool = [...teacherIds];

  // Processar em batches para evitar sobrecarga
  const batches = chunk(shelters, 10);
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(batch.map(async (s) => {
      try {
        // Fix padronizado: 1 team por shelter (simplifica e garante teacher único)
        const teamsQuantity = 1;

        const teams = [];
        for (let t = 1; t <= teamsQuantity; t++) {
          const teacherId = teacherPool.length ? teacherPool.shift() : teacherIds[(updated + failed) % teacherIds.length];
          teams.push({
            numberTeam: t,
            description: `Equipe ${t}`,
            leaderProfileIds: pickSomeIds(leaderIds, 2),
            teacherProfileIds: teacherId ? [teacherId] : [],
          });
        }

        const payload = {
          name: s.name,
          description: s.description,
          teamsQuantity,
          address: s.address,
          teams,
        };

        await putMultipart(`/shelters/${s.id}`, payload);
        updated++;
      } catch (e) {
        failed++;
      }
    }));

    log(`📦 Batch ${bi + 1}/${batches.length} concluído (updated=${updated}, failed=${failed})`, colors.blue);
  }

  log(`✅ Final: shelters atualizados=${updated}, falhas=${failed}`, failed ? colors.yellow : colors.green);

  // Verificação simples: pegar 1 shelter e mostrar quantidade de teams
  const check = await get(`/shelters?page=1&limit=1`);
  const one = check.data?.items?.[0];
  if (one) {
    const oneFull = await get(`/shelters/${one.id}`);
    const teams = oneFull.data?.teams || [];
    log(`🔍 Verificação: shelter=\"${oneFull.data?.name}\" teams=${teams.length}`, colors.green);
  }
}

main().catch((e) => {
  log(`❌ Erro fatal: ${e.message}`, colors.red);
  process.exit(1);
});


