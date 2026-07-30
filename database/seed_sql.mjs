import { execSync } from 'child_process';

const systemUsers = [
  { id: 'user-admin',  name: 'System Admin',    email: 'admin@company.com',  department_id: 'dept-it',          group_ids_json: ['group-managers','group-executives'],                       role: 'admin',    avatar_initials: 'AD', job_title: 'Infrastructure & System Super Admin', direct_manager_id: 'user-admin',  unit: 'Corporate HQ',                  is_active: true },
  { id: 'user-ahmed',  name: 'Ahmed Mohamed',   email: 'ahmed@company.com',  department_id: 'dept-it',          group_ids_json: ['group-it-techs'],                                          role: 'standard', avatar_initials: 'AM', job_title: 'IT Technical Support Specialist',     direct_manager_id: 'user-khaled', unit: 'Enterprise IT Services',       is_active: true },
  { id: 'user-khaled', name: 'Khaled Samir',    email: 'khaled@company.com', department_id: 'dept-it',          group_ids_json: ['group-it-techs','group-managers'],                         role: 'approver', avatar_initials: 'KS', job_title: 'IT Department Director',              direct_manager_id: 'user-mona',   unit: 'Enterprise IT Services',       is_active: true },
  { id: 'user-noha',   name: 'Noha Gamal',      email: 'noha@company.com',   department_id: 'dept-mkt',         group_ids_json: ['group-mkt-team'],                                          role: 'standard', avatar_initials: 'NG', job_title: 'Digital Marketing Specialist',         direct_manager_id: 'user-sherif', unit: 'Brand Gamma - Marketing Unit', is_active: true },
  { id: 'user-omar',   name: 'Omar Khaled',     email: 'omar@company.com',   department_id: 'dept-mkt',         group_ids_json: ['group-mkt-team'],                                          role: 'standard', avatar_initials: 'OK', job_title: 'Content & Graphic Design Lead',        direct_manager_id: 'user-sherif', unit: 'Brand Gamma - Marketing Unit', is_active: true },
  { id: 'user-sherif', name: 'Sherif Ramzy',    email: 'sherif@company.com', department_id: 'dept-mkt',         group_ids_json: ['group-mkt-team','group-managers'],                         role: 'approver', avatar_initials: 'SR', job_title: 'Marketing & Digital Branding Director', direct_manager_id: 'user-mona',   unit: 'Brand Gamma - Marketing Unit', is_active: true },
  { id: 'user-tarek',  name: 'Tarek Hassan',    email: 'tarek@company.com',  department_id: 'dept-procurement', group_ids_json: ['group-procurement'],                                      role: 'standard', avatar_initials: 'TH', job_title: 'Senior Purchasing Officer',            direct_manager_id: 'user-yasser', unit: 'Brand Alpha - Retail Unit',    is_active: true },
  { id: 'user-yasser', name: 'Yasser Mahmoud',  email: 'yasser@company.com', department_id: 'dept-procurement', group_ids_json: ['group-procurement','group-managers'],                       role: 'approver', avatar_initials: 'YM', job_title: 'Head of Procurement',                 direct_manager_id: 'user-mona',   unit: 'Brand Alpha - Retail Unit',    is_active: true },
  { id: 'user-huda',   name: 'Huda Adel',       email: 'huda@company.com',   department_id: 'dept-finance',     group_ids_json: ['group-finance'],                                           role: 'standard', avatar_initials: 'HA', job_title: 'Senior Financial Accountant',          direct_manager_id: 'user-mona',   unit: 'Brand Beta - E-Commerce Unit', is_active: true },
  { id: 'user-mona',   name: 'Mona Omar',       email: 'mona@company.com',   department_id: 'dept-finance',     group_ids_json: ['group-finance','group-procurement','group-managers','group-executives'], role: 'approver', avatar_initials: 'MO', job_title: 'Chief Financial Officer (CFO)',       direct_manager_id: 'user-admin',  unit: 'Corporate HQ',                  is_active: true },
  { id: 'user-laila',  name: 'Laila Ibrahim',   email: 'laila@company.com',  department_id: 'dept-hr',          group_ids_json: [],                                                          role: 'standard', avatar_initials: 'LI', job_title: 'HR Specialist',                        direct_manager_id: 'user-sara',   unit: 'Brand Gamma - Marketing Unit', is_active: true },
  { id: 'user-sara',   name: 'Sara Hassan',     email: 'sara@company.com',   department_id: 'dept-hr',          group_ids_json: ['group-managers'],                                          role: 'approver', avatar_initials: 'SH', job_title: 'Director of Human Resources',          direct_manager_id: 'user-mona',   unit: 'Brand Gamma - Marketing Unit', is_active: true },
  { id: 'user-karim',  name: 'Karim Fathy',     email: 'karim@company.com',  department_id: 'dept-ops',         group_ids_json: ['group-managers'],                                          role: 'approver', avatar_initials: 'KF', job_title: 'Operations & Facilities Manager',    direct_manager_id: 'user-mona',   unit: 'Brand Delta - Operations Unit', is_active: true }
];

