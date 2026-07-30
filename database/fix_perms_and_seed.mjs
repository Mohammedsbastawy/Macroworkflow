import { execSync } from 'child_process';
import path from 'path';

console.log("=== 1. Granting explicit admin permissions in Postgres ===");
const sql = `
INSERT INTO directus_collections (collection, icon, note) VALUES
('departments', 'corporate_fare', 'Departments Directory'),
('system_users', 'people', 'System Users Directory'),
('business_groups', 'group', 'Business Groups Directory')
ON CONFLICT (collection) DO NOTHING;

INSERT INTO directus_permissions (collection, action, policy, fields) VALUES
('departments', 'create', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),
('departments', 'read', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),
('departments', 'update', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),
('departments', 'delete', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),

('system_users', 'create', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),
('system_users', 'read', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),
('system_users', 'update', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),
('system_users', 'delete', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),

('business_groups', 'create', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),
('business_groups', 'read', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),
('business_groups', 'update', '980f1be8-58de-49ac-a036-36ae8c222645', '*'),
('business_groups', 'delete', '980f1be8-58de-49ac-a036-36ae8c222645', '*')
ON CONFLICT DO NOTHING;
`;

try {
  const sqlRes = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("SQL Output:\n" + sqlRes);
} catch (e) {
  console.error("SQL Error:", e.message);
}

console.log("\n=== 2. Restarting directus_instance container ===");
try {
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  console.log("Container restarted. Waiting 5s for warmup...");
  execSync('powershell -Command "Start-Sleep -Seconds 5"', { encoding: 'utf-8' });
} catch (e) {
  console.error("Restart error:", e.message);
}

console.log("\n=== 3. Executing PowerShell Seeding Script ===");
try {
  const psPath = path.resolve('database/seed_system.ps1');
  const output = execSync(`powershell -ExecutionPolicy Bypass -File "${psPath}"`, {
    encoding: 'utf-8',
    cwd: process.cwd()
  });
  console.log(output);
} catch (err) {
  console.error("PowerShell Error:\n", err.stdout || err.message);
}
