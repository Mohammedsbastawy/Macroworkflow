import { execSync } from 'child_process';

const url = 'http://localhost:8055';
const token = 'workflow-engine-admin-static-token-2026';
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

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

async function main() {
  console.log("=== Seeding system_users & business_groups via Directus REST API ===");

  for (const u of systemUsers) {
    const res = await fetch(`${url}/items/system_users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(u)
    });
    const data = await res.json();
    console.log(`User ${u.id}: status ${res.status}`);
    if (!res.ok) console.log("  Error:", JSON.stringify(data));
  }

  for (const g of businessGroups) {
    const res = await fetch(`${url}/items/business_groups`, {
      method: 'POST',
      headers,
      body: JSON.stringify(g)
    });
    const data = await res.json();
    console.log(`Group ${g.id}: status ${res.status}`);
    if (!res.ok) console.log("  Error:", JSON.stringify(data));
  }
}

main().catch(console.error);
