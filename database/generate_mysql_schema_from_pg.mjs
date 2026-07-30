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

function mapPgTypeToMysql(pgType, charMax, numPrec, numScale) {
  pgType = pgType.toLowerCase();
  if (pgType === 'uuid') return 'VARCHAR(36)';
  if (pgType === 'integer') return 'INT';
  if (pgType === 'bigint') return 'BIGINT';
  if (pgType === 'boolean') return 'TINYINT(1)';
  if (pgType === 'text') return 'TEXT';
  if (pgType.includes('character varying') || pgType === 'varchar') {
    return `VARCHAR(${charMax || 255})`;
  }
  if (pgType === 'numeric' || pgType === 'decimal') {
    return `DECIMAL(${numPrec || 15}, ${numScale || 2})`;
  }
  if (pgType.includes('timestamp') || pgType === 'date' || pgType === 'time') {
    return 'TIMESTAMP NULL';
  }
  if (pgType === 'jsonb' || pgType === 'json') {
    return 'JSON';
  }
  return 'VARCHAR(255)';
}

async function main() {
  console.log("══════════════════════════════════════════════");
  console.log("   PG to MySQL Automatic Schema Translator    ");
  console.log("══════════════════════════════════════════════\n");

  let schemaSql = "DROP DATABASE IF EXISTS emacro_dashboard;\nCREATE DATABASE emacro_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE emacro_dashboard;\n\n";

  for (const table of tables) {
    try {
      console.log(`Analyzing table structure for '${table}'...`);
      // Query column metadata from PostgreSQL as JSON
      const selectQuery = `SELECT coalesce(json_agg(t), '[]'::json) FROM (SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale, is_nullable FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position) t;`;
      const psqlCmd = `docker exec -i emacro_db psql -U emacro -d emacro_dashboard -A -t -c "${selectQuery}"`;
      const rawOutput = execSync(psqlCmd, { encoding: 'utf-8' }).trim();
      
      if (!rawOutput || rawOutput === '[]') {
        console.log(`  Table not found in PostgreSQL.`);
        continue;
      }

      const columns = JSON.parse(rawOutput).map(col => {
        return {
          name: col.column_name,
          type: col.data_type,
          charMax: col.character_maximum_length,
          numPrec: col.numeric_precision,
          numScale: col.numeric_scale,
          nullable: col.is_nullable === 'YES'
        };
      });

      let tableSql = `DROP TABLE IF EXISTS \`${table}\`;\nCREATE TABLE \`${table}\` (\n`;
      const columnDefs = columns.map(col => {
        let def = `  \`${col.name}\` ${mapPgTypeToMysql(col.type, col.charMax, col.numPrec, col.numScale)}`;
        if (col.name === 'id') {
          def += ' PRIMARY KEY';
        } else if (!col.nullable) {
          def += ' NOT NULL';
        }
        return def;
      });
      
      tableSql += columnDefs.join(',\n') + '\n);\n\n';
      schemaSql += tableSql;
      console.log(`  ✅ Schema generated for '${table}'.`);
    } catch (e) {
      console.error(`  ❌ Error processing '${table}':`, e.message);
    }
  }

  fs.writeFileSync('database/mysql_schema_init.sql', schemaSql, 'utf-8');
  console.log("\nGenerated 'database/mysql_schema_init.sql' successfully!");
}

main();
