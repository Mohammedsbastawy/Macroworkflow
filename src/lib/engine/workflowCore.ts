/**
 * Workflow Core Engine — database BaaS Backend
 * 
 * All CRUD operations now go through database REST API.
 * Every function is async and talks to database as the single source of truth.
 */

import {
  WorkflowTemplateStore,
  RequestValueStore,
  normalizeWorkflow,
  normalizeTicket,
  normalizeApprovalLog,
  dbGet,
  dbGetOne,
  dbCreate,
  dbUpdate,
  dbDelete,
} from './store';
import { WorkflowStep, WorkflowFormField, WorkflowRequest, ApprovalLogEntry } from '@/types/workflow';
import { continueGraphWorkflow, startGraphWorkflow } from './workflowRuntime';

// ============================================================
//  Workflow Template CRUD
// ============================================================

/**
 * Get all active workflows from database, sorted by newest first.
 */
export async function getWorkflows(): Promise<WorkflowTemplateStore[]> {
  const rows = await dbGet('workflows', {}, '-date_created');
  return rows
    .map(normalizeWorkflow)
    .filter((w) => w.status !== 'archived' && (w as any).is_archived !== true);
}

/**
 * Get a single workflow by slug or id.
 */
export async function getWorkflowBySlug(slug: string): Promise<WorkflowTemplateStore | null> {
  // Try by slug first
  let rows = await dbGet('workflows', { slug: { _eq: slug } }, undefined, 1);
  if (rows.length === 0) {
    // Try by id
    rows = await dbGet('workflows', { id: { _eq: slug } }, undefined, 1);
  }
  if (rows.length === 0) return null;
  return normalizeWorkflow(rows[0]);
}

/**
 * Save (create or update) a workflow template in database.
 */
export async function saveWorkflowTemplate(
  templateData: Partial<WorkflowTemplateStore>
): Promise<WorkflowTemplateStore> {
  const slug = templateData.slug || (templateData.name
    ? templateData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : `wf-${Date.now()}`);

  const passedFields = templateData.fields || (templateData as any).fields_json;
  const passedSteps = templateData.steps || (templateData as any).steps_json;
  const passedGraph = templateData.react_flow_graph_json || (templateData as any).react_flow_graph;
  const passedVis = (templateData as any).visibility_rules || (templateData as any).visibility_rules_json;

  // Helper to merge existing record with update payload safely without wiping fields/steps
  const buildUpdatePayload = (existingRecord: any) => {
    return {
      name: templateData.name || existingRecord.name || 'Workflow',
      slug: slug || existingRecord.slug,
      category: templateData.category || existingRecord.category || 'General',
      description: templateData.description !== undefined ? templateData.description : existingRecord.description,
      icon: templateData.icon || existingRecord.icon || '⚡',
      color: templateData.color || existingRecord.color || '#4F46E5',
      version: templateData.version || existingRecord.version || 1,
      published_version: templateData.published_version || existingRecord.published_version || 1,
      sla_total_hours: templateData.sla_total_hours || existingRecord.sla_total_hours || 48,
      react_flow_graph_json: passedGraph !== undefined ? passedGraph : (existingRecord.react_flow_graph_json || null),
      visibility_rules_json: passedVis !== undefined ? passedVis : (existingRecord.visibility_rules_json || null),
      steps_json: passedSteps !== undefined ? passedSteps : (existingRecord.steps_json || []),
      fields_json: passedFields !== undefined ? passedFields : (existingRecord.fields_json || []),
      date_updated: new Date().toISOString(),
    };
  };

  // Check if workflow already exists by id
  if (templateData.id) {
    const existing = await dbGetOne('workflows', templateData.id);
    if (existing) {
      const updatePayload = buildUpdatePayload(existing);
      const updated = await dbUpdate('workflows', templateData.id, updatePayload);
      return normalizeWorkflow(updated);
    }
  }

  // Check by slug
  const bySlug = await dbGet('workflows', { slug: { _eq: slug } }, undefined, 1);
  if (bySlug.length > 0) {
    const updatePayload = buildUpdatePayload(bySlug[0]);
    const updated = await dbUpdate('workflows', bySlug[0].id, updatePayload);
    return normalizeWorkflow(updated);
  }

  // Create new
  const createPayload: Record<string, any> = {
    id: templateData.id || `wf_${slug}_${Date.now()}`,
    name: templateData.name || 'New Workflow',
    slug,
    category: templateData.category || 'General',
    description: templateData.description || 'Custom workflow process',
    icon: templateData.icon || '⚡',
    color: templateData.color || '#4F46E5',
    version: templateData.version || 1,
    published_version: templateData.published_version || 1,
    sla_total_hours: templateData.sla_total_hours || 48,
    react_flow_graph_json: passedGraph || null,
    visibility_rules_json: passedVis || null,
    steps_json: passedSteps || [],
    fields_json: passedFields || [],
    date_created: new Date().toISOString(),
    date_updated: new Date().toISOString(),
  };

  const created = await dbCreate('workflows', createPayload);
  return normalizeWorkflow(created);
}

