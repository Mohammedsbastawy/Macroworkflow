const mysql = require('mysql2/promise');
(async () => {
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'emacro',
    password: process.env.MYSQL_PASSWORD || 'emacro123',
    database: process.env.MYSQL_DATABASE || 'emacro_dashboard',
    connectionLimit: 5,
  };

  console.log('Using DB config:', { host: config.host, port: config.port, user: config.user, database: config.database });

  let pool;
  try {
    pool = mysql.createPool(config);
    const [tables] = await pool.query("SHOW TABLES");
    console.log('TABLES_COUNT:', tables.length);

    const want = ['system_users','workflows','tickets','ticket_values','approval_log'];
    const results = {};
    for (const t of want) {
      try {
        const [r] = await pool.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
        results[t] = { exists: true, count: r[0].c };
      } catch (e) {
        results[t] = { exists: false, error: e.message };
      }
    }

    console.log('RESULTS:', JSON.stringify(results));
  } catch (err) {
    console.error('CONN_ERROR:', err.message);
    process.exitCode = 2;
  } finally {
    try { if (pool) await pool.end(); } catch (e) {}
  }
})();