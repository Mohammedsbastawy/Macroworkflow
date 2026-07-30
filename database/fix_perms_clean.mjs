import { execSync } from 'child_process';

try {
  console.log("Cleaning up manual directus_permissions rows...");
  const del = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "DELETE FROM directus_permissions WHERE collection IN (\'system_users\', \'business_groups\', \'departments\');"', { encoding: 'utf-8' });
  console.log("Delete Output:\n" + del);

  console.log("Restarting directus_instance container...");
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  console.log("Directus restarted.");
} catch (err) {
  console.error("Error:", err.message);
}
