/* eslint-disable */
'use strict';

/**
 * Cria, de forma idempotente, as credenciais e feature flags que o ambiente
 * local precisa para ser exercitável ponta a ponta (automações e Playwright).
 *
 * É chamado por `./run.sh local` depois que a API responde, e pode ser rodado
 * à mão com `npm run seed:local`.
 *
 * Só age quando ENVIRONMENT/NODE_ENV indicam ambiente local: nunca semeia
 * usuário em dev ou prod.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
const ENV_FILE = process.env.ENV_FILE || 'env/local.env';
const READY_ATTEMPTS = Number(process.env.SEED_READY_ATTEMPTS || 60);

/** Contas fixas do ambiente local. Documentadas em docs/guides/LOCAL_CREDENTIALS.md. */
const ACCOUNTS = [
  {
    label: 'admin',
    name: 'E2E Admin',
    email: 'e2e.admin@orfanatonib.test',
    password: 'E2e@12345',
    phone: '92999990001',
    role: 'admin',
  },
  {
    label: 'leader',
    name: 'E2E Líder',
    email: 'e2e.leader@orfanatonib.test',
    password: 'E2e@12345',
    phone: '92999990002',
    role: 'leader',
  },
  {
    label: 'member',
    name: 'E2E Membro',
    email: 'e2e.member@orfanatonib.test',
    password: 'E2e@12345',
    phone: '92999990003',
    role: 'member',
  },
];

/** Flags que precisam estar ligadas para as rotas protegidas por flag abrirem. */
const FEATURE_FLAGS = [
  { key: 'shelter-management', name: 'Gestão de abrigos', description: 'Libera a gestão de abrigos e equipes (criar, editar, vincular líderes e membros). Desligada, as telas e consultas de abrigos e equipes ficam bloqueadas.' },
  { key: 'shelter-address', name: 'Endereço do abrigo', description: 'Mostra o endereço dos abrigos (cartões, detalhes e formulário). Desligada, o endereço fica oculto.' },
  { key: 'shelter-pagelas', name: 'Pagelas', description: 'Libera as pagelas: registro semanal de cada acolhido por abrigo. Desligada, a tela de Pagelas e a API correspondente ficam bloqueadas.' },
  {
    key: 'ministry_fair_integration',
    name: 'Integração Feira de Ministério',
    description:
      'Integração Feira de Ministério: atalho na Área do Membro e a página de registro das integrações (admin e líder).',
  },
];

/**
 * Flags que precisam ficar DESLIGADAS no ambiente local.
 *
 * O envio de e-mail vem ligado por padrão (flag ausente = ligada), e o
 * `env/local.env` costuma ter credencial real do Gmail: sem isto, rodar os
 * testes dispararia e-mail de verdade para endereços de teste.
 * Para conferir um envio localmente, desligue esta linha ou ligue a flag
 * `email-delivery` pelo endpoint de feature flags.
 */
const DISABLED_FEATURE_FLAGS = [
  {
    key: 'email-delivery',
    name: 'Envio de e-mail',
    description: 'Chave-mestra do envio de e-mail. Desligada no local para não enviar de verdade.',
  },
];

const log = (message) => console.log(`[seed] ${message}`);
const warn = (message) => console.warn(`[seed] ${message}`);

function readEnvFile() {
  const fullPath = path.resolve(__dirname, '..', ENV_FILE);
  if (!fs.existsSync(fullPath)) return {};

  return fs
    .readFileSync(fullPath, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match) acc[match[1]] = match[2].replace(/^["']|["']$/g, '');
      return acc;
    }, {});
}

function isLocalEnvironment(env) {
  const environment = (process.env.ENVIRONMENT || env.ENVIRONMENT || 'local').toLowerCase();
  return environment === 'local' || environment === 'test';
}

