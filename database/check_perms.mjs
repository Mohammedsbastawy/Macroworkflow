import { execSync } from 'child_process';

try {
  const perms = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT * FROM directus_permissions WHERE collection = \'travel_zones\';"', { encoding: 'utf-8' });
  console.log("Travel Zones Permissions:\n" + perms);

  const allPerms = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT collection, action, policy FROM directus_permissions;"', { encoding: 'utf-8' });
  console.log("All Permissions:\n" + allPerms);
} catch (err) {
  console.error(err.message);
}
