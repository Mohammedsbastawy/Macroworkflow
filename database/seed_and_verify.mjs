import { execSync } from 'child_process';

const url = 'http://localhost:8055';
const token = 'workflow-engine-admin-static-token-2026';
const headers = { 'Authorization': `Bearer ${token}` };

console.log("=== 1. Ensuring Postgres Tables and Directus Metadata ===");

const sqlSchema = `
CREATE TABLE IF NOT EXISTS system_users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    department_id VARCHAR(64),
    group_ids_json JSONB,
    role VARCHAR(50),
    avatar_initials VARCHAR(10),
    job_title VARCHAR(255),
    direct_manager_id VARCHAR(64),
    unit VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS business_groups (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255),
    code VARCHAR(64),
    member_user_ids_json JSONB,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO directus_collections (collection, icon, note, display_template, hidden, singleton, accountability) VALUES
('departments', 'corporate_fare', 'Departments Directory', '{{name}}', false, false, 'all'),
('system_users', 'people', 'System Users Directory', '{{name}}', false, false, 'all'),
('business_groups', 'group', 'Business Groups Directory', '{{name}}', false, false, 'all')
ON CONFLICT (collection) DO UPDATE SET icon = EXCLUDED.icon, note = EXCLUDED.note;

INSERT INTO directus_fields (collection, field, readonly, hidden) VALUES
('system_users', 'id', false, false),
('system_users', 'name', false, false),
('system_users', 'email', false, false),
('system_users', 'department_id', false, false),
('system_users', 'group_ids_json', false, false),
('system_users', 'role', false, false),
('system_users', 'avatar_initials', false, false),
('system_users', 'job_title', false, false),
('system_users', 'direct_manager_id', false, false),
('system_users', 'unit', false, false),
('system_users', 'is_active', false, false),

('business_groups', 'id', false, false),
('business_groups', 'name', false, false),
('business_groups', 'code', false, false),
('business_groups', 'member_user_ids_json', false, false),
('business_groups', 'is_active', false, false)
ON CONFLICT DO NOTHING;
`;

try {
  execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sqlSchema.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("Schema & metadata ensured in Postgres.");
} catch (e) {
  console.error("Schema setup error:", e.message);
}

console.log("\n=== 2. Seeding Data into Database ===");

