import { execSync } from 'child_process';

const sql = `
ALTER TABLE policies ADD COLUMN IF NOT EXISTS rules_json JSONB DEFAULT '[]'::jsonb;
`;

try {
  console.log("Adding rules_json column to policies table in PostgreSQL...");
  const output = execSync(`docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.trim()}"`, { encoding: 'utf-8' });
  console.log("SQL Output:\n" + output);

  console.log("Restarting directus_instance container to refresh schema...");
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  console.log("Directus container restarted successfully.");
} catch (err) {
  console.error("Error executing database update:", err.message);
}
