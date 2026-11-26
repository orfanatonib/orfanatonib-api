'use strict';
const { createHash } = require('node:crypto');
const normalize = (sql) => sql.replace(/ AUTO_INCREMENT=\d+/g, '').replace(/\s+/g, ' ').trim().replace(/;$/, '');
async function schemaFingerprint(connection) {
  const rows = await connection.query("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME <> 'typeorm_migrations' ORDER BY TABLE_NAME");
  const definitions = [];
  for (const row of rows) {
    const name = row.TABLE_NAME.replace(/`/g, '``');
    const result = await connection.query(`SHOW CREATE TABLE \`${name}\``);
    definitions.push(normalize(result[0]['Create Table']));
  }
  return createHash('sha256').update(JSON.stringify(definitions)).digest('hex');
}
module.exports = { normalize, schemaFingerprint };
