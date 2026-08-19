const mysql = require('mysql2/promise');

(async () => {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'emacro_user',
    password: process.env.MYSQL_PASSWORD || 'emacro_password_strong',
    database: process.env.MYSQL_DATABASE || 'emacro_dashboard',
  };

  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      config.host = parsed.hostname || config.host;
      config.port = Number(parsed.port) || config.port;
      config.user = parsed.username || config.user;
      config.password = decodeURIComponent(parsed.password) || config.password;
      config.database = parsed.pathname.replace(/^\//, '') || config.database;
    } catch (e) {
      console.warn('DATABASE_URL error', e.message);
    }
  }

  try {
    const connection = await mysql.createConnection(config);
    console.log('Connected to MySQL');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS api_integrations (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        endpoint_url VARCHAR(1000) NOT NULL,
        auth_headers_json TEXT,
        allowed_roles_json TEXT,
        allowed_users_json TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Table api_integrations created successfully.');
    await connection.end();
  } catch (err) {
    console.error('Error:', err);
  }
})();
