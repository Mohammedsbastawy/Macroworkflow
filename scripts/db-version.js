const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: process.env.MYSQL_HOST || 'localhost', port: +(process.env.MYSQL_PORT || 3306), database: process.env.MYSQL_DATABASE || 'emacro_dashboard', user: process.env.MYSQL_USER || 'emacro', password: process.env.MYSQL_PASSWORD || 'emacro123' });
  const [r] = await c.query('SELECT VERSION() v');
  console.log('MySQL', r[0].v);
  await c.end();
})();
