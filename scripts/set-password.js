// Set / reset a system user's local password and username.
// Usage:
//   node scripts/set-password.js <userId> <newPassword> [username]
// Example:
//   node scripts/set-password.js user-admin 'S3cure!pass' admin
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const [id, password, username] = process.argv.slice(2);
  if (!id || !password) {
    console.error('Usage: node scripts/set-password.js <userId> <newPassword> [username]');
    process.exit(1);
  }
  const c = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: +(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE || 'emacro_dashboard',
    user: process.env.MYSQL_USER || 'emacro',
    password: process.env.MYSQL_PASSWORD || 'emacro123',
  });
  const hash = await bcrypt.hash(password, 10);
  const extra = username ? `, username = ${c.escape(username)}` : '';
  await c.query(
    `UPDATE system_users SET password_hash = ?, auth_type = 'password'${extra} WHERE id = ?`,
    [hash, id]
  );
  const [rows] = await c.query('SELECT id, username, auth_type FROM system_users WHERE id = ?', [id]);
  console.log('Updated:', rows[0] || { id });
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
