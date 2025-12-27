#!/usr/bin/env node

/**
 * Orquestrador de automação seguindo a ordem:
 *   1) Criação
 *   2) Listagem (percorrendo TODAS as páginas quando paginado)
 *   3) Fixes encontrados na listagem
 *
 * Foco inicial: users, shelters, sheltered (os módulos que mais quebravam por inconsistência/paginação).
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

async function jsonRequest(method, url, data) {
  const cfg = {
    method,
    url: `${BASE_URL}${url}`,
    headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
    timeout: 30000,
  };
  const m = String(method || '').toUpperCase();
  // Evitar enviar body em GET/HEAD (o backend quebra tentando parsear "null")
  if (data !== undefined && data !== null && m !== 'GET' && m !== 'HEAD') {
    cfg.data = data;
  }
  return axios(cfg);
}

async function multipartRequest(method, url, form) {
  return axios({
    method,
    url: `${BASE_URL}${url}`,
    headers: { Authorization: `Bearer ${authToken}`, ...form.getHeaders() },
    data: form,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 30000,
  });
}

async function isValidImageUrl(url) {
  try {
    const res = await axios.get(url, {
      responseType: 'stream',
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const ct = String(res.headers['content-type'] || '');
    res.data?.destroy?.();
    return ct.startsWith('image/');
  } catch {
    return false;
  }
}

const SHELTER_IMAGE_CANDIDATES = [
  'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800',
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800',
  'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800',
  'https://images.unsplash.com/photo-1544776193-352d25ca82cd?w=800',
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
  'https://picsum.photos/id/1011/800/600.jpg',
  'https://picsum.photos/id/1015/800/600.jpg',
  'https://picsum.photos/id/1025/800/600.jpg',
  'https://picsum.photos/id/1035/800/600.jpg',
];

let cachedShelterImageUrl = null;
async function pickShelterImageUrl() {
  if (cachedShelterImageUrl) return cachedShelterImageUrl;
  for (const url of SHELTER_IMAGE_CANDIDATES) {
    // eslint-disable-next-line no-await-in-loop
    if (await isValidImageUrl(url)) {
      cachedShelterImageUrl = url;
      return url;
    }
  }
  cachedShelterImageUrl = 'https://picsum.photos/id/1011/800/600.jpg';
  return cachedShelterImageUrl;
}

// ---------------- Pagination helpers (supports repo's inconsistent shapes) ----------------

async function listAllUsers() {
  const limit = 100;
  let page = 1;
  const all = [];
  while (true) {
    let res;
    try {
      // eslint-disable-next-line no-await-in-loop
      res = await jsonRequest('GET', `/users?page=${page}&limit=${limit}`, null);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      log(`❌ [Users] Falha ao listar page=${page}&limit=${limit} (status=${status}): ${JSON.stringify(data)}`, colors.red);
      break;
    }
    const items = res.data?.items || [];
    const meta = res.data?.meta;
    all.push(...items);
    if (!meta || !meta.totalPages || page >= meta.totalPages) break;
    page++;
  }
  return all;
}

async function listAllShelters() {
  const limit = 50;
  let page = 1;
  const all = [];
  while (true) {
    let res;
    try {
      // eslint-disable-next-line no-await-in-loop
      res = await jsonRequest('GET', `/shelters?page=${page}&limit=${limit}`, null);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      log(`❌ [Shelters] Falha ao listar page=${page}&limit=${limit} (status=${status}): ${JSON.stringify(data)}`, colors.red);
      break;
    }
    const items = res.data?.items || [];
    all.push(...items);
    const pageCount = res.data?.pageCount;
    if (!pageCount || page >= pageCount) break;
    page++;
  }
  return all;
}

async function listAllSheltered() {
  const limit = 100;
  let page = 1;
  const all = [];
  while (true) {
    let res;
    try {
      // eslint-disable-next-line no-await-in-loop
      res = await jsonRequest('GET', `/sheltered?page=${page}&limit=${limit}`, null);
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      log(`❌ [Sheltered] Falha ao listar page=${page}&limit=${limit} (status=${status}): ${JSON.stringify(data)}`, colors.red);
      break;
    }
    const items = res.data?.data || [];
    const meta = res.data?.meta;
    all.push(...items);
    if (!meta || !meta.totalPages || page >= meta.totalPages) break;
    page++;
  }
  return all;
}

// ---------------- Entity: Users ----------------

function genUser(i) {
  const ts = Date.now();
  const role = i % 2 === 0 ? 'teacher' : 'leader';
  return {
    name: `Auto User ${role} ${i}`,
    email: `auto_${role}_${i}_${ts}@teste.com`,
    password: 'Abc@123',
    phone: `(11) 90000-${String(i).padStart(4, '0')}`,
    role,
    active: true,
    completed: false,
    commonUser: true,
  };
}

async function createUsers(count = 20) {
  log(`👥 [Users] Criando ${count}...`, colors.blue);
  let ok = 0;
  for (let i = 1; i <= count; i++) {
    // eslint-disable-next-line no-await-in-loop
    const res = await jsonRequest('POST', '/users', genUser(i));
    if (res.status === 201) ok++;
    if (i % 10 === 0) log(`👥 [Users] ${i}/${count} enviados`, colors.blue);
  }
  log(`✅ [Users] Criados: ${ok}/${count}`, colors.green);
}

async function fixUsersInactiveTeachersLeaders(users) {
  const targets = users.filter(u => (u.role === 'teacher' || u.role === 'leader') && u.active === false);
  if (!targets.length) return 0;
  log(`🔧 [Users] Ativando ${targets.length} (teacher/leader)`, colors.yellow);
  let fixed = 0;
  for (const u of targets) {
    // eslint-disable-next-line no-await-in-loop
    const res = await jsonRequest('PUT', `/users/${u.id}`, { active: true });
    if (res.status === 200) fixed++;
  }
  return fixed;
}

// ---------------- Entity: Shelters ----------------

function buildShelterFormData(dto) {
  const form = new FormData();
  form.append('shelterData', JSON.stringify(dto));
  return form;
}

function genShelter(i, imageUrl) {
  const ts = Date.now();
  return {
    name: `Abrigo Automação ${i} ${ts}`,
    description: `Abrigo criado pela automação (imagem real validada).`,
    teamsQuantity: 1,
    address: {
      street: `Rua ${i}`,
      number: String(100 + i),
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01000-000',
      complement: null,
    },
    mediaItem: {
      title: 'Foto do Abrigo',
      description: 'Imagem principal do abrigo',
      uploadType: 'link',
      url: imageUrl,
    },
  };
}

async function createShelters(count = 10) {
  const imageUrl = await pickShelterImageUrl();
  log(`🏠 [Shelters] Criando ${count} (imagem: ${imageUrl})`, colors.blue);
  let ok = 0;
  for (let i = 1; i <= count; i++) {
    const form = buildShelterFormData(genShelter(i, imageUrl));
    // eslint-disable-next-line no-await-in-loop
    const res = await multipartRequest('POST', '/shelters', form);
    if (res.status === 201) ok++;
  }
  log(`✅ [Shelters] Criados: ${ok}/${count}`, colors.green);
}

async function fixSheltersMissingMedia(shelters) {
  const missing = shelters.filter(s => !s.mediaItem || !s.mediaItem.url);
  if (!missing.length) return 0;
  const imageUrl = await pickShelterImageUrl();
  log(`🔧 [Shelters] Corrigindo mediaItem em ${missing.length} shelters`, colors.yellow);
  let fixed = 0;
  for (const s of missing) {
    const form = new FormData();
    form.append('mediaData', JSON.stringify({ title: 'Foto do Abrigo', uploadType: 'link', url: imageUrl }));
    // eslint-disable-next-line no-await-in-loop
    const res = await multipartRequest('PATCH', `/shelters/${s.id}/media`, form);
    if (res.status === 200) fixed++;
  }
  return fixed;
}

// ---------------- Entity: Sheltered ----------------

function genSheltered(i, shelterId) {
  const gender = i % 2 === 0 ? 'M' : 'F';
  const year = 2010 + (i % 8);
  const month = String(1 + (i % 12)).padStart(2, '0');
  const day = String(1 + (i % 28)).padStart(2, '0');
  return {
    name: `Abrigado Automação ${i}`,
    birthDate: `${year}-${month}-${day}T00:00:00.000Z`,
    gender,
    shelterId,
    joinedAt: new Date().toISOString(),
    address: {
      street: `Rua Abrigado ${i}`,
      number: String(10 + i),
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01000-000',
      complement: null,
    },
  };
}

async function createSheltered(count = 50, shelters) {
  if (!shelters.length) {
    log('⚠️ [Sheltered] Sem shelters para vincular. Pulei criação.', colors.yellow);
    return;
  }
  log(`👶 [Sheltered] Criando ${count} vinculados a shelters`, colors.blue);
  let ok = 0;
  for (let i = 1; i <= count; i++) {
    const shelter = shelters[i % shelters.length];
    // eslint-disable-next-line no-await-in-loop
    const res = await jsonRequest('POST', '/sheltered', genSheltered(i, shelter.id));
    if (res.status === 201) ok++;
    if (i % 25 === 0) log(`👶 [Sheltered] ${i}/${count} enviados`, colors.blue);
  }
  log(`✅ [Sheltered] Criados: ${ok}/${count}`, colors.green);
}

async function fixShelteredWithoutShelter(sheltered, shelters) {
  const missing = sheltered.filter(s => !s.shelterId && !s.shelter);
  if (!missing.length) return 0;
  if (!shelters.length) return 0;
  log(`🔧 [Sheltered] Atribuindo shelter em ${missing.length} abrigados`, colors.yellow);
  let fixed = 0;
  for (let i = 0; i < missing.length; i++) {
    const child = missing[i];
    const shelter = shelters[i % shelters.length];
    // eslint-disable-next-line no-await-in-loop
    const res = await jsonRequest('PUT', `/sheltered/${child.id}`, { shelterId: shelter.id });
    if (res.status === 200) fixed++;
  }
  return fixed;
}

// ---------------- Main ----------------

async function main() {
  log('🚀 Orquestrador create -> list (all pages) -> fix', colors.bright);

  // Health
  await axios.get(`${BASE_URL}/`);

  await login();

  // USERS
  log('================ USERS ================', colors.bright);
  await createUsers(20);
  const users = await listAllUsers();
  log(`📋 [Users] Listagem completa: ${users.length}`, colors.green);
  const usersFixed = await fixUsersInactiveTeachersLeaders(users);
  if (usersFixed) log(`✅ [Users] Fix applied: ${usersFixed} ativados`, colors.green);

  // SHELTERS
  log('================ SHELTERS ================', colors.bright);
  await createShelters(10);
  const shelters = await listAllShelters();
  log(`📋 [Shelters] Listagem completa: ${shelters.length}`, colors.green);
  const sheltersFixed = await fixSheltersMissingMedia(shelters);
  if (sheltersFixed) log(`✅ [Shelters] Fix applied: ${sheltersFixed} mediaItem corrigidos`, colors.green);

  // SHELTERED
  log('================ SHELTERED ================', colors.bright);
  await createSheltered(50, shelters);
  const sheltered = await listAllSheltered();
  log(`📋 [Sheltered] Listagem completa: ${sheltered.length}`, colors.green);
  const shelteredFixed = await fixShelteredWithoutShelter(sheltered, shelters);
  if (shelteredFixed) log(`✅ [Sheltered] Fix applied: ${shelteredFixed} shelterId atribuídos`, colors.green);

  log('✅ Orquestração concluída.', colors.green);
  log('📄 Próximo passo: integrar demais entidades (pages/media) com o mesmo padrão.', colors.blue);
}

main().catch((e) => {
  log(`❌ Erro fatal: ${e.message}`, colors.red);
  process.exit(1);
});


