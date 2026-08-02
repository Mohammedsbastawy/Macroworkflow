/**
 * Store Layer — database BaaS Backend
 * 
 * This module previously used local `.data/db.json` for persistence.
 * Now all data flows through database REST API as the single source of truth.
 * 
 * Interfaces are kept for TypeScript compatibility across the app.
 */

import { WorkflowStep, WorkflowFormField, WorkflowRequest, ApprovalLogEntry } from '@/types/workflow';
export { dbGet, dbGetOne, dbCreate, dbUpdate, dbDelete } from '@/lib/db/mysqlClient';

// ─── TypeScript Interfaces (unchanged) ───────────────────────────

export interface WorkflowTemplateStore {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  version: number;
  published_version: number;
  sla_total_hours?: number;
  sla_breach_action?: string;
  react_flow_graph_json?: any;
  steps: WorkflowStep[];
  fields: WorkflowFormField[];
  date_created: string;
  visibility_rules?: {
    is_global: boolean;
    department_ids: string[];
    group_ids: string[];
    user_ids: string[];
  };
  // database-specific fields
  status?: string;
  is_archived?: boolean;
  steps_json?: WorkflowStep[];
  fields_json?: WorkflowFormField[];
}

export interface RequestValueStore {
  id: string;
  request_id?: string;
  ticket_id?: string;
  field_key: string;
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_json?: any;
}

/**
 * Normalize a database workflow row into our app's WorkflowTemplateStore shape.
 * database stores steps/fields in `steps_json` and `fields_json` JSONB columns.
 */
export function normalizeWorkflow(raw: any): WorkflowTemplateStore {
  return {
    id: raw.id,
    name: raw.name || 'Untitled',
    slug: raw.slug || '',
    category: raw.category || 'General',
    description: raw.description || '',
    icon: raw.icon || '⚡',
    color: raw.color || '#4F46E5',
    version: raw.version || 1,
    published_version: raw.published_version || 1,
    sla_total_hours: raw.sla_total_hours || 48,
    sla_breach_action: raw.sla_breach_action,
    react_flow_graph_json: raw.react_flow_graph_json,
    visibility_rules: raw.visibility_rules_json || raw.visibility_rules || { is_global: true, department_ids: [], group_ids: [], user_ids: [] },
    steps: raw.steps_json || raw.steps || [],
    fields: raw.fields_json || raw.fields || [],
    date_created: raw.date_created || new Date().toISOString(),
  };
}

/**
 * Normalize a database ticket row into our app's WorkflowRequest shape.
 */
export function normalizeTicket(raw: any): WorkflowRequest {
  return {
    id: raw.id,
    request_number: raw.ticket_number || raw.request_number || '',
    workflow_id: raw.workflow_id || '',
    workflow_version: raw.workflow_version || 1,
    workflow_version_snapshot: raw.workflow_snapshot_json || raw.workflow_version_snapshot || [],
    requester_id: raw.requester_id || '',
    title: raw.title || '',
    priority: raw.priority || 'normal',
    status: raw.status || 'pending',
    current_step_node_id: raw.current_step_node_id,
    current_step_order: raw.current_step_order || 1,
    current_assignees_json: raw.current_assignees_json || [],
    submitted_at: raw.submitted_at,
    sla_deadline: raw.sla_deadline,
    ola_deadline: raw.ola_deadline,
    ola_clock_paused_at: raw.ola_clock_paused_at,
    ola_accumulated_pause_ms: raw.ola_accumulated_pause_ms || 0,
    completed_at: raw.solved_at || raw.completed_at,
    date_created: raw.date_created || new Date().toISOString(),
    date_updated: raw.date_updated || new Date().toISOString(),

    // GLPI 7-Module Extended Fields
    type: raw.type || 'request',
    attachments: raw.attachments || [],
    subcategory_id: raw.subcategory_id || '',
    impact: raw.impact || 'medium',
    urgency: raw.urgency || 'medium',
    location_id: raw.location_id || '',
    requester_department: raw.requester_department || raw.requester_department_id || '',
    observer_id: raw.observer_id || '',
    pending_reason: raw.pending_reason || '',
    sla_tto_deadline: raw.sla_tto_deadline || null,
    sla_ttr_deadline: raw.sla_ttr_deadline || raw.sla_deadline || null,
    time_spent: raw.time_spent || 0,
    approval_status: raw.approval_status || 'none',
    current_approver: raw.current_approver || '',
    solution_type: raw.solution_type || '',
    solution_description: raw.solution_description || '',
    assigned_group: raw.assigned_group || '',
    assigned_user: raw.assigned_user || '',
    solved_date: raw.solved_date || raw.solved_at || null,
    // Workflow Target Audience (Target Business Groups / Target Departments)
    target_group_ids: raw.target_group_ids_json || [],
    target_department_ids: raw.target_department_ids_json || [],
  };
}

/**
 * Normalize a database approval_log row into our app's ApprovalLogEntry shape.
 */
export function normalizeApprovalLog(raw: any): ApprovalLogEntry {
  let comments = raw.comments || '';
  let metadata: Record<string, any> | undefined = undefined;
  // Check if the last line of comments is a hidden JSON attachment payload
  if (comments) {
    const lines = comments.split('\n');
    const lastLine = lines[lines.length - 1].trim();
    if (lastLine.startsWith('{"_attachments":') || lastLine.startsWith('{"attachments":')) {
      try {
        const parsed = JSON.parse(lastLine);
        if (parsed._attachments || parsed.attachments) {
          metadata = { attachments: parsed._attachments || parsed.attachments };
          comments = lines.slice(0, -1).join('\n');
        }
      } catch (e) {
        // Not a valid JSON payload, treat as normal text
      }
    }
  }
  return {
    id: raw.id,
    request_id: raw.ticket_id || raw.request_id || '',
    workflow_step_node_id: raw.step_node_id || raw.workflow_step_node_id,
    step_order_snapshot: raw.step_order_snapshot,
    actor_id: raw.actor_id || raw.actor_name || '',
    action: raw.action || 'submitted',
    comments: comments,
    decision_at: raw.decision_at || new Date().toISOString(),
    ola_elapsed_ms: raw.ola_elapsed_ms,
    is_internal: raw.is_internal === true || raw.is_internal === 1 || raw.action === 'internal_note',
    metadata_json: metadata || raw.metadata_json,
  };
}

