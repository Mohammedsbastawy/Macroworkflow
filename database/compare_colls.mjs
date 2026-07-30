import { execSync } from 'child_process';

try {
  const tz = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT * FROM directus_collections WHERE collection = \'travel_zones\';"', { encoding: 'utf-8' });
  console.log("travel_zones collection row:\n" + tz);

  const su = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT * FROM directus_collections WHERE collection = \'system_users\';"', { encoding: 'utf-8' });
  console.log("system_users collection row:\n" + su);
} catch (err) {
  console.error("Error:", err.message);
}
