import { execSync } from 'child_process';

try {
  console.log("Checking directus_collections...");
  const sel = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT collection FROM directus_collections;"', { encoding: 'utf-8' });
  console.log("Current collections in directus_collections:\n" + sel);

  console.log("Upserting departments, system_users, and business_groups into directus_collections...");
  const sql = `
  INSERT INTO directus_collections (collection, icon, note) VALUES
  ('departments', 'corporate_fare', 'Departments Directory'),
  ('system_users', 'people', 'System Users Directory'),
  ('business_groups', 'group', 'Business Groups Directory')
  ON CONFLICT (collection) DO UPDATE SET icon = EXCLUDED.icon, note = EXCLUDED.note;
  `;
  const up = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("UPSERT Output:\n" + up);

  const check = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT collection FROM directus_collections WHERE collection IN (\'departments\', \'system_users\', \'business_groups\');"', { encoding: 'utf-8' });
  console.log("Check Output:\n" + check);
} catch (err) {
  console.error("Error:", err.message);
}
