import { execSync } from 'child_process';
import * as fs from 'fs';

const tables = [
  'departments',
  'system_users',
  'business_groups',
  'system_user_groups',
  'workflows',
  'tickets',
  'ticket_values',
  'ticket_observers',
  'ticket_assignees',
  'ticket_comments',
  'approval_log',
  'external_api_endpoints',
  'policies',
  'budgets',
  'travel_zones'
];

async function main() {
  console.log("══════════════════════════════════════════════");
  console.log("  PostgreSQL to MySQL Live Migration Engine   ");
  console.log("══════════════════════════════════════════════\n");
  
  let fullSql = "USE emacro_dashboard;\nSET FOREIGN_KEY_CHECKS = 0;\n";

  for (const table of tables) {
    try {
      console.log(`Reading table '${table}' from PostgreSQL...`);
      const psqlCmd = `docker exec -i emacro_db psql -U emacro -d emacro_dashboard -A -t -c "SELECT coalesce(json_agg(t), '[]'::json) FROM ${table} t;"`;
      const rawBuffer = execSync(psqlCmd, { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 });
      const rawJson = rawBuffer.toString('utf8').trim();
      const rows = JSON.parse(rawJson);
      
      if (rows.length === 0) {
        console.log(`  No rows to migrate.`);
        continue;
      }
      
      console.log(`  Found ${rows.length} rows. Generating inserts...`);
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (typeof val === 'object') {
            return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
          }
          if (typeof val === 'number') return val;
          return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
        });
        
        const updates = columns.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');
        const escapedCols = columns.map(c => `\`${c}\``).join(', ');
        fullSql += `INSERT INTO \`${table}\` (${escapedCols}) VALUES (${values.join(', ')}) ON DUPLICATE KEY UPDATE ${updates};\n`;
      }
    } catch (e) {
      console.error(`  ❌ Error reading ${table}:`, e.message);
    }
  }

  fullSql += "SET FOREIGN_KEY_CHECKS = 1;\n";

  // Write to temporary SQL file
  fs.writeFileSync('database/mysql_inserts.sql', fullSql, 'utf-8');
  console.log("\nGenerated 'database/mysql_inserts.sql' successfully.");
}

main();
