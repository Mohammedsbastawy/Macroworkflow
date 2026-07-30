import { execSync } from 'child_process';

const sqlUsers = `
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
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  department_id = EXCLUDED.department_id,
  group_ids_json = EXCLUDED.group_ids_json,
  role = EXCLUDED.role,
  avatar_initials = EXCLUDED.avatar_initials,
  job_title = EXCLUDED.job_title,
  direct_manager_id = EXCLUDED.direct_manager_id,
  unit = EXCLUDED.unit,
  is_active = EXCLUDED.is_active;
`;

const sqlGroups = `
INSERT INTO business_groups (id, name, code, member_user_ids_json, is_active) VALUES
('group-procurement', 'Procurement Committee', 'PROC_COMM', '["user-tarek","user-yasser","user-khaled","user-mona"]', true),
('group-finance', 'Finance & Payroll Team', 'FIN_TEAM', '["user-huda","user-mona"]', true),
('group-it-techs', 'IT Technical Support Group', 'IT_TECHS', '["user-ahmed","user-khaled"]', true),
('group-mkt-team', 'Marketing & Media Team', 'MKT_TEAM', '["user-noha","user-omar","user-sherif"]', true),
('group-managers', 'Department Managers', 'DEPT_HEADS', '["user-khaled","user-sara","user-mona","user-yasser","user-karim","user-sherif"]', true),
('group-executives', 'Executive Board', 'EXEC_BOARD', '["user-mona","user-admin"]', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  member_user_ids_json = EXCLUDED.member_user_ids_json,
  is_active = EXCLUDED.is_active;
`;

try {
  console.log("Inserting system_users into Postgres...");
  const res1 = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sqlUsers.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("system_users Output:", res1.trim());

  console.log("Inserting business_groups into Postgres...");
  const res2 = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sqlGroups.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log("business_groups Output:", res2.trim());
} catch (err) {
  console.error("Error executing SQL:\n", err.message);
}
