const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// دالة بسيطة لقراءة ملفات البيئة .env يدوياً
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '.env'),
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
      break; // نكتفي بتحميل أول ملف نجده
    }
  }
}

// تحميل المتغيرات البيئية قبل البدء
loadEnv();

(async () => {
  // القيم الافتراضية
  const config = {
    host: 'localhost',
    port: 3306,
    user: 'emacro',
    password: 'emacro123',
    database: 'emacro_dashboard',
    connectionLimit: 5,
  };

  // 1. إذا وجد متغير DATABASE_URL نقوم بتحليله
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      config.host = parsed.hostname || config.host;
      config.port = Number(parsed.port) || config.port;
      config.user = parsed.username || config.user;
      config.password = decodeURIComponent(parsed.password) || config.password;
      config.database = parsed.pathname.replace(/^\//, '') || config.database;
    } catch (e) {
      console.warn('تنبيه: فشل تحليل DATABASE_URL، سيتم الاعتماد على متغيرات MYSQL_* الفردية.', e.message);
    }
  } else {
    // 2. إذا لم يوجد DATABASE_URL، نستخدم المتغيرات الفردية MYSQL_*
    config.host = process.env.MYSQL_HOST || config.host;
    config.port = Number(process.env.MYSQL_PORT) || config.port;
    config.user = process.env.MYSQL_USER || config.user;
    config.password = process.env.MYSQL_PASSWORD || config.password;
    config.database = process.env.MYSQL_DATABASE || config.database;
  }

  console.log('بيانات الاتصال المستخدمة:', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database
  });

  let pool;
  try {
    pool = mysql.createPool(config);
    const [tables] = await pool.query("SHOW TABLES");
    console.log('عدد الجداول الحالية:', tables.length);

    const want = ['system_users', 'workflows', 'tickets', 'ticket_values', 'approval_log'];
    const results = {};
    for (const t of want) {
      try {
        const [r] = await pool.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
        results[t] = { exists: true, count: r[0].c };
      } catch (e) {
        results[t] = { exists: false, error: e.message };
      }
    }

    console.log('حالة الجداول:', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('خطأ في الاتصال بقاعدة البيانات (CONN_ERROR):', err.message);
    process.exitCode = 2;
  } finally {
    try { if (pool) await pool.end(); } catch (e) {}
  }
})();