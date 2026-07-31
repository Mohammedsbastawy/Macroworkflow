MySQL migration & seed status

What was done (automated by assistant):
- Created a new idempotent MySQL seeder: seed_mysql.mjs
  - Location: workflow-engine/database/seed_mysql.mjs
  - Behavior: inserts/updates `system_users` and `business_groups` using INSERT ... ON DUPLICATE KEY UPDATE
  - The seeder reads .env.local in the project root for DB connection info (no external dotenv dependency required)
- Ran the seeder against the local MySQL instance using project .env.local credentials.
  - Result: system_users (13) and business_groups (6) confirmed inserted/updated.
- Verified app server at http://localhost:3000 responded (200) and re-ran a DB check to show core table counts.

Files left in repository requiring attention (Postgres/Directus specific):
- seed_sql.mjs (uses docker exec ... psql and ON CONFLICT syntax)
- test_sql_insert.mjs (psql)
- check_directus_colls_raw.mjs (psql)
- fix_directus_collections.mjs (psql / ON CONFLICT)
- register_collections*.mjs (psql)
- migrations/*.sql (some contain Postgres-specific ON CONFLICT or syntax)

Why these matter:
- They assume PostgreSQL (psql) or Directus internals. Running them as-is in a MySQL environment will fail or produce inconsistent state. To fully adopt MySQL as primary, these scripts should be converted or removed.

Recommended next steps (high-priority):
1) Convert remaining critical seed/migration scripts (those that use psql or ON CONFLICT) to MySQL equivalents or implement them as Node-based idempotent seeders using mysql2 (like seed_mysql.mjs).
2) Standardize a single DB init path (e.g., scripts/db/init_mysql.sh or scripts/db/init_mysql.js) that:
   - Applies mysql_schema_init.sql (only on fresh installs or when explicitly requested)
   - Applies migrations in order (MySQL SQL or via Node),
   - Runs idempotent seeders (like seed_mysql.mjs)
3) Remove or archive Postgres-specific scripts (or add a clear DEPRECATED header) to avoid accidental execution.
4) Rotate any credentials if those values are used in production or shared environments.

If you want, the assistant can:
- Convert and test each of the Postgres-based scripts to MySQL (I can do this incrementally). (Recommended)
- Create a single db/init_mysql.js to run schema + migrations + seeds in order.
- Remove/archive Postgres scripts and add warnings to their headers.

Next action choices:
- Convert all Postgres/psql scripts to MySQL equivalents (assistant will perform and test). [Recommended]
- Only create a unified init script (apply schema + run seed_mysql) and leave other scripts for later.
- Stop here and provide detailed manual instructions for the conversion and commands to run locally.

Reply with which of the above you want next, or say "Proceed with full conversion" and the assistant will start converting critical scripts now.