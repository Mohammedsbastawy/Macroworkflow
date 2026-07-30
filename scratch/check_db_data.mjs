import { directusGet } from "../src/lib/directus/client.js";

async function main() {
  try {
    const policies = await directusGet("policies");
    console.log("POLICIES COUNT:", policies.length);
    for (const p of policies) {
      console.log(`- POLICY: ${p.name} (id: ${p.id}, active: ${p.is_active})`);
      if (p.rules_json) {
        console.log("  RULES:");
        p.rules_json.forEach((r, idx) => {
          console.log(`    [${idx}] ${r.name} (type: ${r.rule_type}, active: ${r.is_active})`);
          if (r.matrix_rows) {
            console.log("      MATRIX ROWS:", r.matrix_rows);
          }
        });
      }
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
