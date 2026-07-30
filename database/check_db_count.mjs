import { execSync } from 'child_process';

try {
  const usersCount = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT count(*) FROM system_users;"', { encoding: 'utf-8' });
  console.log("system_users count in Postgres:\n" + usersCount);

  const groupsCount = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT count(*) FROM business_groups;"', { encoding: 'utf-8' });
  console.log("business_groups count in Postgres:\n" + groupsCount);
} catch (err) {
  console.error("PSQL Error:", err.message);
}