/**
 * Delete / Archive a workflow template in database by id or slug.
 */
export async function deleteWorkflowTemplate(id: string): Promise<boolean> {
  // Try direct hard-delete from database DB first
  try {
    const res = await dbDelete('workflows', id);
    if (res) return true;
  } catch (e) {
    // Foreign key constraints on tickets table or REST API error
  }

  // Fallback: Soft-delete archive (set status = 'archived' & is_archived = true)
  try {
    await dbUpdate('workflows', id, {
      status: 'archived',
      is_archived: true,
      date_updated: new Date().toISOString(),
    });
    return true;
  } catch {
    const rows = await dbGet('workflows', { slug: { _eq: id } }, undefined, 1);
    if (rows.length > 0) {
      try {
        await dbDelete('workflows', rows[0].id);
        return true;
      } catch {}
      try {
        await dbUpdate('workflows', rows[0].id, {
          status: 'archived',
          is_archived: true,
          date_updated: new Date().toISOString(),
        });
        return true;
      } catch {}
    }
    return false;
  }
}

/**
 * Clone a workflow template in database.
 */
export async function cloneWorkflowTemplate(id: string): Promise<WorkflowTemplateStore | null> {
  // Fetch original
  let original = await dbGetOne<any>('workflows', id);
  if (!original) {
    const bySlug = await dbGet('workflows', { slug: { _eq: id } }, undefined, 1);
    if (bySlug.length === 0) return null;
    original = bySlug[0];
  }

  const timestamp = Date.now();
  const clonePayload = {
    name: `${original.name} (نسخة مُستنسخة)`,
    slug: `${original.slug}-copy-${timestamp.toString().slice(-4)}`,
    category: original.category,
    description: original.description,
    icon: original.icon,
    color: original.color,
    version: 1,
    published_version: 1,
    sla_total_hours: original.sla_total_hours,
    react_flow_graph_json: original.react_flow_graph_json,
    steps_json: original.steps_json || [],
    fields_json: original.fields_json || [],
    date_created: new Date().toISOString(),
    date_updated: new Date().toISOString(),
  };

  const created = await dbCreate('workflows', clonePayload);
  return normalizeWorkflow(created);
}

/**
 * Strict Ticket Privacy Access Validator
 * A ticket can ONLY be viewed by:
 * 1. The Requester (اللي عملها)
 * 2. Assigned Approver / Technician / Assigned Group (المسؤول/الفني)
 * 3. Observer / Watcher (المتابع CC)
 * 4. System Admin (أدمن النظام)
 */
