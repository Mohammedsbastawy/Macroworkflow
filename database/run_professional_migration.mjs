/**
 * run_professional_migration.mjs
 * ================================
 * Runs SQL migration in ONE docker exec call, then registers
 * new collections in Directus via REST API.
 *
 * Usage: node database/run_professional_migration.mjs
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────
const DB_CONTAINER   = 'emacro_db';
const DB_USER        = 'emacro';
const DB_NAME        = 'emacro_dashboard';
const DIRECTUS_URL   = 'http://localhost:8055';
const DIRECTUS_TOKEN = 'workflow-engine-admin-static-token-2026';
const MIGRATION_FILE = join(__dirname, 'migrations', '20260729_professional_restructure.sql');

// ── Step 1: Run entire SQL file in ONE call ──────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('  Step 1: Running SQL Migration (single call)');
console.log('══════════════════════════════════════════════');

try {
  // Copy SQL file into container, then execute it
  execSync(`docker cp "${MIGRATION_FILE}" ${DB_CONTAINER}:/tmp/migration.sql`, { encoding: 'utf-8' });
  const result = execSync(
    `docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -f /tmp/migration.sql`,
    { encoding: 'utf-8' }
  );
  console.log(result);
  console.log('  ✅ SQL Migration complete!');
} catch (e) {
  console.error('  ✗ SQL Error:', e.stderr || e.message);
  process.exit(1);
}

// ── Step 2: Register New Collections in Directus ────────────────
console.log('\n══════════════════════════════════════════════');
console.log('  Step 2: Registering Collections in Directus');
console.log('══════════════════════════════════════════════');

async function directusPost(path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DIRECTUS_TOKEN}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.text() };
}

const newCollections = [
  {
    collection: 'system_user_groups',
    meta: { icon: 'group', note: 'M2M junction — User ↔ Group memberships' },
    schema: { name: 'system_user_groups' },
    fields: [
      { field: 'id',        type: 'uuid',      schema: { is_primary_key: true, has_auto_increment: false }, meta: { hidden: true } },
      { field: 'user_id',   type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'group_id',  type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'joined_at', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime' } },
    ],
  },
  {
    collection: 'ticket_observers',
    meta: { icon: 'visibility', note: 'Users watching/observing a ticket' },
    schema: { name: 'ticket_observers' },
    fields: [
      { field: 'id',        type: 'uuid',      schema: { is_primary_key: true, has_auto_increment: false }, meta: { hidden: true } },
      { field: 'ticket_id', type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'user_id',   type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'added_at',  type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime' } },
    ],
  },
  {
    collection: 'ticket_assignees',
    meta: { icon: 'assignment_ind', note: 'Current step assignees per ticket' },
    schema: { name: 'ticket_assignees' },
    fields: [
      { field: 'id',           type: 'uuid',      schema: { is_primary_key: true, has_auto_increment: false }, meta: { hidden: true } },
      { field: 'ticket_id',    type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'user_id',      type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'group_id',     type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'role_code',    type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'step_node_id', type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'assigned_at',  type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime' } },
    ],
  },
  {
    collection: 'ticket_comments',
    meta: { icon: 'comment', note: 'Internal notes and public comments on tickets' },
    schema: { name: 'ticket_comments' },
    fields: [
      { field: 'id',           type: 'uuid',      schema: { is_primary_key: true, has_auto_increment: false }, meta: { hidden: true } },
      { field: 'ticket_id',    type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'author_id',    type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'author_name',  type: 'string',    schema: {}, meta: { interface: 'input' } },
      { field: 'type',         type: 'string',    schema: { default_value: 'public' }, meta: { interface: 'select-dropdown', options: { choices: [{ text: 'Public', value: 'public' }, { text: 'Internal', value: 'internal' }] } } },
      { field: 'content',      type: 'text',      schema: {}, meta: { interface: 'input-multiline' } },
      { field: 'date_created', type: 'timestamp', schema: { default_value: 'now()' }, meta: { interface: 'datetime', readonly: true } },
    ],
  },
];

for (const coll of newCollections) {
  const res = await directusPost('/collections', coll);
  if (res.status === 200 || res.status === 201) {
    console.log(`  ✅ Registered: ${coll.collection}`);
  } else if (res.body.includes('already exists') || res.body.includes('UNIQUE')) {
    console.log(`  ⏭️  Already exists: ${coll.collection}`);
  } else {
    console.error(`  ✗ Failed: ${coll.collection} → ${res.body.slice(0, 200)}`);
  }
}

// ── Step 3: Register Directus Relations ─────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('  Step 3: Registering Directus Relations');
console.log('══════════════════════════════════════════════');

const relations = [
  { collection: 'tickets',            field: 'requester_id',            related_collection: 'system_users'    },
  { collection: 'tickets',            field: 'requester_department_id', related_collection: 'departments'     },
  { collection: 'ticket_values',      field: 'ticket_id',               related_collection: 'tickets'         },
  { collection: 'approval_log',       field: 'ticket_id',               related_collection: 'tickets'         },
  { collection: 'ticket_comments',    field: 'ticket_id',               related_collection: 'tickets'         },
  { collection: 'ticket_observers',   field: 'ticket_id',               related_collection: 'tickets'         },
  { collection: 'ticket_assignees',   field: 'ticket_id',               related_collection: 'tickets'         },
  { collection: 'budgets',            field: 'department_id',           related_collection: 'departments'     },
  { collection: 'policies',           field: 'department_id',           related_collection: 'departments'     },
  { collection: 'system_user_groups', field: 'user_id',                 related_collection: 'system_users'   },
  { collection: 'system_user_groups', field: 'group_id',                related_collection: 'business_groups'},
];

for (const rel of relations) {
  const body = {
    collection: rel.collection,
    field: rel.field,
    related_collection: rel.related_collection,
    meta: { many_collection: rel.collection, many_field: rel.field, one_collection: rel.related_collection },
  };
  const res = await directusPost('/relations', body);
  if (res.status === 200 || res.status === 201) {
    console.log(`  ✅ Relation: ${rel.collection}.${rel.field} → ${rel.related_collection}`);
  } else if (res.body.includes('already exists') || res.body.includes('UNIQUE')) {
    console.log(`  ⏭️  Already set: ${rel.collection}.${rel.field} → ${rel.related_collection}`);
  } else {
    console.error(`  ✗ Failed: ${rel.collection}.${rel.field} → ${res.body.slice(0, 150)}`);
  }
}

console.log('\n══════════════════════════════════════════════');
console.log('  🎉 All Done!');
console.log('══════════════════════════════════════════════\n');
