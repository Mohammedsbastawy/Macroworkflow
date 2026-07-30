import { execSync } from 'child_process';

const sql = `
INSERT INTO directus_collections (collection, icon, note) VALUES
('departments', 'corporate_fare', 'Departments Directory'),
('system_users', 'people', 'System Users Directory'),
('business_groups', 'group', 'Business Groups Directory')
ON CONFLICT (collection) DO NOTHING;
`;

try {
  console.log("Registering collections in directus_collections...");
  const output = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("SQL Output:\n" + output);

  console.log("Restarting directus_instance container...");
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  console.log("Restarted Directus OK.");
} catch (err) {
  console.error("Error:", err.message);
}
