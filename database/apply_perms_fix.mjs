import { execSync } from 'child_process';

const sql = `
UPDATE directus_collections SET icon = 'people', note = 'System Users Directory', display_template = '{{name}}', hidden = false, singleton = false, accountability = 'all' WHERE collection = 'system_users';
UPDATE directus_collections SET icon = 'group', note = 'Business Groups Directory', display_template = '{{name}}', hidden = false, singleton = false, accountability = 'all' WHERE collection = 'business_groups';

DELETE FROM directus_permissions WHERE collection IN ('system_users', 'business_groups');

INSERT INTO directus_permissions (collection, action, policy, fields, permissions, validation, presets) VALUES
('system_users', 'create', '980f1be8-58de-49ac-a036-36ae8c222645', NULL, '{}', '{}', '{}'),
('system_users', 'read', '980f1be8-58de-49ac-a036-36ae8c222645', NULL, '{}', '{}', '{}'),
('system_users', 'update', '980f1be8-58de-49ac-a036-36ae8c222645', NULL, '{}', '{}', '{}'),
('system_users', 'delete', '980f1be8-58de-49ac-a036-36ae8c222645', NULL, '{}', '{}', '{}'),

('business_groups', 'create', '980f1be8-58de-49ac-a036-36ae8c222645', NULL, '{}', '{}', '{}'),
('business_groups', 'read', '980f1be8-58de-49ac-a036-36ae8c222645', NULL, '{}', '{}', '{}'),
('business_groups', 'update', '980f1be8-58de-49ac-a036-36ae8c222645', NULL, '{}', '{}', '{}'),
('business_groups', 'delete', '980f1be8-58de-49ac-a036-36ae8c222645', NULL, '{}', '{}', '{}');
`;

try {
  console.log("Applying collection meta and explicit permissions...");
  const out = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("SQL Result:\n" + out);

  console.log("Restarting directus_instance...");
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  console.log("Directus restarted.");
} catch (e) {
  console.error("Error:", e.message);
}
