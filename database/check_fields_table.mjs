import { execSync } from 'child_process';

try {
  const fields = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT collection, field FROM directus_fields WHERE collection IN (\'departments\', \'system_users\', \'business_groups\');"', { encoding: 'utf-8' });
  console.log("Fields in directus_fields:\n" + fields);
} catch (err) {
  console.error(err.message);
}
