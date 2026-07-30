import { execSync } from 'child_process';

async function main() {
  console.log("══════════════════════════════════════════════");
  console.log("      Directus System Tables Cleanup Tool     ");
  console.log("══════════════════════════════════════════════\n");

  try {
    // 1. Fetch all tables starting with directus_
    const showCmd = `docker exec -i emacro_mysql mysql -u root -prootpassword emacro_dashboard -e "show tables like 'directus_%';"`;
    const output = execSync(showCmd, { encoding: 'utf-8' }).trim();
    
    if (!output) {
      console.log("No Directus system tables found in the database. Schema is clean!");
      return;
    }

    const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
    // Remove header line
    const tablesToDrop = lines.slice(1);

    if (tablesToDrop.length === 0) {
      console.log("No Directus system tables found. Schema is clean!");
      return;
    }

    console.log(`Found ${tablesToDrop.length} Directus system tables to drop:`);
    console.log(tablesToDrop.join(', '));

    // 2. Drop tables cascadingly (disable constraints first)
    console.log("\nDropping tables...");
    let dropSql = "SET FOREIGN_KEY_CHECKS = 0;\n";
    for (const table of tablesToDrop) {
      dropSql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
    }
    dropSql += "SET FOREIGN_KEY_CHECKS = 1;\n";

    // Copy SQL to container and run
    const dropCmd = `docker exec -i emacro_mysql mysql -u root -prootpassword emacro_dashboard -e "${dropSql.replace(/\n/g, ' ')}"`;
    execSync(dropCmd, { encoding: 'utf-8' });

    console.log("✅ All Directus system tables dropped successfully!");
    
  } catch (err) {
    console.error("Error during cleanup:", err.message);
  }
}

main();