const sqlData = `
INSERT INTO system_users (id, name, email, department_id, group_ids_json, role, avatar_initials, job_title, direct_manager_id, unit, is_active) VALUES
('user-admin', 'System Admin', 'admin@company.com', 'dept-it', '["group-managers","group-executives"]', 'admin', 'AD', 'Infrastructure & System Super Admin', 'user-admin', 'Corporate HQ', true),
('user-ahmed', 'Ahmed Mohamed', 'ahmed@company.com', 'dept-it', '["group-it-techs"]', 'standard', 'AM', 'IT Technical Support Specialist', 'user-khaled', 'Enterprise IT Services', true),
('user-khaled', 'Khaled Samir', 'khaled@company.com', 'dept-it', '["group-it-techs","group-managers"]', 'approver', 'KS', 'IT Department Director', 'user-mona', 'Enterprise IT Services', true),
('user-noha', 'Noha Gamal', 'noha@company.com', 'dept-mkt', '["group-mkt-team"]', 'standard', 'NG', 'Digital Marketing Specialist', 'user-sherif', 'Brand Gamma - Marketing Unit', true),
('user-omar', 'Omar Khaled', 'omar@company.com', 'dept-mkt', '["group-mkt-team"]', 'standard', 'OK', 'Content & Graphic Design Lead', 'user-sherif', 'Brand Gamma - Marketing Unit', true),
('user-sherif', 'Sherif Ramzy', 'sherif@company.com', 'dept-mkt', '["group-mkt-team","group-managers"]', 'approver', 'SR', 'Marketing & Digital Branding Director', 'user-mona', 'Brand Gamma - Marketing Unit', true),
('user-tarek', 'Tarek Hassan', 'tarek@company.com', 'dept-procurement', '["group-procurement"]', 'standard', 'TH', 'Senior Purchasing Officer', 'user-yasser', 'Brand Alpha - Retail Unit', true),
('user-yasser', 'Yasser Mahmoud', 'yasser@company.com', 'dept-procurement', '["group-procurement","group-managers"]', 'approver', 'YM', 'Head of Procurement', 'user-mona', 'Brand Alpha - Retail Unit', true),
('user-huda', 'Huda Adel', 'huda@company.com', 'dept-finance', '["group-finance"]', 'standard', 'HA', 'Senior Financial Accountant', 'user-mona', 'Brand Beta - E-Commerce Unit', true),
('user-mona', 'Mona Omar', 'mona@company.com', 'dept-finance', '["group-finance","group-procurement","group-managers","group-executives"]', 'approver', 'MO', 'Chief Financial Officer (CFO)', 'user-admin', 'Corporate HQ', true),
('user-laila', 'Laila Ibrahim', 'laila@company.com', 'dept-hr', '[]', 'standard', 'LI', 'HR Specialist', 'user-sara', 'Brand Gamma - Marketing Unit', true),
('user-sara', 'Sara Hassan', 'sara@company.com', 'dept-hr', '["group-managers"]', 'approver', 'SH', 'Director of Human Resources', 'user-mona', 'Brand Gamma - Marketing Unit', true),
('user-karim', 'Karim Fathy', 'karim@company.com', 'dept-ops', '["group-managers"]', 'approver', 'KF', 'Operations & Facilities Manager', 'user-mona', 'Brand Delta - Operations Unit', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, email = EXCLUDED.email, department_id = EXCLUDED.department_id, group_ids_json = EXCLUDED.group_ids_json, role = EXCLUDED.role, avatar_initials = EXCLUDED.avatar_initials, job_title = EXCLUDED.job_title, direct_manager_id = EXCLUDED.direct_manager_id, unit = EXCLUDED.unit, is_active = EXCLUDED.is_active;

INSERT INTO business_groups (id, name, code, member_user_ids_json, is_active) VALUES
('group-procurement', 'Procurement Committee', 'PROC_COMM', '["user-tarek","user-yasser","user-khaled","user-mona"]', true),
('group-finance', 'Finance & Payroll Team', 'FIN_TEAM', '["user-huda","user-mona"]', true),
('group-it-techs', 'IT Technical Support Group', 'IT_TECHS', '["user-ahmed","user-khaled"]', true),
('group-mkt-team', 'Marketing & Media Team', 'MKT_TEAM', '["user-noha","user-omar","user-sherif"]', true),
('group-managers', 'Department Managers', 'DEPT_HEADS', '["user-khaled","user-sara","user-mona","user-yasser","user-karim","user-sherif"]', true),
('group-executives', 'Executive Board', 'EXEC_BOARD', '["user-mona","user-admin"]', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, code = EXCLUDED.code, member_user_ids_json = EXCLUDED.member_user_ids_json, is_active = EXCLUDED.is_active;
`;

try {
  execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sqlData.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("Data inserted into system_users & business_groups successfully.");
} catch (e) {
  console.error("Data insert error:", e.message);
}

console.log("\n=== 3. Restarting Directus Instance & Flushing Schema Cache ===");
try {
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  execSync('powershell -Command "Start-Sleep -Seconds 5"', { encoding: 'utf-8' });
  console.log("Directus instance reloaded.");
} catch (e) {
  console.error("Restart error:", e.message);
}

console.log("\n=== 4. Executing PowerShell API Seed Script (seed_system.ps1) ===");
try {
  const psOut = execSync('powershell -ExecutionPolicy Bypass -File database/seed_system.ps1', { encoding: 'utf-8' });
  console.log("PowerShell Execution Result:\n" + psOut);
} catch (e) {
  console.error("PowerShell script execution error:\n", e.stdout || e.message);
}

console.log("\n=== 5. Verifying Directus REST API Responses ===");

async function verifyAll() {
  const fetchItems = async (coll) => {
    const res = await fetch(`${url}/items/${coll}`, { headers });
    if (!res.ok) {
      console.error(`Failed to fetch /items/${coll}: ${res.status}`, await res.text());
      return [];
    }
    const json = await res.json();
    return json.data || [];
  };

  const depts = await fetchItems('departments');
  console.log(`\nDEPARTMENTS REST API (${depts.length} items):`);
  depts.forEach(d => console.log(`  - ${d.id}: ${d.name} (${d.code})`));

  const users = await fetchItems('system_users');
  console.log(`\nSYSTEM_USERS REST API (${users.length} items):`);
  users.forEach(u => console.log(`  - ${u.id}: ${u.name} [${u.role}] (${u.email})`));

  const groups = await fetchItems('business_groups');
  console.log(`\nBUSINESS_GROUPS REST API (${groups.length} items):`);
  groups.forEach(g => console.log(`  - ${g.id}: ${g.name} (${g.code})`));
}

verifyAll().catch(console.error);
