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

const departments = [
  { id: 'dept-exec', name: 'Executive Board & CEO Office', code: 'EXEC', parent_department_id: null, head_user_id: 'user-mona' },
  { id: 'dept-it', name: 'IT & Technology Department', code: 'IT', parent_department_id: 'dept-exec', head_user_id: 'user-khaled' },
  { id: 'dept-hr', name: 'Human Resources (HR)', code: 'HR', parent_department_id: 'dept-exec', head_user_id: 'user-sara' },
  { id: 'dept-finance', name: 'Finance & Accounts Department', code: 'FIN', parent_department_id: 'dept-exec', head_user_id: 'user-mona' },
  { id: 'dept-procurement', name: 'Procurement Department', code: 'PROC', parent_department_id: 'dept-exec', head_user_id: 'user-yasser' },
  { id: 'dept-ops', name: 'Operations & Facilities', code: 'OPS', parent_department_id: 'dept-exec', head_user_id: 'user-karim' },
  { id: 'dept-mkt', name: 'Marketing & Digital Branding Department', code: 'MKT', parent_department_id: 'dept-exec', head_user_id: 'user-sherif' }
];

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

const travelZones = [
  { id: "zone-2", name: "أكتوبر", code: "PLACE_2", is_active: 1 },
  { id: "zone-3", name: "ابشواي", code: "PLACE_3", is_active: 1 },
  { id: "zone-4", name: "ابو المطامير", code: "PLACE_4", is_active: 1 },
  { id: "zone-5", name: "ابو حمص", code: "PLACE_5", is_active: 1 },
  { id: "zone-6", name: "ابو زعبل", code: "PLACE_6", is_active: 1 },
  { id: "zone-7", name: "ادفو", code: "PLACE_7", is_active: 1 },
  { id: "zone-8", name: "ادكو", code: "PLACE_8", is_active: 1 },
  { id: "zone-9", name: "ارياف امبابه", code: "PLACE_9", is_active: 1 },
  { id: "zone-10", name: "اسيوط", code: "PLACE_10", is_active: 1 },
  { id: "zone-11", name: "الاسكندرية", code: "PLACE_11", is_active: 1 },
  { id: "zone-12", name: "الاسماعيلية", code: "PLACE_12", is_active: 1 },
  { id: "zone-13", name: "الاقصر", code: "PLACE_13", is_active: 1 },
  { id: "zone-14", name: "البحيرة", code: "PLACE_14", is_active: 1 },
  { id: "zone-15", name: "البدرشين", code: "PLACE_15", is_active: 1 },
  { id: "zone-16", name: "البلينا", code: "PLACE_16", is_active: 1 },
  { id: "zone-17", name: "التبين", code: "PLACE_17", is_active: 1 },
  { id: "zone-18", name: "التجمع الخامس", code: "PLACE_18", is_active: 1 },
  { id: "zone-19", name: "الجمالية", code: "PLACE_19", is_active: 1 },
  { id: "zone-20", name: "الحمام", code: "PLACE_20", is_active: 1 },
  { id: "zone-21", name: "الحوامديه", code: "PLACE_21", is_active: 1 },
  { id: "zone-22", name: "الخانكة", code: "PLACE_22", is_active: 1 },
  { id: "zone-23", name: "الخصوص", code: "PLACE_23", is_active: 1 },
  { id: "zone-24", name: "الدقهلية", code: "PLACE_24", is_active: 1 },
  { id: "zone-25", name: "الدلنجات", code: "PLACE_25", is_active: 1 },
  { id: "zone-26", name: "الرحاب", code: "PLACE_26", is_active: 1 },
  { id: "zone-27", name: "الزقازيق", code: "PLACE_27", is_active: 1 },
  { id: "zone-28", name: "الساحل", code: "PLACE_28", is_active: 1 },
  { id: "zone-29", name: "الساحل الشمالي", code: "PLACE_29", is_active: 1 },
  { id: "zone-30", name: "السنبلاوين", code: "PLACE_30", is_active: 1 },
  { id: "zone-31", name: "السويس", code: "PLACE_31", is_active: 1 },
  { id: "zone-32", name: "الشرقية", code: "PLACE_32", is_active: 1 },
  { id: "zone-33", name: "الشروق", code: "PLACE_33", is_active: 1 },
  { id: "zone-34", name: "الصف", code: "PLACE_34", is_active: 1 },
  { id: "zone-35", name: "العاشر", code: "PLACE_35", is_active: 1 },
  { id: "zone-36", name: "العامرية", code: "PLACE_36", is_active: 1 },
  { id: "zone-37", name: "العبور", code: "PLACE_37", is_active: 1 },
  { id: "zone-38", name: "العياط", code: "PLACE_38", is_active: 1 },
  { id: "zone-39", name: "العين السخنه", code: "PLACE_39", is_active: 1 },
  { id: "zone-40", name: "الغربية", code: "PLACE_40", is_active: 1 },
  { id: "zone-41", name: "الغردقة", code: "PLACE_41", is_active: 1 },
  { id: "zone-42", name: "الفيوم", code: "PLACE_42", is_active: 1 },
  { id: "zone-43", name: "القاهرة", code: "PLACE_43", is_active: 1 },
  { id: "zone-44", name: "القليوبية", code: "PLACE_44", is_active: 1 },
  { id: "zone-45", name: "المحلة", code: "PLACE_45", is_active: 1 },
  { id: "zone-46", name: "المطرية (75ك م)", code: "PLACE_46", is_active: 1 },
  { id: "zone-47", name: "المعادي", code: "PLACE_47", is_active: 1 },
  { id: "zone-48", name: "المقطم", code: "PLACE_48", is_active: 1 },
  { id: "zone-49", name: "المنزلة", code: "PLACE_49", is_active: 1 },
  { id: "zone-50", name: "المنصورة", code: "PLACE_50", is_active: 1 },
  { id: "zone-51", name: "المنوفية", code: "PLACE_51", is_active: 1 },
  { id: "zone-52", name: "المنيا", code: "PLACE_52", is_active: 1 },
  { id: "zone-53", name: "الهرم", code: "PLACE_53", is_active: 1 },
  { id: "zone-54", name: "الوسطي", code: "PLACE_54", is_active: 1 },
  { id: "zone-55", name: "أسوان", code: "PLACE_55", is_active: 1 },
  { id: "zone-56", name: "أشمون", code: "PLACE_56", is_active: 1 },
  { id: "zone-57", name: "أيتاي", code: "PLACE_57", is_active: 1 },
  { id: "zone-58", name: "ببا", code: "PLACE_58", is_active: 1 },
  { id: "zone-59", name: "برج العرب", code: "PLACE_59", is_active: 1 },
  { id: "zone-60", name: "بلطيم", code: "PLACE_60", is_active: 1 },
  { id: "zone-61", name: "بلقاس", code: "PLACE_61", is_active: 1 },
  { id: "zone-62", name: "بن", code: "PLACE_62", is_active: 1 },
  { id: "zone-63", name: "بنها", code: "PLACE_63", is_active: 1 },
  { id: "zone-64", name: "بني سويف", code: "PLACE_64", is_active: 1 },
  { id: "zone-65", name: "بني مزار", code: "PLACE_65", is_active: 1 },
  { id: "zone-66", name: "بورسعيد", code: "PLACE_66", is_active: 1 },
  { id: "zone-67", name: "جرجا", code: "PLACE_67", is_active: 1 },
  { id: "zone-68", name: "حسينية", code: "PLACE_68", is_active: 1 },
  { id: "zone-69", name: "حلوان", code: "PLACE_69", is_active: 1 },
  { id: "zone-70", name: "حوش عيسي", code: "PLACE_70", is_active: 1 },
  { id: "zone-71", name: "دار السلام", code: "PLACE_71", is_active: 1 },
  { id: "zone-72", name: "دكرنس", code: "PLACE_72", is_active: 1 },
  { id: "zone-73", name: "دمنهور", code: "PLACE_73", is_active: 1 },
  { id: "zone-74", name: "دمياط", code: "PLACE_74", is_active: 1 },
  { id: "zone-75", name: "ديرمواس", code: "PLACE_75", is_active: 1 },
  { id: "zone-76", name: "ديروط", code: "PLACE_76", is_active: 1 },
  { id: "zone-77", name: "راس البر", code: "PLACE_77", is_active: 1 },
  { id: "zone-78", name: "راس غارب", code: "PLACE_78", is_active: 1 },
  { id: "zone-79", name: "رشيد", code: "PLACE_79", is_active: 1 },
  { id: "zone-80", name: "سفاجا", code: "PLACE_80", is_active: 1 },
  { id: "zone-81", name: "سمالوط", code: "PLACE_81", is_active: 1 },
  { id: "zone-82", name: "سنورس", code: "PLACE_82", is_active: 1 },
  { id: "zone-83", name: "سوهاج", code: "PLACE_83", is_active: 1 },
  { id: "zone-84", name: "شبرا الخيمة", code: "PLACE_84", is_active: 1 },
  { id: "zone-85", name: "شبين الكوم", code: "PLACE_85", is_active: 1 },
  { id: "zone-86", name: "شرق القاهره", code: "PLACE_86", is_active: 1 },
  { id: "zone-87", name: "شرم الشيخ", code: "PLACE_87", is_active: 1 },
  { id: "zone-88", name: "طما", code: "PLACE_88", is_active: 1 },
  { id: "zone-89", name: "طنطا", code: "PLACE_89", is_active: 1 },
  { id: "zone-90", name: "طهطا", code: "PLACE_90", is_active: 1 },
  { id: "zone-91", name: "فارسكور", code: "PLACE_91", is_active: 1 },
  { id: "zone-92", name: "فاقوس", code: "PLACE_92", is_active: 1 },
  { id: "zone-93", name: "فيصل", code: "PLACE_93", is_active: 1 },
  { id: "zone-94", name: "قنا", code: "PLACE_94", is_active: 1 },
  { id: "zone-95", name: "قوص", code: "PLACE_95", is_active: 1 },
  { id: "zone-96", name: "قوصية", code: "PLACE_96", is_active: 1 },
  { id: "zone-97", name: "كفر الدوار", code: "PLACE_97", is_active: 1 },
  { id: "zone-98", name: "كفر الشيخ", code: "PLACE_98", is_active: 1 },
  { id: "zone-99", name: "كوم حمادة", code: "PLACE_99", is_active: 1 },
  { id: "zone-100", name: "مدينة السلام", code: "PLACE_100", is_active: 1 },
  { id: "zone-101", name: "مدينة بدر", code: "PLACE_101", is_active: 1 },
  { id: "zone-102", name: "مدينتي", code: "PLACE_102", is_active: 1 },
  { id: "zone-103", name: "مرسى مطروح", code: "PLACE_103", is_active: 1 },
  { id: "zone-104", name: "مطوبس", code: "PLACE_104", is_active: 1 },
  { id: "zone-105", name: "مغاغة", code: "PLACE_105", is_active: 1 },
  { id: "zone-106", name: "ملوي", code: "PLACE_106", is_active: 1 },
  { id: "zone-107", name: "منية النصر", code: "PLACE_107", is_active: 1 },
  { id: "zone-108", name: "ميت غمر", code: "PLACE_108", is_active: 1 },
  { id: "zone-109", name: "نجع حمادي", code: "PLACE_109", is_active: 1 },
  { id: "zone-110", name: "نوبارية", code: "PLACE_110", is_active: 1 }
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

    // Insert or update Departments
    for (const d of departments) {
      const sql = `INSERT INTO departments (id, name, code, parent_department_id, head_user_id) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code), parent_department_id=VALUES(parent_department_id), head_user_id=VALUES(head_user_id);`;
      const params = [d.id, d.name, d.code, d.parent_department_id, d.head_user_id];
      await pool.query(sql, params);
      console.log('OK dept:', d.id);
    }

    // Insert or update Users
    for (const u of systemUsers) {
      const sql = `INSERT INTO system_users (id, name, email, department_id, group_ids_json, role, avatar_initials, job_title, direct_manager_id, unit, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), department_id=VALUES(department_id), group_ids_json=VALUES(group_ids_json), role=VALUES(role), avatar_initials=VALUES(avatar_initials), job_title=VALUES(job_title), direct_manager_id=VALUES(direct_manager_id), unit=VALUES(unit), is_active=VALUES(is_active);`;
      const params = [u.id, u.name, u.email, u.department_id, JSON.stringify(u.group_ids_json), u.role, u.avatar_initials, u.job_title, u.direct_manager_id, u.unit, u.is_active];
      await pool.query(sql, params);
      console.log('OK user:', u.id);
    }

    // Insert or update BusinessGroups
    for (const g of businessGroups) {
      const sql = `INSERT INTO business_groups (id, name, code, member_user_ids_json, is_active) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code), member_user_ids_json=VALUES(member_user_ids_json), is_active=VALUES(is_active);`;
      const params = [g.id, g.name, g.code, JSON.stringify(g.member_user_ids_json), g.is_active];
      await pool.query(sql, params);
      console.log('OK group:', g.id);
    }

    // Insert or update TravelZones
    for (const z of travelZones) {
      const sql = `INSERT INTO travel_zones (id, name, code, is_active) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), code=VALUES(code), is_active=VALUES(is_active);`;
      const params = [z.id, z.name, z.code, z.is_active];
      await pool.query(sql, params);
    }
    console.log('OK zones:', travelZones.length);

    console.log('Seeding complete.');
  } catch (err) {
    console.error('SEED_ERROR:', err.message);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

main();
