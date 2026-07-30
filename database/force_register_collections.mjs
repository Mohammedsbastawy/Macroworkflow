import { execSync } from 'child_process';

const sql = `
DELETE FROM directus_collections WHERE collection IN ('system_users', 'business_groups');

INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, accountability) VALUES
('system_users', 'people', 'System Users Directory', '{{name}}', false, false, 'all'),
('business_groups', 'group', 'Business Groups Directory', '{{name}}', false, false, 'all');
`;

try {
  console.log("Force inserting into directus_collections...");
  const out = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("Output:\n" + out);

  const check = execSync('docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "SELECT collection, icon, note FROM directus_collections WHERE collection IN (\'system_users\', \'business_groups\');"', { encoding: 'utf-8' });
  console.log("Verification in Postgres:\n" + check);

  console.log("Restarting directus_instance...");
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  console.log("Directus restarted.");
} catch (e) {
  console.error("Error:", e.message);
}