const businessGroups = [
  { id: 'group-procurement', name: 'Procurement Committee',    code: 'PROC_COMM',  member_user_ids_json: ['user-tarek','user-yasser','user-khaled','user-mona'],               is_active: true },
  { id: 'group-finance',     name: 'Finance & Payroll Team',   code: 'FIN_TEAM',   member_user_ids_json: ['user-huda','user-mona'],                                            is_active: true },
  { id: 'group-it-techs',    name: 'IT Technical Support Group',code: 'IT_TECHS',   member_user_ids_json: ['user-ahmed','user-khaled'],                                         is_active: true },
  { id: 'group-mkt-team',    name: 'Marketing & Media Team',   code: 'MKT_TEAM',   member_user_ids_json: ['user-noha','user-omar','user-sherif'],                               is_active: true },
  { id: 'group-managers',    name: 'Department Managers',      code: 'DEPT_HEADS', member_user_ids_json: ['user-khaled','user-sara','user-mona','user-yasser','user-karim','user-sherif'], is_active: true },
  { id: 'group-executives',  name: 'Executive Board',          code: 'EXEC_BOARD', member_user_ids_json: ['user-mona','user-admin'],                                           is_active: true }
];

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

console.log("Seeding system_users via SQL...");
for (const u of systemUsers) {
  const jsonStr = escapeSql(JSON.stringify(u.group_ids_json));
  const sql = `
  INSERT INTO system_users (id, name, email, department_id, group_ids_json, role, avatar_initials, job_title, direct_manager_id, unit, is_active)
  VALUES (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.department_id)}, ${jsonStr}, ${escapeSql(u.role)}, ${escapeSql(u.avatar_initials)}, ${escapeSql(u.job_title)}, ${escapeSql(u.direct_manager_id)}, ${escapeSql(u.unit)}, ${u.is_active})
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
  try {
    execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
    console.log(`  OK: User ${u.id}`);
  } catch (e) {
    console.error(`  FAIL: User ${u.id}:`, e.message);
  }
}

console.log("\nSeeding business_groups via SQL...");
for (const g of businessGroups) {
  const jsonStr = escapeSql(JSON.stringify(g.member_user_ids_json));
  const sql = `
  INSERT INTO business_groups (id, name, code, member_user_ids_json, is_active)
  VALUES (${escapeSql(g.id)}, ${escapeSql(g.name)}, ${escapeSql(g.code)}, ${jsonStr}, ${g.is_active})
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    member_user_ids_json = EXCLUDED.member_user_ids_json,
    is_active = EXCLUDED.is_active;
  `;
  try {
    execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
    console.log(`  OK: Group ${g.id}`);
  } catch (e) {
    console.error(`  FAIL: Group ${g.id}:`, e.message);
  }
}
