import { execSync } from 'child_process';

try {
  const tables = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT table_schema, table_name FROM information_schema.tables WHERE table_name IN (\'departments\', \'system_users\', \'business_groups\');"', { encoding: 'utf-8' });
  console.log("Tables in Postgres:\n" + tables);

  const uCount = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT count(*) FROM system_users;"', { encoding: 'utf-8' });
  console.log("system_users count in Postgres:\n" + uCount);

  const gCount = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT count(*) FROM business_groups;"', { encoding: 'utf-8' });
  console.log("business_groups count in Postgres:\n" + gCount);
} catch (err) {
  console.error("Error:", err.message);
}
