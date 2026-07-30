import { execSync } from 'child_process';

const sql = `
-- 1. Add description column to policies table
ALTER TABLE policies ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Seed default policies
INSERT INTO policies (id, name, department_id, description, is_active, rules_json) VALUES
('pol-dept-it', 'لائحة وسياسات قطاع تكنولوجيا المعلومات (IT Governance Policy)', 'dept-it', 'ضوابط طلب الأجهزة والمعدات والتراخيص وتصاريح الصيانة برمجياً', true, '[]'::jsonb),
('pol-dept-finance', 'لائحة الضوابط المالية والمصروفات النقدية (Financial Policy)', 'dept-finance', 'سياسات صرف العهد النقدية، السلف، والمصروفات النثرية في الشركة', true, '[]'::jsonb),
('pol-dept-hr', 'لائحة الاستحقاقات والموارد البشرية (HR Policy)', 'dept-hr', 'ضوابط وتصاريح التدريب الخارجي، السفر، والانتقالات الرسمية', true, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;
`;

try {
  console.log("Adding description column and seeding policies in PostgreSQL...");
  const output = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.trim()}"`, { encoding: 'utf-8' });
  console.log("SQL Output:\n" + output);

  console.log("Restarting directus_instance container...");
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  console.log("Directus container restarted successfully.");
} catch (err) {
  console.error("Error executing database update:", err.message);
}