export function canUserAccessTicket(
  user: { id?: string; name?: string; role?: string; email?: string } | null,
  ticket: WorkflowRequest
): boolean {
  if (!user) return true;

  const userId = (user.id || '').toLowerCase();
  const userRole = (user.role || '').toLowerCase();

  // 1. System Admin
  if (userRole.includes('admin') || userId.includes('admin')) return true;

  const userEmail = (user.email || '').toLowerCase();
  const userName = (user.name || '').toLowerCase();

  // 2. Requester
  const reqId = (ticket.requester_id || '').toLowerCase();
  if ((reqId && (reqId === userId || reqId === userEmail)) || (userName && userName === reqId)) {
    return true;
  }

  // 3. Assigned Approver / Technician / Group
  const assignees = (ticket.current_assignees_json || []).map((a) => a.toLowerCase());
  const isAssignedGroupOrUser = assignees.some(
    (a) => (userId && a.includes(userId)) || (userEmail && a.includes(userEmail)) || (userName && a.includes(userName)) || (userRole && a.includes(userRole))
  );
  const assignedTech = (ticket.assigned_user || '').toLowerCase();
  const currentApprover = (ticket.current_approver || '').toLowerCase();

  if (
    isAssignedGroupOrUser ||
    (assignedTech && (assignedTech === userId || assignedTech === userEmail || assignedTech === userName)) ||
    (currentApprover && (currentApprover === userId || currentApprover === userEmail || currentApprover === userName))
  ) {
    return true;
  }

  // 4. Observer / Watcher
  const observers = (ticket.observer_id || '').toLowerCase();
  if (
    (userId && observers.includes(userId)) ||
    (userEmail && observers.includes(userEmail)) ||
    (userName && observers.includes(userName))
  ) {
    return true;
  }

  // Access Denied!
  return false;
}

// ============================================================
//  Request / Ticket CRUD
// ============================================================

/**
 * Helpers: ticket requester / involved checks and observer persistence
 */
export function isTicketRequester(ticket: WorkflowRequest, userIdOrIdentifier?: string | null): boolean {
  if (!userIdOrIdentifier) return false;
  const uid = (userIdOrIdentifier || '').toLowerCase();
  const reqId = (ticket.requester_id || '').toLowerCase();
  const reqName = (ticket.requester_name || '').toLowerCase();
  return uid === reqId || uid === reqName;
}

export function isTicketInvolved(ticket: WorkflowRequest, user: { id?: string; name?: string; email?: string; role?: string } | string | null): boolean {
  if (!user) return false;
  const userId = typeof user === 'string' ? user.toLowerCase() : (user.id || '').toLowerCase();
  const userEmail = typeof user === 'string' ? user.toLowerCase() : (user.email || '').toLowerCase();
  const userName = typeof user === 'string' ? user.toLowerCase() : (user.name || '').toLowerCase();

  const assignees = (ticket.current_assignees_json || []).map((a) => String(a).toLowerCase());
  if (assignees.some((a) => a && (a.includes(userId) || a.includes(userEmail) || a.includes(userName)))) return true;

  const assignedUser = (ticket.assigned_user || '').toLowerCase();
  if (assignedUser && (assignedUser === userId || assignedUser === userEmail || assignedUser === userName)) return true;

  const currentApprover = (ticket.current_approver || '').toLowerCase();
  if (currentApprover && (currentApprover === userId || currentApprover === userEmail || currentApprover === userName)) return true;

  const observers = (ticket.observer_id || '').toLowerCase();
  if (observers && (userId && observers.includes(userId) || userEmail && observers.includes(userEmail) || userName && observers.includes(userName))) return true;

  return false;
}

/**
 * Persist observer entries into normalized ticket_observers table and update legacy observer_id string
 */
