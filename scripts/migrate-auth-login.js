// Applies database/migrations/2026-08-02_auth_login.sql idempotently.
// Usage: node scripts/migrate-auth-login.js
const mysql = require('mysql2/promise');

const COLUMNS = [
  { name: 'username', def: "VARCHAR(255) NULL AFTER `email`" },
  { name: 'password_hash', def: "VARCHAR(255) NULL AFTER `username`" },
  { name: 'auth_type', def: "VARCHAR(20) NOT NULL DEFAULT 'password' AFTER `password_hash`" },
  { name: 'azure_ad_id', def: "VARCHAR(255) NULL AFTER `auth_type`" },
  { name: 'm365_token_json', def: "JSON NULL AFTER `azure_ad_id`" },
  { name: 'm365_mail_enabled', def: "TINYINT(1) NOT NULL DEFAULT 0 AFTER `m365_token_json`" },
];

(async () => {
  const c = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: +(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || 'emacro_dashboard',
    user: process.env.MYSQL_USER || 'emacro',
    password: process.env.MYSQL_PASSWORD || 'emacro123',
    multipleStatements: true,
  });

  console.log('* Creating system_settings if missing...');
  try {
    await c.query(`CREATE TABLE IF NOT EXISTS system_settings (
      \`key\` VARCHAR(255) NOT NULL PRIMARY KEY,
      \`value\` TEXT NULL,
      \`description\` TEXT NULL,
      \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (e) { console.error('  system_settings error:', e.message); }

  console.log('* Ensuring system_users auth columns...');
  const [cols] = await c.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'system_users'`
  );
  const existing = new Set(cols.map((x) => x.COLUMN_NAME));
  for (const col of COLUMNS) {
    if (existing.has(col.name)) { console.log(`  - ${col.name}: exists`); continue; }
    try {
      await c.query(`ALTER TABLE system_users ADD COLUMN \`${col.name}\` ${col.def}`);
      console.log(`  - ${col.name}: added`);
    } catch (e) { console.error(`  - ${col.name} error:`, e.message); }
  }

  await c.query(`UPDATE system_users SET auth_type = 'password' WHERE auth_type IS NULL`).catch(() => {});
  await c.end();
  console.log('* Migration complete.');
})().catch((e) => { console.error(e); process.exit(1); });
