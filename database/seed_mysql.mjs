import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Lightweight .env.local parser (avoid adding dotenv dependency)
function loadDotEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, { encoding: 'utf8' });
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      // remove optional surrounding quotes
      if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (e) {
    // ignore
  }
}

loadDotEnv(path.resolve(process.cwd(), '.env.local'));

const systemUsers = [
  { id: 'user-admin',  name: 'System Admin',    email: 'admin@company.com',  department_id: 'dept-it',          group_ids_json: ['group-managers','group-executives'],                       role: 'admin',    avatar_initials: 'AD', job_title: 'Infrastructure & System Super Admin', direct_manager_id: 'user-admin',  unit: 'Corporate HQ',                  is_active: 1 },
  { id: 'user-ahmed',  name: 'Ahmed Mohamed',   email: 'ahmed@company.com',  department_id: 'dept-it',          group_ids_json: ['group-it-techs'],                                          role: 'selfservice', avatar_initials: 'AM', job_title: 'IT Technical Support Specialist',     direct_manager_id: 'user-khaled', unit: 'Enterprise IT Services',       is_active: 1 },
  { id: 'user-khaled', name: 'Khaled Samir',    email: 'khaled@company.com', department_id: 'dept-it',          group_ids_json: ['group-it-techs','group-managers'],                         role: 'selfservice', avatar_initials: 'KS', job_title: 'IT Department Director',              direct_manager_id: 'user-mona',   unit: 'Enterprise IT Services',       is_active: 1 },
  { id: 'user-noha',   name: 'Noha Gamal',      email: 'noha@company.com',   department_id: 'dept-mkt',         group_ids_json: ['group-mkt-team'],                                          role: 'selfservice', avatar_initials: 'NG', job_title: 'Digital Marketing Specialist',         direct_manager_id: 'user-sherif', unit: 'Brand Gamma - Marketing Unit', is_active: 1 },
  { id: 'user-omar',   name: 'Omar Khaled',     email: 'omar@company.com',   department_id: 'dept-mkt',         group_ids_json: ['group-mkt-team'],                                          role: 'selfservice', avatar_initials: 'OK', job_title: 'Content & Graphic Design Lead',        direct_manager_id: 'user-sherif', unit: 'Brand Gamma - Marketing Unit', is_active: 1 },
  { id: 'user-sherif', name: 'Sherif Ramzy',    email: 'sherif@company.com', department_id: 'dept-mkt',         group_ids_json: ['group-mkt-team','group-managers'],                         role: 'selfservice', avatar_initials: 'SR', job_title: 'Marketing & Digital Branding Director', direct_manager_id: 'user-mona',   unit: 'Brand Gamma - Marketing Unit', is_active: 1 },
  { id: 'user-tarek',  name: 'Tarek Hassan',    email: 'tarek@company.com',  department_id: 'dept-procurement', group_ids_json: ['group-procurement'],                                      role: 'selfservice', avatar_initials: 'TH', job_title: 'Senior Purchasing Officer',            direct_manager_id: 'user-yasser', unit: 'Brand Alpha - Retail Unit',    is_active: 1 },
  { id: 'user-yasser', name: 'Yasser Mahmoud',  email: 'yasser@company.com', department_id: 'dept-procurement', group_ids_json: ['group-procurement','group-managers'],                       role: 'selfservice', avatar_initials: 'YM', job_title: 'Head of Procurement',                 direct_manager_id: 'user-mona',   unit: 'Brand Alpha - Retail Unit',    is_active: 1 },
  { id: 'user-huda',   name: 'Huda Adel',       email: 'huda@company.com',   department_id: 'dept-finance',     group_ids_json: ['group-finance'],                                           role: 'selfservice', avatar_initials: 'HA', job_title: 'Senior Financial Accountant',          direct_manager_id: 'user-mona',   unit: 'Brand Beta - E-Commerce Unit', is_active: 1 },
  { id: 'user-mona',   name: 'Mona Omar',       email: 'mona@company.com',   department_id: 'dept-finance',     group_ids_json: ['group-finance','group-procurement','group-managers','group-executives'], role: 'selfservice', avatar_initials: 'MO', job_title: 'Chief Financial Officer (CFO)',       direct_manager_id: 'user-admin',  unit: 'Corporate HQ',                  is_active: 1 },
  { id: 'user-laila',  name: 'Laila Ibrahim',   email: 'laila@company.com',  department_id: 'dept-hr',          group_ids_json: [],                                                          role: 'selfservice', avatar_initials: 'LI', job_title: 'HR Specialist',                        direct_manager_id: 'user-sara',   unit: 'Brand Gamma - Marketing Unit', is_active: 1 },
  { id: 'user-sara',   name: 'Sara Hassan',     email: 'sara@company.com',   department_id: 'dept-hr',          group_ids_json: ['group-managers'],                                          role: 'selfservice', avatar_initials: 'SH', job_title: 'Director of Human Resources',          direct_manager_id: 'user-mona',   unit: 'Brand Gamma - Marketing Unit', is_active: 1 },
  { id: 'user-karim',  name: 'Karim Fathy',     email: 'karim@company.com',  department_id: 'dept-ops',         group_ids_json: ['group-managers'],                                          role: 'selfservice', avatar_initials: 'KF', job_title: 'Operations & Facilities Manager',    direct_manager_id: 'user-mona',   unit: 'Brand Delta - Operations Unit', is_active: 1 }
];

