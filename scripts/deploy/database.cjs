'use strict';
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { MigrationExecutor } = require('typeorm');
const { schemaFingerprint } = require('./schema-utils.cjs');
const source = require('../../dist/database/data-source').default;
const baseline = 'ReleaseBaseline1795459200000';
const policies = 'ReleaseDataPolicies1795459201000';

async function assertCurrentSchema(db) {
  const diff = await db.driver.createSchemaBuilder().log();
  if (diff.upQueries.length) throw new Error(`Schema diverge das entidades (${diff.upQueries.length} operações). Gere e ensaie a transição em banco isolado.`);
}
// Prod tables are utf8mb4_0900_ai_ci while the database default may differ
// (utf8mb4_unicode_ci); new tables would then fail to reference existing keys
// (ER_FK_INCOMPATIBLE_COLUMNS). Align the default to what the tables use.
async function alignCollation(db) {
  const rows = await db.query("SELECT DISTINCT TABLE_COLLATION AS c FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME <> 'typeorm_migrations'");
  if (rows.length === 0) return;
  if (rows.length !== 1) throw new Error(`Tabelas com collations mistas (${rows.map((r) => r.c).join(', ')}); resolva antes do deploy.`);
  const target = rows[0].c;
  if (!/^[a-z0-9_]+$/.test(target)) throw new Error('Collation inesperada.');
  const current = await db.query('SELECT @@collation_database AS c');
  if (current[0].c !== target) {
    const [{ name }] = await db.query('SELECT DATABASE() AS name');
    await db.query(`ALTER DATABASE \`${String(name).replace(/`/g, '``')}\` COLLATE ${target}`);
    console.log(`Collation padrão do banco alinhada: ${current[0].c} -> ${target}`);
  }
}
async function recordBaseline(db) {
  const migrations = db.migrations;
  try {
    db.migrations = migrations.filter((m) => m.name === baseline);
    if (db.migrations.length !== 1) throw new Error('Baseline indisponível.');
    const executor = new MigrationExecutor(db);
    executor.fake = true;
    await executor.executePendingMigrations();
  } finally { db.migrations = migrations; }
}
async function history(db) {
  const runner = db.createQueryRunner();
  try {
    if (!(await runner.hasTable('typeorm_migrations'))) return [];
    return await runner.query('SELECT name FROM typeorm_migrations ORDER BY id');
  } finally { await runner.release(); }
}
async function main(requestedMode) {
  let mode = requestedMode;
  if (!['status', 'check', 'run', 'auto', 'adopt-legacy', 'adopt-current'].includes(mode)) {
    throw new Error('Use status, check, run, auto, adopt-legacy ou adopt-current.');
  }
  await source.initialize();
  const lock = source.createQueryRunner();
  try {
    const rows = await lock.query("SELECT GET_LOCK('orfanato-nib-schema-deploy', 0) AS acquired");
    if (Number(rows[0].acquired) !== 1) throw new Error('Outra operação de migration está em andamento.');
    const applied = await history(source);
    const adopted = applied.some((m) => m.name === baseline);
    if (mode === 'auto') {
      // Único modo usado pelo deploy: decide sozinho e nunca adivinha.
      const [{ n }] = await source.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME <> 'typeorm_migrations'");
      if (adopted || Number(n) === 0) mode = 'run';
      else if (applied.length === 0) mode = 'adopt-legacy';
      else throw new Error('Histórico de migrations sem a baseline: estado desconhecido; deploy cancelado.');
      console.log(`Modo automático: ${mode}`);
    }
    if (mode === 'status') {
      console.log(JSON.stringify({ adopted, applied: applied.map((m) => m.name), pending: source.migrations.filter((m) => !applied.some((a) => a.name === m.name)).map((m) => m.name) }));
      return;
    }
    if (mode === 'adopt-legacy' && !adopted) {
      if (applied.length) throw new Error('Banco já possui histórico: use adopt-current após conferir o schema; não reaplique a transição legada.');
      const expected = JSON.parse(readFileSync(join(__dirname, '../../database/adoption/legacy-schema.json'), 'utf8'));
      if (await schemaFingerprint(source) !== expected.fingerprint) {
        throw new Error('Schema legado diferente do revisado; adoção cancelada sem alterar tabelas.');
      }
      await alignCollation(source);
      const adoption = require('../../dist/database/adoption/data-source').default;
      await adoption.initialize();
      try { await adoption.runMigrations({ transaction: 'each' }); }
      finally { await adoption.destroy(); }
      // Only the legacy upgrade introduces reviewStatus. Existing moderated
      // installations must never have their pending/rejected decisions reset.
      await source.query("UPDATE image_sections SET reviewStatus = 'approved' WHERE pageId IS NOT NULL");
      await assertCurrentSchema(source);
      await recordBaseline(source);
    } else if (mode === 'adopt-current' && !adopted) {
      await alignCollation(source);
      await assertCurrentSchema(source);
      await recordBaseline(source);
    } else if (!adopted) {
      const tables = await source.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME <> 'typeorm_migrations'");
      if (Number(tables[0].n) > 0 || mode === 'check') {
        throw new Error('Baseline ainda não adotada. Ensaie adopt-legacy ou adopt-current antes do deploy.');
      }
    }
    if (mode !== 'check') await source.runMigrations({ transaction: 'each' });
    await assertCurrentSchema(source);
    const finalHistory = await history(source);
    if (!finalHistory.some((m) => m.name === baseline) || !finalHistory.some((m) => m.name === policies)) {
      throw new Error('Baseline ou políticas de dados pendentes.');
    }
    console.log('Schema e histórico validados.');
  } finally {
    await lock.query("SELECT RELEASE_LOCK('orfanato-nib-schema-deploy')").catch(() => undefined);
    await lock.release();
    await source.destroy();
  }
}
if (require.main === module) main(process.argv[2] || 'status').catch((error) => {
  // Do not serialize QueryFailedError: it may contain query parameters.
  console.error(error.code ? `Falha de migration (${error.code}); restaure o backup antes de retomar.` : error.message);
  process.exitCode = 1;
});
module.exports = { assertCurrentSchema, main };
