import { execSync } from 'child_process';

try {
  const out1 = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT collection, icon FROM directus_collections WHERE collection = \'system_users\';"', { encoding: 'utf-8' });
  console.log("system_users row in directus_collections:\n" + out1);

  const out2 = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT collection FROM directus_collections;"', { encoding: 'utf-8' });
  console.log("All collections in directus_collections:\n" + out2);
} catch (e) {
  console.error(e.message);
}