async function waitForApi() {
  for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) return true;
    } catch {
      // A API ainda está subindo.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

/**
 * A API nunca concede o papel `admin` (cadastro, `POST/PUT /users`,
 * complete-register): o admin local nasce, ou é promovido, direto no banco.
 * O hash é o da API (bcryptjs, 10 rounds). Idempotente: cria se não existe;
 * se existe, promove e ativa sem tocar na senha.
 */
async function ensureAdminInDatabase(connection, account) {
  const [rows] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [account.email]);

  if (rows.length === 0) {
    const hash = await bcrypt.hash(account.password, 10);
    await connection.execute(
      `INSERT INTO users (id, email, password, phone, name, active, completed, commonUser, role, emailVerifiedAt, createdAt, updatedAt)
       VALUES (UUID(), ?, ?, ?, ?, 1, 1, 0, 'admin', NOW(6), NOW(6), NOW(6))`,
      [account.email, hash, account.phone, account.name],
    );
    return 'criado direto no banco';
  }

  await connection.execute(
    "UPDATE users SET role = 'admin', active = 1, completed = 1, emailVerifiedAt = COALESCE(emailVerifiedAt, NOW(6)) WHERE email = ?",
    [account.email],
  );
  return 'já existia (promovido e ativado)';
}

/**
 * Registra pela própria API, para o hash da senha ser o que a aplicação usa.
 * A existência é checada antes: registrar de novo faz a API responder 401
 * "User already exists", que polui o log com um bloco de erro a cada boot.
 */
async function registerAccount(account) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: account.name,
      email: account.email,
      phone: account.phone,
      password: account.password,
      role: account.role,
    }),
  });

  if (response.ok) return 'criada';

  const body = await response.json().catch(() => ({}));
  const message = JSON.stringify(body.message ?? '');
  // Conta já existente é o caso normal a partir da segunda execução.
  if (response.status === 409 || /exist|cadastrad|duplicat/i.test(message)) return 'já existia';

  throw new Error(`registro falhou (${response.status}): ${message}`);
}

async function main() {
  const env = readEnvFile();

  if (!isLocalEnvironment(env)) {
    warn('ambiente não é local — nada semeado.');
    return;
  }

  if (!(await waitForApi())) {
    warn(`API não respondeu em ${API_URL}/health — credenciais não semeadas.`);
    return;
  }

  const connection = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME,
  });

  try {
    for (const account of ACCOUNTS) {
      if (account.role === 'admin') {
        log(`${account.label}: ${account.email} (${await ensureAdminInDatabase(connection, account)})`);
        continue;
      }

      const [rows] = await connection.execute(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [account.email],
      );

      if (rows.length > 0) {
        log(`${account.label}: ${account.email} (já existia)`);
        continue;
      }

      try {
        await registerAccount(account);
        log(`${account.label}: ${account.email} (criada)`);
      } catch (error) {
        warn(`${account.label}: ${error.message}`);
      }
    }

    // O registro nasce inativo e sem perfil completo; o e2e precisa poder logar.
    for (const account of ACCOUNTS.filter((a) => a.role !== 'admin')) {
      await connection.execute(
        'UPDATE users SET role = ?, active = 1, completed = 1 WHERE email = ?',
        [account.role, account.email],
      );
    }
    log(`${ACCOUNTS.length} contas prontas (senha: ${ACCOUNTS[0].password})`);

    for (const flag of FEATURE_FLAGS) {
      await connection.execute(
        `INSERT INTO feature_flags (id, \`key\`, name, description, enabled, created_at, updated_at)
         VALUES (UUID(), ?, ?, ?, 1, NOW(6), NOW(6))
         ON DUPLICATE KEY UPDATE enabled = 1, name = VALUES(name), description = VALUES(description), updated_at = NOW(6)`,
        [flag.key, flag.name, flag.description],
      );
    }
    log(`${FEATURE_FLAGS.length} feature flags ligadas`);

    for (const flag of DISABLED_FEATURE_FLAGS) {
      await connection.execute(
        `INSERT INTO feature_flags (id, \`key\`, name, description, enabled, created_at, updated_at)
         VALUES (UUID(), ?, ?, ?, 0, NOW(6), NOW(6))
         ON DUPLICATE KEY UPDATE enabled = 0, updated_at = NOW(6)`,
        [flag.key, flag.name, flag.description],
      );
    }
    log(`${DISABLED_FEATURE_FLAGS.length} feature flag(s) desligada(s) — e-mail não sai no local`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  warn(`falhou: ${error.message}`);
  process.exitCode = 0; // Semear não pode derrubar o run.sh.
});
