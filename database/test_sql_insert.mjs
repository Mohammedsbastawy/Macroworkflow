import { execSync } from 'child_process';

try {
  console.log("Testing SQL insert into system_users...");
  const sql = `
  INSERT INTO system_users (id, name, email, department_id, group_ids_json, role, avatar_initials, job_title, direct_manager_id, unit, is_active)
  VALUES ('user-admin', 'System Admin', 'admin@company.com', 'dept-it', '["group-managers","group-executives"]', 'admin', 'AD', 'Infrastructure & System Super Admin', 'user-admin', 'Corporate HQ', true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  `;
  const res = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("SQL Insert Output:\n" + res);
} catch (err) {
  console.error("SQL Insert Error:", err.message);
}