const businessGroups = [
  { id: 'group-procurement', name: 'Procurement Committee',    code: 'PROC_COMM',  member_user_ids_json: ['user-tarek','user-yasser','user-khaled','user-mona'],               is_active: 1 },
  { id: 'group-finance',     name: 'Finance & Payroll Team',   code: 'FIN_TEAM',   member_user_ids_json: ['user-huda','user-mona'],                                            is_active: 1 },
  { id: 'group-it-techs',    name: 'IT Technical Support Group',code: 'IT_TECHS',   member_user_ids_json: ['user-ahmed','user-khaled'],                                         is_active: 1 },
  { id: 'group-mkt-team',    name: 'Marketing & Media Team',   code: 'MKT_TEAM',   member_user_ids_json: ['user-noha','user-omar','user-sherif'],                               is_active: 1 },
  { id: 'group-managers',    name: 'Department Managers',      code: 'DEPT_HEADS', member_user_ids_json: ['user-khaled','user-sara','user-mona','user-yasser','user-karim','user-sherif'], is_active: 1 },
  { id: 'group-executives',  name: 'Executive Board',          code: 'EXEC_BOARD', member_user_ids_json: ['user-mona','user-admin'],                                           is_active: 1 }
];

async function main() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'emacro',
    password: process.env.MYSQL_PASSWORD || 'emacro123',
    database: process.env.MYSQL_DATABASE || 'emacro_dashboard',
    connectionLimit: 5,
  });

  try {
    console.log('Connected to MySQL:', process.env.MYSQL_HOST || 'localhost');

    // Insert or update system_users
    for (const u of systemUsers) {
      const sql = `INSERT INTO system_users (id, name, email, department_id, group_ids_json, role, avatar_initials, job_title, direct_manager_id, unit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), department_id=VALUES(department_id), group_ids_json=VALUES(group_ids_json), role=VALUES(role), avatar_initials=VALUES(avatar_initials), job_title=VALUES(job_title), direct_manager_id=VALUES(direct_manager_id), unit=VALUES(unit), is_active=VALUES(is_active);`;
      const params = [u.id, u.name, u.email, u.department_id, JSON.stringify(u.group_ids_json), u.role, u.avatar_initials, u.job_title, u.direct_manager_id, u.unit, u.is_active];
      await pool.query(sql, params);
      console.log('OK user:', u.id);
    }

    // Insert or update business_groups
    for (const g of businessGroups) {
      const sql = `INSERT INTO business_groups (id, name, code, member_user_ids_json, is_active) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code), member_user_ids_json=VALUES(member_user_ids_json), is_active=VALUES(is_active);`;
      const params = [g.id, g.name, g.code, JSON.stringify(g.member_user_ids_json), g.is_active];
      await pool.query(sql, params);
      console.log('OK group:', g.id);
    }

    console.log('Seeding complete.');
  } catch (err) {
    console.error('SEED_ERROR:', err.message);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

main();
