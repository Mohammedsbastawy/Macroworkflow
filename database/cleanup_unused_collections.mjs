/**
 * cleanup_unused_collections.mjs
 * ==============================
 * Deletes the 7 unused collections from both Directus API (which drops the tables)
 * and PostgreSQL to ensure a clean database and Admin Panel.
 */

import { execSync } from 'child_process';

const DIRECTUS_URL = 'http://localhost:8055';
const DIRECTUS_TOKEN = 'workflow-engine-admin-static-token-2026';
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${DIRECTUS_TOKEN}`
};

// 7 collections to remove
const unusedCollections = [
  'doctype_fields',        // Drop first because it references doctype_definitions
  'doctype_definitions',
  'workflow_versions',
  'workflow_steps',
  'workflow_visibility',
  'ticket_tasks',
  'ticket_sla_logs'
];

async function cleanup() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  Cleaning Up Unused Collections in Directus');
  console.log('══════════════════════════════════════════════\n');

  for (const coll of unusedCollections) {
    console.log(`Removing collection: ${coll}...`);
    try {
      const res = await fetch(`${DIRECTUS_URL}/collections/${coll}`, {
        method: 'DELETE',
        headers
      });

      if (res.status === 204 || res.status === 200) {
        console.log(`  ✅ Successfully deleted ${coll} from Directus.`);
      } else {
        const text = await res.text();
        console.log(`  ℹ️  Directus response for ${coll}: status ${res.status} - ${text.slice(0, 150)}`);
      }
    } catch (err) {
      console.error(`  ✗ Error deleting ${coll} from Directus API:`, err.message);
    }
  }

  // Also execute SQL DROP TABLE to be 100% sure they are removed from PostgreSQL
  console.log('\n[2/2] Ensuring tables are dropped from PostgreSQL...');
  try {
    const dockerdPid = execSync("wsl -d docker-desktop -- pidof dockerd", { encoding: 'utf-8' }).trim();
    const dropSql = unusedCollections.map(table => `DROP TABLE IF EXISTS ${table} CASCADE;`).join(' ');
    
    const cmd = `nsenter -t ${dockerdPid} -m -u -i -n -p -- /usr/local/bin/psql -U emacro -d emacro_dashboard -c "${dropSql}"`;
    const sqlResult = execSync(`wsl -d docker-desktop -- sh -c "${cmd.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' });
    console.log('  ✅ PostgreSQL Drop Table commands executed.');
    console.log(sqlResult);
  } catch (err) {
    console.error('  ✗ PostgreSQL Drop error:', err.message);
  }

  console.log('\n🎉 Cleanup complete! Check your Directus Admin Panel.');
}

cleanup();
