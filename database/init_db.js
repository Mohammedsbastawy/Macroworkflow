const mysql = require('mysql2/promise');
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
  const config = {
    host: 'localhost',
    port: 3306,
    user: 'emacro',
    password: 'emacro123',
    database: 'emacro_dashboard',
    multipleStatements: true // تفعيل لتشغيل السكربت بالكامل دفعة واحدة
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

  // الاتصال المبدئي بدون تحديد اسم قاعدة البيانات لضمان إنشائها أولاً
  const initConfig = { ...config };
  delete initConfig.database;

  let connection;
  try {
    console.log(`جاري الاتصال بالخادم ${config.host} لتهيئة قاعدة البيانات...`);
    connection = await mysql.createConnection(initConfig);

    // 1. إنشاء قاعدة البيانات إن لم تكن موجودة
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${config.database}\`;`);

    // 2. التحقق من وجود الهيكل الجديد (Users) لتفادي إعادة البناء على قاعدة قديمة
    const [tables] = await connection.query("SHOW TABLES");
    const existing = tables.map((row) => Object.values(row)[0]);
    const hasNewSchema = existing.includes('Users') && existing.includes('Tickets');

    if (existing.length > 0 && hasNewSchema) {
      console.log(`قاعدة البيانات "${config.database}" تحتوي بالفعل على الهيكل الجديد (${existing.length} جداول). تخطي بناء الهيكل.`);
    } else {
      console.log('جاري تهيئة الهيكل الجديد (Schema Init)...');
      const schemaPath = path.join(__dirname, 'mysql_schema_init.sql');
      let schemaSql = fs.readFileSync(schemaPath, 'utf8');

      // إزالة جمل DROP DATABASE و CREATE DATABASE و USE من الملف لتجنب أي تعارض
      schemaSql = schemaSql
        .split('\n')
        .filter(line => !line.trim().startsWith('DROP DATABASE') && !line.trim().startsWith('CREATE DATABASE') && !line.trim().startsWith('USE '))
        .join('\n');

      // تشغيل ملف الهيكل بالكامل
      await connection.query(schemaSql);
      console.log('تم بناء هيكل الجداول بنجاح.');

      // 3. تغذية البيانات الافتراضية تلقائياً من mysql_inserts.sql
      const insertsPath = path.join(__dirname, 'mysql_inserts.sql');
      if (fs.existsSync(insertsPath)) {
        console.log('جاري تغذية قاعدة البيانات بالبيانات الأساسية والافتراضية (mysql_inserts.sql)...');
        let insertsSql = fs.readFileSync(insertsPath, 'utf8');
        
        // إزالة سطر USE لتجنب أي تعارض مع قاعدة البيانات الحالية
        insertsSql = insertsSql
          .split('\n')
          .filter(line => !line.trim().startsWith('USE '))
          .join('\n');

        await connection.query(insertsSql);
        console.log('تمت تغذية قاعدة البيانات بنجاح باليوزرات، الأقسام، وسير العمل.');
      } else {
        console.log('تنبيه: لم يتم العثور على ملف mysql_inserts.sql لتغذية قاعدة البيانات.');
      }
    }
  } catch (err) {
    console.error('فشل في تهيئة قاعدة البيانات:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
})();
