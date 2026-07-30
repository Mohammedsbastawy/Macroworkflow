import { execSync } from 'child_process';

try {
  const fields = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT collection, field, special, interface FROM directus_fields WHERE collection = \'system_users\';"', { encoding: 'utf-8' });
  console.log("system_users fields in directus_fields:\n" + fields);

  const coll = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT * FROM directus_collections WHERE collection = \'system_users\';"', { encoding: 'utf-8' });
  console.log("system_users collection meta in directus_collections:\n" + coll);
} catch (err) {
  console.error(err.message);
}
