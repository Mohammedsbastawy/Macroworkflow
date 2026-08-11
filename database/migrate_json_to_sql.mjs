/**
 * migrate_json_to_sql.mjs
 * Reads .data/db.json and generates MySQL INSERT statements
 * to migrate local JSON data → Production MySQL on server.
 *
 * Usage: node database/migrate_json_to_sql.mjs
 * Output: database/migrate_data.sql
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbJsonPath = path.resolve(__dirname, '../.data/db.json');
const outputPath = path.resolve(__dirname, 'migrate_data.sql');

// ── Helpers ────────────────────────────────────────────────────────────────

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }
  return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function toMySqlDt(iso) {
  if (!iso) return 'NULL';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'NULL';
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    return `'${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}'`;
  } catch { return 'NULL'; }
}

// ── Read db.json ───────────────────────────────────────────────────────────

if (!fs.existsSync(dbJsonPath)) {
  console.error('ERROR: .data/db.json not found at', dbJsonPath);
  process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
const lines = [];

lines.push('-- ============================================================');
lines.push('-- Migration: .data/db.json → MySQL');
lines.push(`-- Generated: ${new Date().toISOString()}`);
lines.push('-- ============================================================');
lines.push('SET FOREIGN_KEY_CHECKS=0;');
lines.push('');

// ── Workflows ──────────────────────────────────────────────────────────────

const workflows = db.workflows || [];
lines.push(`-- Workflows (${workflows.length} rows)`);

for (const w of workflows) {
  const cols = [
    'WorkflowID', 'WorkflowName', 'WorkflowSlug', 'Category', 'Description',
    'Icon', 'Color', 'Version', 'PublishedVersion', 'SlaTotalHours',
    'ReactFlowGraphJson', 'FieldsJson', 'StepsJson', 'Status', 'IsArchived',
    'DateCreated', 'DateUpdated'
  ];
  const vals = [
    esc(w.id),
    esc(w.name),
    esc(w.slug),
    esc(w.category),
    esc(w.description),
    esc(w.icon),
    esc(w.color),
    esc(w.version ?? 1),
    esc(w.published_version ?? 1),
    esc(w.sla_total_hours ?? 48),
    w.react_flow_graph_json ? esc(w.react_flow_graph_json) : 'NULL',
    w.fields ? esc(w.fields) : 'NULL',
    w.steps ? esc(w.steps) : 'NULL',
    esc(w.status ?? 'published'),
    esc(w.is_archived ? 1 : 0),
    toMySqlDt(w.date_created),
    toMySqlDt(w.date_updated || w.date_created),
  ];
  lines.push(
    `INSERT INTO Workflows (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON DUPLICATE KEY UPDATE WorkflowName=VALUES(WorkflowName), DateUpdated=VALUES(DateUpdated);`
  );
}
lines.push('');

// ── Tickets (from requests) ────────────────────────────────────────────────

const requests = db.requests || [];
lines.push(`-- Tickets (${requests.length} rows)`);

for (const r of requests) {
  // requester_id in JSON is sometimes a name string, not a real UserID
  const reqUserId = r.requester_id || 'user-admin';
  const reqName   = r.requester_name || r.requester_id || '';

  const cols = [
    'TicketID', 'TicketNumber', 'WorkflowID', 'WorkflowVersion', 'WorkflowSnapshotJson',
    'RequesterUserID', 'RequesterName', 'Title', 'Priority', 'Status',
    'CurrentStepNodeID', 'CurrentStepOrder', 'CurrentAssigneesJson',
    'SubmittedAt', 'SlaDeadline', 'OlaDeadline',
    'OlaAccumulatedPauseMs', 'DateCreated', 'DateUpdated'
  ];
  const vals = [
    esc(r.id),
    esc(r.request_number),
    esc(r.workflow_id),
    esc(r.workflow_version ?? 1),
    r.workflow_version_snapshot ? esc(r.workflow_version_snapshot) : esc([]),
    esc(reqUserId),
    esc(reqName),
    esc(r.title),
    esc(r.priority ?? 'normal'),
    esc(r.status ?? 'pending'),
    r.current_step_node_id ? esc(r.current_step_node_id) : 'NULL',
    r.current_step_order != null ? esc(r.current_step_order) : 'NULL',
    r.current_assignees_json ? esc(r.current_assignees_json) : esc([]),
    toMySqlDt(r.submitted_at),
    toMySqlDt(r.sla_deadline),
    toMySqlDt(r.ola_deadline),
    esc(r.ola_accumulated_pause_ms ?? 0),
    toMySqlDt(r.date_created),
    toMySqlDt(r.date_updated || r.date_created),
  ];
  lines.push(
    `INSERT INTO Tickets (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON DUPLICATE KEY UPDATE Status=VALUES(Status), DateUpdated=VALUES(DateUpdated);`
  );
}
lines.push('');

// ── TicketValues (from request_values) ────────────────────────────────────

const requestValues = db.request_values || [];
lines.push(`-- TicketValues (${requestValues.length} rows)`);

for (const v of requestValues) {
  lines.push(
    `INSERT INTO TicketValues (TicketValueID, TicketID, FieldKey, ValueText, ValueNumber) VALUES (${esc(v.id)}, ${esc(v.request_id)}, ${esc(v.field_key)}, ${esc(v.value_text)}, ${v.value_number != null ? esc(v.value_number) : 'NULL'}) ON DUPLICATE KEY UPDATE ValueText=VALUES(ValueText);`
  );
}
lines.push('');

// ── ApprovalLog ────────────────────────────────────────────────────────────

const approvalLogs = db.approval_logs || [];
lines.push(`-- ApprovalLog (${approvalLogs.length} rows)`);

for (const l of approvalLogs) {
  const actorId   = l.actor_id   || 'system';
  const actorName = l.actor_name || l.actor_id || 'System';
  lines.push(
    `INSERT INTO ApprovalLog (ApprovalLogID, TicketID, StepNodeID, StepOrderSnapshot, ActorUserID, ActorUserName, Action, Comments, DecisionAt) VALUES (${esc(l.id)}, ${esc(l.request_id)}, ${l.workflow_step_node_id ? esc(l.workflow_step_node_id) : 'NULL'}, ${l.step_order_snapshot != null ? esc(l.step_order_snapshot) : 'NULL'}, ${esc(actorId)}, ${esc(actorName)}, ${esc(l.action)}, ${esc(l.comments)}, ${toMySqlDt(l.decision_at)}) ON DUPLICATE KEY UPDATE Action=VALUES(Action);`
  );
}
lines.push('');

lines.push('SET FOREIGN_KEY_CHECKS=1;');
lines.push('-- Migration complete.');

// ── Write output ───────────────────────────────────────────────────────────

fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');

console.log('✅ Migration SQL generated successfully!');
console.log(`📄 File: ${outputPath}`);
console.log(`📊 Summary:`);
console.log(`   Workflows:    ${workflows.length}`);
console.log(`   Tickets:      ${requests.length}`);
console.log(`   TicketValues: ${requestValues.length}`);
console.log(`   ApprovalLog:  ${approvalLogs.length}`);
console.log('');
console.log('Next steps:');
console.log('  1. scp database/migrate_data.sql bastawy@192.168.3.48:/tmp/migrate_data.sql');
console.log('  2. On server: sudo docker exec -i workflow-mysql mysql -u root -proot123password emacro_dashboard < /tmp/migrate_data.sql');
