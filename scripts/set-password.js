// Set / reset a system user's local password and username.
// Usage:
//   node scripts/set-password.js <userId> <newPassword> [loginName]
// Example:
//   node scripts/set-password.js user-admin 'S3cure!pass' admin

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// تحميل المتغيرات البيئية من الملفات المحلية
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual !== -1) {
            const key = trimmed.substring(0, firstEqual).trim();
            const val = trimmed.substring(firstEqual + 1).trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = val;
          }
        }
      });
      break;
    }
  }
}
loadEnv();

(async () => {
  const [id, password, loginName] = process.argv.slice(2);
  if (!id || !password) {
    console.error('Usage: node scripts/set-password.js <userId> <newPassword> [loginName]');
    process.exit(1);
  }

  const config = {
    host: 'localhost',
    port: 3306,
    user: 'emacro',
    password: 'emacro123',
    database: 'emacro_dashboard',
  };

  // محاولة القراءة من DATABASE_URL أولاً
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      config.host = parsed.hostname || config.host;
      config.port = Number(parsed.port) || config.port;
      config.user = parsed.username || config.user;
      config.password = decodeURIComponent(parsed.password) || config.password;
      config.database = parsed.pathname.replace(/^\//, '') || config.database;
    } catch (e) {
      console.warn('تنبيه: فشل تحليل DATABASE_URL، سيتم الاعتماد على متغيرات MYSQL_*', e.message);
    }
  } else {
    config.host = process.env.MYSQL_HOST || config.host;
    config.port = Number(process.env.MYSQL_PORT) || config.port;
    config.user = process.env.MYSQL_USER || config.user;
    config.password = process.env.MYSQL_PASSWORD || config.password;
    config.database = process.env.MYSQL_DATABASE || config.database;
  }

  console.log(`جاري الاتصال بخادم قاعدة البيانات ${config.host} لتعيين كلمة المرور...`);
  const c = await mysql.createConnection(config);

  const hash = await bcrypt.hash(password, 10);
  const extra = loginName ? `, LoginName = ${c.escape(loginName)}` : '';
  
  // تحديث جدول Users بالصيغة والأعمدة الصحيحة للمخطط الجديد
  await c.query(
    `UPDATE Users SET PasswordHash = ?, AuthType = 'password'${extra} WHERE UserID = ?`,
    [hash, id]
  );
  
  const [rows] = await c.query('SELECT UserID, LoginName, AuthType FROM Users WHERE UserID = ?', [id]);
  console.log('Updated:', rows[0] || { id });
  await c.end();
})().catch((e) => { 
  console.error(e); 
  process.exit(1); 
});
