import mysql from 'mysql2/promise';

async function main() {
  const p = mysql.createPool({
    host: 'localhost',
    port: 3306,
    database: 'emacro_dashboard',
    user: 'emacro',
    password: 'emacro123'
  });

  try {
    const [res] = await p.query(
      `DELETE FROM workflows WHERE id IN ('wf-annual-leave', 'wf-it-asset') OR slug IN ('annual-leave', 'it-asset-request') OR name LIKE '%Annual Leave%' OR name LIKE '%IT Asset%'`
    );
    console.log('✅ MySQL Workflows Deleted Count:', res.affectedRows);
  } catch (err) {
    console.error('MySQL Delete Error:', err);
  } finally {
    await p.end();
  }
}

main();
