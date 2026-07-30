import { execSync } from 'child_process';

try {
  const res = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT collection, icon, hidden, singleton, accountability FROM directus_collections WHERE collection IN (\'departments\', \'system_users\', \'business_groups\', \'travel_zones\');"', { encoding: 'utf-8' });
  console.log("Collection Details:\n" + res);
} catch (err) {
  console.error(err.message);
}