export async function addObserversToTicket(ticketId: string, observerIdentifiers: string[]) {
  if (!ticketId) return;
  const uniq = Array.from(new Set((observerIdentifiers || []).map((s) => String(s).trim()).filter(Boolean)));
  if (uniq.length === 0) return;

  // Insert each observer if not exists
  for (const obs of uniq) {
    try {
      const existing = await dbGet('ticket_observers', { ticket_id: { _eq: ticketId }, user_id: { _eq: obs } }, undefined, 1);
      if (!existing || existing.length === 0) {
        await dbCreate('ticket_observers', {
          id: `to_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ticket_id: ticketId,
          user_id: obs,
          added_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      // non-fatal
      console.warn('[addObserversToTicket insert error]', e);
    }
  }

  // Rebuild legacy comma-separated observer_id field for backward compatibility
  try {
    const rows = await dbGet('ticket_observers', { ticket_id: { _eq: ticketId } });
    const ids = (rows || []).map((r: any) => String(r.user_id)).filter(Boolean);
    const joined = ids.join(', ');
    try {
      await dbUpdate('tickets', ticketId, { observer_id: joined, date_updated: new Date().toISOString() });
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // ignore
  }
}


/**
 * Submit a new request (ticket) — creates ticket + EAV field values + audit log.
 * Automatically adds assigned Approvers to observer_id so they become watchers!
 */
export async function submitRequest(params: {
  workflowSlug: string;
  title: string;
  requesterId?: string;
  requesterName?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  formData: Record<string, any>;
}): Promise<{ request: WorkflowRequest; log: ApprovalLogEntry }> {
  // 1. Get workflow template from database
  const wf = await getWorkflowBySlug(params.workflowSlug);
  if (!wf) {
    throw new Error(`Workflow with slug "${params.workflowSlug}" not found in database`);
  }

  const reqNumber = `REQ-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const firstStep = wf.steps.find((s) => s.step_order === 1) || wf.steps[0];
  const firstNodeId = firstStep?.react_flow_node_id || 'node-step-1';
  const olaHours = firstStep?.ola_hours || 4;
  const olaDeadline = new Date(Date.now() + olaHours * 60 * 60 * 1000).toISOString();
  const slaDeadline = new Date(Date.now() + (wf.sla_total_hours || 48) * 60 * 60 * 1000).toISOString();

  const requester = params.requesterId || 'user-admin';
  const firstAssignee = firstStep?.assignee_value || 'Department Manager';

  // 1.5 Fetch requester details to support dynamic defaults
  const { fetchSystemUsersAction } = await import('@/app/actions/workflowActions');
  const allUsers = await fetchSystemUsersAction();
  const reqUserObj = allUsers.find((u: any) => 
    u.id === requester || 
    u.email?.toLowerCase().trim() === requester.toLowerCase().trim()
  );

  const requesterName = reqUserObj?.name || params.requesterName || params.requesterId || 'System User';
  const requesterDept = reqUserObj?.department_id || 'IT Department';

  // Resolve defaults from workflow config
  const panelCfg = (wf.visibility_rules as any)?.ticket_info_panel_config || (wf as any).visibility_rules_json?.ticket_info_panel_config || {};
  const cleanVal = (val: string) => {
    if (!val || val.includes("None")) return "";
    return val;
  };

  const defaultGroup = cleanVal(panelCfg.defaultAssignedGroup);
  const defaultUser = cleanVal(panelCfg.defaultAssignedUser);
  const defaultLocation = cleanVal(panelCfg.defaultLocation);
  const defaultUnit = cleanVal(panelCfg.defaultUnit);
  const defaultObservers = cleanVal(panelCfg.defaultObservers);
  const defaultCategory = cleanVal(panelCfg.defaultCategory);

  // Dynamic "Take from Requester details" mappings
  let resolvedLocation = defaultLocation;
  if (defaultLocation.toLowerCase().includes("take from requester")) {
    resolvedLocation = reqUserObj?.location_id || "";
  }
  let resolvedUnit = defaultUnit;
  if (defaultUnit.toLowerCase().includes("take from requester")) {
    resolvedUnit = reqUserObj?.unit || "";
  }
  let resolvedGroup = defaultGroup;
  if (defaultGroup.toLowerCase().includes("take from requester")) {
    resolvedGroup = reqUserObj?.department_id || "";
  }

  // 2. Create ticket in database
  const ticketId = `tck_${reqNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`;
  const ticketPayload = {
    id: ticketId,
    ticket_number: reqNumber,
    workflow_id: wf.id,
    workflow_version: wf.published_version,
    workflow_snapshot_json: wf.steps,
    requester_id: requester,
    requester_name: requesterName,
    requester_department_id: requesterDept,
    title: params.title || `${wf.name} — ${reqNumber}`,
    priority: params.priority || panelCfg.defaultPriority || 'normal',
    status: 'pending',
    current_step_node_id: firstNodeId,
    current_step_order: firstStep?.step_order || 1,
    current_assignees_json: [firstAssignee],
    assigned_group: resolvedGroup || '',
    assigned_user: defaultUser || '',
    location_id: resolvedLocation || '',
    unit: resolvedUnit || '',
    submitted_at: new Date().toISOString(),
    sla_deadline: slaDeadline,
    ola_deadline: olaDeadline,
    ola_accumulated_pause_ms: 0,
    date_created: new Date().toISOString(),
    date_updated: new Date().toISOString(),
  };

  const createdTicket = await dbCreate('tickets', ticketPayload);

  // 3. Create EAV field values in database
  const finalEavMap: Record<string, any> = {
    glpi_urgency: panelCfg.defaultUrgency || 'NORMAL',
    glpi_impact: panelCfg.defaultImpact || 'MEDIUM',
    glpi_category: defaultCategory || wf.category || 'General',
    glpi_location: resolvedLocation || reqUserObj?.location_id || '',
    glpi_unit: resolvedUnit || reqUserObj?.unit || '',
    glpi_assigned_group: resolvedGroup || '',
    glpi_assigned_user: defaultUser || '',
    glpi_cc: defaultObservers || '',
    ...params.formData
  };

  for (const [key, val] of Object.entries(finalEavMap)) {
    if (val === undefined || val === null || val === '') continue;
    await dbCreate('ticket_values', {
      id: `val_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticket_id: createdTicket.id || ticketId,
      field_key: key,
      value_text: typeof val === 'string' ? val : JSON.stringify(val),
      value_number: typeof val === 'number' ? val : (!isNaN(Number(val)) ? Number(val) : null),
    });
  }

  // 4. Create initial audit log entry
  const logPayload = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ticket_id: createdTicket.id || ticketId,
    step_node_id: firstNodeId,
    step_order_snapshot: 1,
    actor_id: params.requesterId || 'user_ahmed',
    actor_name: params.requesterName || params.requesterId || 'Ahmed Mohamed',
    action: 'submitted',
    comments: 'Request submitted and routed automatically to first approval step.',
    decision_at: new Date().toISOString(),
  };

  const createdLog = await dbCreate('approval_log', logPayload);

  // A visual workflow is a graph, not an ordered list. Traverse its trigger and
  // automatic nodes now, stopping only when an approval node needs a human.
  const runtime = await startGraphWorkflow(createdTicket, wf, finalEavMap);
  const runtimeTicket = runtime.handled ? runtime.ticket : createdTicket;

  // Persist initial observers to normalized ticket_observers table (if any)
  const initialObservers: string[] = [];
  if (defaultObservers) {
    initialObservers.push(...defaultObservers.split(',').map(s => s.trim()).filter(Boolean));
  }
  if (runtimeTicket.observer_id) {
    initialObservers.push(...runtimeTicket.observer_id.split(',').map((s: string) => s.trim()).filter(Boolean));
  }
  const uniqueObservers = Array.from(new Set(initialObservers));

  try {
    await addObserversToTicket(runtimeTicket.id || ticketId, uniqueObservers);
  } catch (e) {
    // Non-fatal — observer persistence should not block ticket creation
    console.warn('[addObserversToTicket failed]', e);
  }

  return {
    request: normalizeTicket(runtimeTicket),
    log: normalizeApprovalLog(createdLog),
  };
}

/**
 * Get all requests (tickets) with optional filter. Includes EAV values and approval logs.
 */
export async function getRequests(
  filter?: {
    requesterId?: string;
    assigneeId?: string;
    status?: string;
  },
  currentUser?: { id?: string; name?: string; role?: string; email?: string } | null
): Promise<{
  requests: WorkflowRequest[];
  valuesMap: Record<string, Record<string, any>>;
  logsMap: Record<string, ApprovalLogEntry[]>;
}> {
  // Build database filter
  const databaseFilter: Record<string, any> = {};
  if (filter?.status) databaseFilter.status = { _eq: filter.status };
  if (filter?.requesterId) databaseFilter.requester_id = { _eq: filter.requesterId };

  const ticketRows = await dbGet(
    'tickets',
    Object.keys(databaseFilter).length > 0 ? databaseFilter : undefined,
    '-date_created'
  );

  let requests = ticketRows.map(normalizeTicket);

  // Apply strict Ticket Privacy Filter if currentUser is provided
  if (currentUser) {
    requests = requests.filter((req) => canUserAccessTicket(currentUser, req));
  }

  // Build values map and logs map
  const valuesMap: Record<string, Record<string, any>> = {};
  const logsMap: Record<string, ApprovalLogEntry[]> = {};

  for (const req of requests) {
    // Fetch EAV values for this ticket
    const vals = await dbGet('ticket_values', { ticket_id: { _eq: req.id } });
    valuesMap[req.id] = vals.reduce((acc: Record<string, any>, curr: any) => {
      acc[curr.field_key] = curr.value_number != null ? curr.value_number : curr.value_text;
      return acc;
    }, {});

    // Fetch approval logs for this ticket
    const logs = await dbGet('approval_log', { ticket_id: { _eq: req.id } }, 'decision_at');
    logsMap[req.id] = logs.map(normalizeApprovalLog);
  }

  return { requests, valuesMap, logsMap };
}

/**
 * Get a single request (ticket) by id or ticket number, with full details.
 */
export async function getRequestById(
  id: string,
  currentUser?: { id?: string; name?: string; role?: string; email?: string } | null
): Promise<{
  request: WorkflowRequest;
  workflow: WorkflowTemplateStore;
  values: Record<string, any>;
  logs: ApprovalLogEntry[];
} | null> {
  // Try to find ticket by id
  let ticket = await dbGetOne<any>('tickets', id);
  if (!ticket) {
    // Try by ticket_number
    const byNumber = await dbGet('tickets', { ticket_number: { _eq: id } }, undefined, 1);
    if (byNumber.length === 0) return null;
    ticket = byNumber[0];
  }

  const request = normalizeTicket(ticket);

  // Enforce strict Ticket Privacy Filter
  if (currentUser && !canUserAccessTicket(currentUser, request)) {
    return null; // Access Denied (Forbidden)
  }

  // Get associated workflow
  let workflow: WorkflowTemplateStore;
  if (request.workflow_id) {
    const wfRow = await dbGetOne<any>('workflows', request.workflow_id);
    workflow = wfRow ? normalizeWorkflow(wfRow) : {
      id: request.workflow_id,
      name: 'Workflow Process',
      slug: 'process',
      category: 'General',
      description: '',
      icon: '⚡',
      color: '#4F46E5',
      version: 1,
      published_version: 1,
      steps: request.workflow_version_snapshot || [],
      fields: [],
      date_created: new Date().toISOString(),
    };
  } else {
    workflow = {
      id: '',
      name: 'Workflow Process',
      slug: 'process',
      category: 'General',
      description: '',
      icon: '⚡',
      color: '#4F46E5',
      version: 1,
      published_version: 1,
      steps: request.workflow_version_snapshot || [],
      fields: [],
      date_created: new Date().toISOString(),
    };
  }

  // Get EAV values
  const vals = await dbGet('ticket_values', { ticket_id: { _eq: ticket.id } });
  const values = vals.reduce((acc: Record<string, any>, curr: any) => {
    acc[curr.field_key] = curr.value_number != null ? curr.value_number : curr.value_text;
    return acc;
  }, {});

  // Get approval logs
  const logRows = await dbGet('approval_log', { ticket_id: { _eq: ticket.id } }, 'decision_at');
  const logs = logRows.map(normalizeApprovalLog);

  return { request, workflow, values, logs };
}

/**
 * Process an approval action (approve, reject, return for revision, RFI).
 */
export async function processApprovalAction(params: {
  requestId: string;
  actorName: string;
  action: 'approved' | 'rejected' | 'returned_for_revision' | 'rfi_sent';
  comments?: string;
}): Promise<{ request: WorkflowRequest; log: ApprovalLogEntry }> {
  // 1. Find ticket in database
  let ticket = await dbGetOne<any>('tickets', params.requestId);
  if (!ticket) {
    const byNumber = await dbGet('tickets', { ticket_number: { _eq: params.requestId } }, undefined, 1);
    if (byNumber.length === 0) {
      throw new Error(`Request ${params.requestId} not found in database`);
    }
    ticket = byNumber[0];
  }

  // Use the persisted canvas graph when available. Older workflows without a
  // graph continue through the legacy ordered-step engine below.
  const graphWorkflow = await dbGetOne<any>('workflows', ticket.workflow_id);
  if (graphWorkflow) {
    const runtime = await continueGraphWorkflow(ticket, graphWorkflow, params.action);
    if (runtime.handled) {
      const log = await dbCreate('approval_log', {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ticket_id: ticket.id,
        step_node_id: runtime.ticket.current_step_node_id,
        step_order_snapshot: runtime.ticket.current_step_order,
        actor_id: params.actorName || 'Approver',
        actor_name: params.actorName || 'Approver',
        action: params.action,
        comments: params.comments || `Action ${params.action} recorded.`,
        decision_at: new Date().toISOString(),
      });
      return { request: normalizeTicket(runtime.ticket), log: normalizeApprovalLog(log) };
    }
  }

  const steps = ticket.workflow_snapshot_json || [];
  const currentStepIdx = steps.findIndex(
    (s: any) => s.react_flow_node_id === ticket.current_step_node_id || s.step_order === ticket.current_step_order
  );

  let newStatus = ticket.status;
  let nextNodeId = ticket.current_step_node_id;
  let nextOrder = ticket.current_step_order;
  let newAssignees = ticket.current_assignees_json || [];
  let solvedAt: string | null = null;
  let closedAt: string | null = null;
  let olaDeadline = ticket.ola_deadline;

  if ((params.action as string) === 'cancelled') {
    newStatus = 'cancelled';
    closedAt = new Date().toISOString();
    newAssignees = [];
  } else if (params.action === 'rejected') {
    newStatus = 'rejected';
    closedAt = new Date().toISOString();
  } else if (params.action === 'returned_for_revision') {
    newStatus = 'draft';
  } else if (params.action === 'approved') {
    const nextStep = steps[currentStepIdx + 1];
    if (nextStep) {
      nextOrder = nextStep.step_order;
      nextNodeId = nextStep.react_flow_node_id;
      newAssignees = [nextStep.assignee_value || 'Next Manager'];
      const newOla = nextStep.ola_hours || 4;
      olaDeadline = new Date(Date.now() + newOla * 60 * 60 * 1000).toISOString();
    } else {
      // Final approval!
      newStatus = 'approved';
      solvedAt = new Date().toISOString();
      newAssignees = [];
    }
  }

  // Combine existing observers with acting approver and new assignees
  const currentObservers = (ticket.observer_id || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const updatedObservers = Array.from(new Set([
    ...currentObservers,
    params.actorName,
    ...newAssignees
  ])).filter(Boolean).join(', ');

  // 2. Update ticket in database
  const ticketUpdate: Record<string, any> = {
    status: newStatus,
    current_step_node_id: nextNodeId,
    current_step_order: nextOrder,
    current_assignees_json: newAssignees,
    observer_id: updatedObservers,
    ola_deadline: olaDeadline,
    date_updated: new Date().toISOString(),
  };
  if (solvedAt) ticketUpdate.solved_at = solvedAt;
  if (closedAt) ticketUpdate.closed_at = closedAt;

  const updatedTicket = await dbUpdate('tickets', ticket.id, ticketUpdate);

  // 3. Create approval log entry
  const logPayload = {
    ticket_id: ticket.id,
    step_node_id: nextNodeId,
    step_order_snapshot: nextOrder,
    actor_id: params.actorName || 'Approver',
    actor_name: params.actorName || 'Approver',
    action: params.action,
    comments: params.comments || `Action ${params.action} recorded.`,
    decision_at: new Date().toISOString(),
  };

  const createdLog = await dbCreate('approval_log', logPayload);


  // Persist actor and new assignees as observers for normalized queries
  try {
    await addObserversToTicket(updatedTicket.id, Array.from(new Set([String(params.actorName), ...(newAssignees || [])])));
  } catch (e) {
    console.warn('[addObserversToTicket after approval failed]', e);
  }

  return {
    request: normalizeTicket(updatedTicket),
    log: normalizeApprovalLog(createdLog),
  };
}


