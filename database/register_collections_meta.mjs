import { execSync } from 'child_process';

const sql = `
INSERT INTO directus_collections (collection, icon, note) VALUES
('departments', 'corporate_fare', 'Departments Directory'),
('system_users', 'people', 'System Users Directory'),
('business_groups', 'group', 'Business Groups Directory')
ON CONFLICT (collection) DO UPDATE SET
  icon = EXCLUDED.icon,
  note = EXCLUDED.note;
`;

try {
  console.log("Upserting into directus_collections...");
  const out = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("Output:", out.trim());

  console.log("Restarting directus_instance...");
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  console.log("Directus restarted.");
} catch (e) {
  console.error("Error:", e.message);
}
