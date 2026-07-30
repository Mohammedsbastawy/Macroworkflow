import { execSync } from 'child_process';

try {
  console.log("Cleaning directus_fields and setting accountability=null for system_users and business_groups...");
  const sql = `
  DELETE FROM directus_fields WHERE collection IN ('system_users', 'business_groups');
  UPDATE directus_collections SET accountability = null WHERE collection IN ('system_users', 'business_groups');
  `;
  const res = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("SQL Output:\n" + res);

  console.log("Restarting directus_instance...");
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  console.log("Directus restarted.");
} catch (err) {
  console.error("Error:", err.message);
}
