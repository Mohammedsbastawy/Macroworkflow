import { execSync } from 'child_process';

const sql = `
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_parent_department_id_fkey;
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_department_id_fkey;
ALTER TABLE directus_users DROP CONSTRAINT IF EXISTS directus_users_department_id_fkey;
ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_department_id_fkey;

ALTER TABLE departments ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE departments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE departments ALTER COLUMN parent_department_id TYPE VARCHAR(255);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_user_id VARCHAR(255);

ALTER TABLE budgets ALTER COLUMN department_id TYPE VARCHAR(255);
ALTER TABLE directus_users ALTER COLUMN department_id TYPE VARCHAR(255);
ALTER TABLE policies ALTER COLUMN department_id TYPE VARCHAR(255);

ALTER TABLE departments ADD CONSTRAINT departments_parent_department_id_fkey FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE budgets ADD CONSTRAINT budgets_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;
ALTER TABLE directus_users ADD CONSTRAINT directus_users_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE policies ADD CONSTRAINT policies_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
`;

try {
  console.log("Updating departments table schema in Postgres...");
  const cmd = `docker exec -i emacro_db psql -U emacro -d emacro_dashboard -c "${sql.replace(/\n/g, ' ')}"`;
  const output = execSync(cmd, { encoding: 'utf-8' });
  console.log("SQL Output:\n" + output);
} catch (err) {
  console.error("SQL Error:", err.message);
}
