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
import { NotificationEventType } from '@/lib/notifications/types';
import { continueGraphWorkflow, startGraphWorkflow, resolveAssignee } from './workflowRuntime';
import { SYSTEM_USERS, BUSINESS_GROUPS } from './iamStore';
import { notify } from '@/lib/notifications/notifier';

// ============================================================
//  Workflow Template CRUD
// ============================================================

/**
 * Get all active workflows from database, sorted by newest first.
 */
export async function getWorkflows(): Promise<WorkflowTemplateStore[]> {
  const rows = await dbGet('Workflows', {}, '-DateCreated');
  return rows
    .map(normalizeWorkflow)
    .filter((w) => w.status !== 'archived' && (w as any).is_archived !== true);
}

/**
 * Get a single workflow by slug or id.
 */
export async function getWorkflowBySlug(slug: string): Promise<WorkflowTemplateStore | null> {
  // Try by slug first
  let rows = await dbGet('Workflows', { WorkflowSlug: { _eq: slug } }, undefined, 1);
  if (rows.length === 0) {
    // Try by id
    rows = await dbGet('Workflows', { WorkflowID: { _eq: slug } }, undefined, 1);
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
      WorkflowName: templateData.name || existingRecord.WorkflowName || existingRecord.name || 'Workflow',
      WorkflowSlug: slug || existingRecord.WorkflowSlug || existingRecord.slug,
      Category: templateData.category || existingRecord.Category || existingRecord.category || 'General',
      Description: templateData.description !== undefined ? templateData.description : (existingRecord.Description ?? existingRecord.description),
      Icon: templateData.icon || existingRecord.Icon || existingRecord.icon || '⚡',
      Color: templateData.color || existingRecord.Color || existingRecord.color || '#4F46E5',
      Version: templateData.version || existingRecord.Version || existingRecord.version || 1,
      PublishedVersion: templateData.published_version || existingRecord.PublishedVersion || existingRecord.published_version || 1,
      SlaTotalHours: templateData.sla_total_hours || existingRecord.SlaTotalHours || existingRecord.sla_total_hours || 48,
      ReactFlowGraphJson: passedGraph !== undefined ? passedGraph : (existingRecord.ReactFlowGraphJson || existingRecord.react_flow_graph_json || null),
      VisibilityRulesJson: passedVis !== undefined ? passedVis : (existingRecord.VisibilityRulesJson || existingRecord.visibility_rules_json || existingRecord.visibility_rules || null),
      StepsJson: passedSteps !== undefined ? passedSteps : (existingRecord.StepsJson || existingRecord.steps_json || existingRecord.steps || []),
      FieldsJson: passedFields !== undefined ? passedFields : (existingRecord.FieldsJson || existingRecord.fields_json || existingRecord.fields || []),
      DateUpdated: new Date().toISOString(),
    };
  };

  // Check if workflow already exists by id
  if (templateData.id) {
    const existing = await dbGetOne('Workflows', templateData.id);
    if (existing) {
      const updatePayload = buildUpdatePayload(existing);
      const updated = await dbUpdate('Workflows', templateData.id, updatePayload);
      return normalizeWorkflow(updated);
    }
  }

  // Check by slug
  const bySlug = await dbGet('Workflows', { WorkflowSlug: { _eq: slug } }, undefined, 1);
  if (bySlug.length > 0) {
    const updatePayload = buildUpdatePayload(bySlug[0]);
    const updated = await dbUpdate('Workflows', bySlug[0].WorkflowID, updatePayload);
    return normalizeWorkflow(updated);
  }

  // Create new
  const createPayload: Record<string, any> = {
    WorkflowID: templateData.id || `wf_${slug}_${Date.now()}`,
    WorkflowName: templateData.name || 'New Workflow',
    WorkflowSlug: slug,
    Category: templateData.category || 'General',
    Description: templateData.description || 'Custom workflow process',
    Icon: templateData.icon || '⚡',
    Color: templateData.color || '#4F46E5',
    Version: templateData.version || 1,
    PublishedVersion: templateData.published_version || 1,
    SlaTotalHours: templateData.sla_total_hours || 48,
    ReactFlowGraphJson: passedGraph || null,
    VisibilityRulesJson: passedVis || null,
    StepsJson: passedSteps || [],
    FieldsJson: passedFields || [],
    DateCreated: new Date().toISOString(),
    DateUpdated: new Date().toISOString(),
  };

  const created = await dbCreate('Workflows', createPayload);
  return normalizeWorkflow(created);
}

/**
 * Delete / Archive a workflow template in database by id or slug.
 */
export async function deleteWorkflowTemplate(id: string): Promise<boolean> {
  // Try direct hard-delete from database DB first
  try {
    const res = await dbDelete('Workflows', id);
    if (res) return true;
  } catch (e) {
    // Foreign key constraints on tickets table or REST API error
  }

  // Fallback: Soft-delete archive (set status = 'archived' & is_archived = true)
  try {
    await dbUpdate('Workflows', id, {
      Status: 'archived',
      IsArchived: true,
      DateUpdated: new Date().toISOString(),
    });
    return true;
  } catch {
    const rows = await dbGet('Workflows', { WorkflowSlug: { _eq: id } }, undefined, 1);
    if (rows.length > 0) {
      try {
        await dbDelete('Workflows', rows[0].WorkflowID);
        return true;
      } catch {}
      try {
        await dbUpdate('Workflows', rows[0].WorkflowID, {
          Status: 'archived',
          IsArchived: true,
          DateUpdated: new Date().toISOString(),
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
  let original = await dbGetOne<any>('Workflows', id);
  if (!original) {
    const bySlug = await dbGet('Workflows', { WorkflowSlug: { _eq: id } }, undefined, 1);
    if (bySlug.length === 0) return null;
    original = bySlug[0];
  }

  const timestamp = Date.now();
  const clonePayload = {
    WorkflowName: `${original.WorkflowName} (نسخة مُستنسخة)`,
    WorkflowSlug: `${original.WorkflowSlug}-copy-${timestamp.toString().slice(-4)}`,
    Category: original.Category,
    Description: original.Description,
    Icon: original.Icon,
    Color: original.Color,
    Version: 1,
    PublishedVersion: 1,
    SlaTotalHours: original.SlaTotalHours,
    ReactFlowGraphJson: original.ReactFlowGraphJson,
    StepsJson: original.StepsJson || [],
    FieldsJson: original.FieldsJson || [],
    DateCreated: new Date().toISOString(),
    DateUpdated: new Date().toISOString(),
  };

  const created = await dbCreate('Workflows', clonePayload);
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

  // Loose substring match so display names that include job titles (e.g. "Huda Adel (Accounts Staff)")
  // still resolve to the user by id/email/name even when they differ slightly.
  const involvedIn =
    (val: string) =>
      (userId && val.includes(userId)) ||
      (userEmail && val.includes(userEmail)) ||
      (userName && val.includes(userName));

  if (
    isAssignedGroupOrUser ||
    (assignedTech && involvedIn(assignedTech)) ||
    (currentApprover && involvedIn(currentApprover))
  ) {
    return true;
  }

  // 3.5. Match Assigned Group Membership
  const ticketGroup = (ticket.assigned_group || '').toLowerCase();
  if (ticketGroup && userInBusinessGroup(user, ticketGroup)) {
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

  // 5. Workflow Target Audience gate (Target Business Groups / Target Departments)
  // A non-involved user may only view the ticket if the workflow is restricted to
  // a Target Business Group / Target Department that the user belongs to.
  const targetGroups = ticket.target_group_ids || [];
  const targetDepts = ticket.target_department_ids || [];
  if (targetGroups.length === 0 && targetDepts.length === 0) {
    return false; // global (unrestricted) workflow — non-involved users denied
  }
  if (userInAnyTargetAudience(user, targetGroups, targetDepts)) {
    return true;
  }

  // Access Denied!
  return false;
}

/** True if the user is a member of the given business group (matching id/name/code). */
function userInBusinessGroup(
  user: { id?: string; name?: string; role?: string; email?: string; department_id?: string; department?: string },
  groupIdOrName: string
): boolean {
  const userId = (user.id || '').toLowerCase();
  const userEmail = (user.email || '').toLowerCase();
  const userName = (user.name || '').toLowerCase();
  const g = String(groupIdOrName || '').toLowerCase();
  if (!g) return false;
  return BUSINESS_GROUPS.some(bg => {
    const isMatch = bg.id.toLowerCase() === g ||
                    bg.name.toLowerCase() === g ||
                    (bg.code || '').toLowerCase() === g;
    if (!isMatch) return false;
    const members = bg.member_user_ids || (bg as any).member_user_ids_json || [];
    return members.some((m: any) => {
      const cleanM = String(m).toLowerCase();
      return cleanM === userId || cleanM === userEmail || cleanM === userName;
    });
  });
}

/** True if the user belongs to at least one target group or target department. */
function userInAnyTargetAudience(
  user: { id?: string; name?: string; role?: string; email?: string; department_id?: string; department?: string },
  targetGroups: string[],
  targetDepts: string[]
): boolean {
  if (targetGroups && targetGroups.length > 0) {
    if (targetGroups.some((g) => userInBusinessGroup(user, g))) return true;
  }
  if (targetDepts && targetDepts.length > 0) {
    const userDept = String((user as any).department_id || (user as any).department || '').toLowerCase();
    if (userDept && targetDepts.some((d) => String(d).toLowerCase() === userDept)) return true;
  }
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
  const involvedIn =
    (val: string) =>
      (userId && val.includes(userId)) ||
      (userEmail && val.includes(userEmail)) ||
      (userName && val.includes(userName));
  if (assignedUser && involvedIn(assignedUser)) return true;

  const currentApprover = (ticket.current_approver || '').toLowerCase();
  if (currentApprover && involvedIn(currentApprover)) return true;

  const observers = (ticket.observer_id || '').toLowerCase();
  if (observers && (userId && observers.includes(userId) || userEmail && observers.includes(userEmail) || userName && observers.includes(userName))) return true;

  // Match Assigned Group Membership
  const dbUser = SYSTEM_USERS.find(u => u.id === userId || u.name.toLowerCase() === userName || u.email.toLowerCase() === userEmail);
  const userGroups = dbUser?.group_ids || [];
  const ticketGroup = (ticket.assigned_group || '').toLowerCase();
  if (ticketGroup) {
    const belongsToAssignedGroup = BUSINESS_GROUPS.some(bg => {
      const isMatch = bg.id.toLowerCase() === ticketGroup ||
                      bg.name.toLowerCase() === ticketGroup ||
                      (bg.code || '').toLowerCase() === ticketGroup;
      if (!isMatch) return false;
      const members = bg.member_user_ids || (bg as any).member_user_ids_json || [];
      return members.some((m: any) => {
        const cleanM = String(m).toLowerCase();
        return cleanM === userId || cleanM === userEmail || cleanM === userName;
      });
    });
    if (belongsToAssignedGroup) return true;
  }

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
      const existing = await dbGet('TicketObservers', { TicketID: { _eq: ticketId }, UserID: { _eq: obs } }, undefined, 1);
      if (!existing || existing.length === 0) {
        await dbCreate('TicketObservers', {
          TicketObserverID: `to_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          TicketID: ticketId,
          UserID: obs,
          AddedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      // non-fatal
      console.warn('[addObserversToTicket insert error]', e);
    }
  }

  // Rebuild legacy comma-separated observer_id field for backward compatibility
  try {
    const rows = await dbGet('TicketObservers', { TicketID: { _eq: ticketId } });
    const ids = (rows || []).map((r: any) => String(r.UserID)).filter(Boolean);
    const joined = ids.join(', ');
    try {
      await dbUpdate('Tickets', ticketId, { ObserverUserID: joined, DateUpdated: new Date().toISOString() });
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
export function parseDurationToMs(durationStr: string | undefined | null, fallbackHours: number): number {
  if (!durationStr) return fallbackHours * 60 * 60 * 1000;
  const match = durationStr.match(/(\d+(?:\.\d+)?)\s*(minute|min|hour|hr|day|d|s)/i);
  if (!match) {
    const num = parseFloat(durationStr);
    if (!isNaN(num)) return num * 60 * 60 * 1000;
    return fallbackHours * 60 * 60 * 1000;
  }
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith('min')) {
    return value * 60 * 1000;
  } else if (unit.startsWith('hour') || unit.startsWith('hr')) {
    return value * 60 * 60 * 1000;
  } else if (unit.startsWith('day') || unit.startsWith('d')) {
    return value * 24 * 60 * 60 * 1000;
  } else if (unit.startsWith('sec') || unit.startsWith('s')) {
    return value * 1000;
  }
  return fallbackHours * 60 * 60 * 1000;
}

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

  const requester = params.requesterId || 'user-admin';

  // 1.5 Fetch requester details to support dynamic defaults
  const { fetchSystemUsersAction } = await import('@/app/actions/workflowActions');
  const allUsers = await fetchSystemUsersAction();
  const reqUserObj = allUsers.find((u: any) => 
    u.id === requester || 
    u.email?.toLowerCase().trim() === requester.toLowerCase().trim()
  );

  const requesterName = reqUserObj?.name || params.requesterName || params.requesterId || 'System User';
  const requesterDept = reqUserObj?.department_id || 'dept-it';

  // Resolve the first assignee dynamically based on assignee_type
  const firstAssigneeRaw = firstStep?.assignee_value || 'Department Manager';
  const firstAssignee = resolveAssignee(firstAssigneeRaw, {
    requester_id: requester,
    requester_name: requesterName,
    department_id: requesterDept,
  }) || firstAssigneeRaw;

  // Resolve defaults from workflow config
  const panelCfg = (wf.visibility_rules as any)?.ticket_info_panel_config || (wf as any).visibility_rules_json?.ticket_info_panel_config || {};
  
  const nowMs = Date.now();
  const slaTtoMs = parseDurationToMs(panelCfg.defaultSlaTto, 1);
  const slaTtrMs = parseDurationToMs(panelCfg.defaultSlaTtr, 8);
  const slaTtoDeadline = new Date(nowMs + slaTtoMs).toISOString();
  const slaTtrDeadline = new Date(nowMs + slaTtrMs).toISOString();

  const firstOlaHours = firstStep?.ola_hours ?? 4;
  const firstOlaMinutes = firstStep?.ola_minutes ?? 0;
  const firstOlaMs = (firstOlaHours * 60 + firstOlaMinutes) * 60 * 1000;
  const olaDeadline = new Date(nowMs + firstOlaMs).toISOString();
  const slaDeadline = slaTtrDeadline;

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
    TicketID: ticketId,
    TicketNumber: reqNumber,
    WorkflowID: wf.id,
    WorkflowVersion: wf.published_version,
    WorkflowSnapshotJson: wf.steps,
    RequesterUserID: requester,
    RequesterName: requesterName,
    RequesterDepartmentID: requesterDept || 'dept-it',
    Title: params.title || `${wf.name} — ${reqNumber}`,
    Priority: params.priority || panelCfg.defaultPriority || 'normal',
    Status: 'pending',
    CurrentStepNodeID: firstNodeId,
    CurrentStepOrder: firstStep?.step_order || 1,
    CurrentAssigneesJson: [firstAssignee],
    AssignedGroup: resolvedGroup || null,
    AssignedUser: defaultUser || null,
    // Workflow Target Audience (Target Business Groups / Target Departments) — gates ticket visibility
    TargetGroupIDsJson: (wf.visibility_rules as any)?.group_ids || (wf as any).visibility_rules_json?.group_ids || [],
    TargetDepartmentIDsJson: (wf.visibility_rules as any)?.department_ids || (wf as any).visibility_rules_json?.department_ids || [],
    LocationID: resolvedLocation || null,
    Unit: resolvedUnit || null,
    SubmittedAt: new Date().toISOString(),
    SlaDeadline: slaDeadline,
    SlaTtoDeadline: slaTtoDeadline,
    SlaTtrDeadline: slaTtrDeadline,
    OlaDeadline: olaDeadline,
    OlaAccumulatedPauseMs: 0,
    DateCreated: new Date().toISOString(),
    DateUpdated: new Date().toISOString(),
  };

  const createdTicket = await dbCreate('Tickets', ticketPayload);

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
    await dbCreate('TicketValues', {
      TicketValueID: `val_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      TicketID: createdTicket.TicketID || ticketId,
      FieldKey: key,
      ValueText: typeof val === 'string' ? val : JSON.stringify(val),
      ValueNumber: typeof val === 'number' ? val : (!isNaN(Number(val)) ? Number(val) : null),
    });
  }

  const actorUid = reqUserObj?.id || (params.requesterId ? (params.requesterId.replace('_', '-')) : 'user-admin');
  const actorUname = reqUserObj?.name || params.requesterName || params.requesterId || 'Ahmed Mohamed';

  // 4. Create initial audit log entry
  const logPayload = {
    ApprovalLogID: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    TicketID: createdTicket.TicketID || ticketId,
    StepNodeID: firstNodeId,
    StepOrderSnapshot: 1,
    ActorUserID: actorUid,
    ActorUserName: actorUname,
    Action: 'submitted',
    Comments: 'Request submitted and routed automatically to first approval step.',
    DecisionAt: new Date().toISOString(),
  };

  const createdLog = await dbCreate('ApprovalLog', logPayload);

  // Create OLA started log for Activity Timeline
  const firstOlaStr = firstOlaHours > 0 ? `${Math.round(firstOlaHours)}h ${firstOlaMinutes > 0 ? `${firstOlaMinutes}m` : ''}` : `${firstOlaMinutes}m`;
  await dbCreate('ApprovalLog', {
    ApprovalLogID: `log_ola_start_${Date.now()}`,
    TicketID: createdTicket.TicketID || ticketId,
    ActorUserID: actorUid,
    ActorUserName: 'OLA Tracker',
    Action: 'ola_started',
    Comments: `[OLA Tracker]: Active Step OLA for "${firstStep?.name || 'First Step'}" started. Target: ${firstOlaStr}. Deadline is ${new Date(olaDeadline).toLocaleString()}.`,
    DecisionAt: new Date().toISOString(),
  });

  // Create SLA started log for Activity Timeline
  await dbCreate('ApprovalLog', {
    ApprovalLogID: `log_sla_start_${Date.now()}`,
    TicketID: createdTicket.TicketID || ticketId,
    ActorUserID: actorUid,
    ActorUserName: 'SLA Tracker',
    Action: 'sla_started',
    Comments: `[SLA Tracker]: SLA timers initiated. TTO Target: ${panelCfg.defaultSlaTto || '1 Hour'}, TTR Target: ${panelCfg.defaultSlaTtr || '8 Hours'}.`,
    DecisionAt: new Date().toISOString(),
  });

  // A visual workflow is a graph, not an ordered list. Traverse its trigger and
  // automatic nodes now, stopping only when an approval node needs a human.
  const runtime = await startGraphWorkflow(createdTicket, wf, finalEavMap);
  const runtimeTicket = runtime.handled ? runtime.ticket : createdTicket;

  // Persist initial observers to normalized ticket_observers table (if any)
  const initialObservers: string[] = [];
  if (defaultObservers) {
    initialObservers.push(...defaultObservers.split(',').map(s => s.trim()).filter(Boolean));
  }
  if (runtimeTicket.ObserverUserID ?? runtimeTicket.observer_id) {
    initialObservers.push(...String(runtimeTicket.ObserverUserID ?? runtimeTicket.observer_id).split(',').map((s: string) => s.trim()).filter(Boolean));
  }
  const uniqueObservers = Array.from(new Set(initialObservers));

  try {
    await addObserversToTicket((runtimeTicket.TicketID ?? runtimeTicket.id) || ticketId, uniqueObservers);
  } catch (e) {
    // Non-fatal — observer persistence should not block ticket creation
    console.warn('[addObserversToTicket failed]', e);
  }

  // Establish requesting user identity (requester is also the actor for submission)
  const requesterIdForNotify = reqUserObj?.id || requester || 'user-admin';
  const requesterNameForNotify = reqUserObj?.name || requesterName;

  // ── Notification: request submitted (confirmation to requester + first assignee alert)
  void notify({
    eventType: 'request_submitted',
    ticket: runtimeTicket,
    ticketId: (runtimeTicket.TicketID ?? runtimeTicket.id) || ticketId,
    ticketNumber: (runtimeTicket.TicketNumber ?? runtimeTicket.ticket_number) || reqNumber,
    actorId: requesterIdForNotify,
    actorName: requesterNameForNotify,
    step: firstStep,
    metadata: { workflowName: wf.name },
  });

  // ── Notification: approval requested from the first approver/assignee
  await emitApprovalRequested(runtimeTicket, wf, requesterNameForNotify, firstStep);

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
  if (filter?.status) databaseFilter.Status = { _eq: filter.status };
  if (filter?.requesterId) databaseFilter.RequesterUserID = { _eq: filter.requesterId };

  const ticketRows = await dbGet(
    'Tickets',
    Object.keys(databaseFilter).length > 0 ? databaseFilter : undefined,
    '-DateCreated'
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
    const vals = await dbGet('TicketValues', { TicketID: { _eq: req.id } });
    valuesMap[req.id] = vals.reduce((acc: Record<string, any>, curr: any) => {
      acc[curr.FieldKey] = curr.ValueNumber != null ? curr.ValueNumber : curr.ValueText;
      return acc;
    }, {});

    // Fetch approval logs for this ticket
    const logs = await dbGet('ApprovalLog', { TicketID: { _eq: req.id } }, 'DecisionAt');
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
  let ticket = await dbGetOne<any>('Tickets', id);
  if (!ticket) {
    // Try by ticket_number
    const byNumber = await dbGet('Tickets', { TicketNumber: { _eq: id } }, undefined, 1);
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
    const wfRow = await dbGetOne<any>('Workflows', request.workflow_id);
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
  const vals = await dbGet('TicketValues', { TicketID: { _eq: ticket.TicketID } });
  const values = vals.reduce((acc: Record<string, any>, curr: any) => {
    acc[curr.FieldKey] = curr.ValueNumber != null ? curr.ValueNumber : curr.ValueText;
    return acc;
  }, {});

  // Get approval logs
  const logRows = await dbGet('ApprovalLog', { TicketID: { _eq: ticket.TicketID } }, 'DecisionAt');
  const logs = logRows.map(normalizeApprovalLog);

  // Check for SLA/OLA breaches and log them if they haven't been logged yet
  const now = new Date();
  const nowMs = now.getTime();
  let updatedLogs = [...logs];

  const isClosedOrSolved = ['solved', 'closed', 'approved', 'rejected'].includes(request.status);

  if (!isClosedOrSolved) {
    // 1. SLA TTO Breach check
    if (request.sla_tto_deadline && nowMs > new Date(request.sla_tto_deadline).getTime() && !request.assigned_user) {
      const alreadyLoggedTto = logs.some((l: any) => l.action === 'sla_breached' && l.comments?.includes('TTO'));
      if (!alreadyLoggedTto) {
        const breachLog = {
          ApprovalLogID: `log_tto_breach_${Date.now()}`,
          TicketID: ticket.TicketID,
          Action: 'sla_breached',
          ActorUserID: 'user-admin',
          ActorUserName: 'SLA Tracker',
          Comments: `[Breach Alert] SLA TTO (Takeover) target has breached! Deadline was ${new Date(request.sla_tto_deadline).toLocaleString()}.`,
          DecisionAt: now.toISOString(),
        };
        const createdLog = await dbCreate('ApprovalLog', breachLog);
        updatedLogs.push(normalizeApprovalLog(createdLog));
      }
    }

    // 2. SLA TTR Breach check
    const ttrDeadline = request.sla_ttr_deadline || request.sla_deadline;
    if (ttrDeadline && nowMs > new Date(ttrDeadline).getTime()) {
      const alreadyLoggedTtr = logs.some((l: any) => l.action === 'sla_breached' && l.comments?.includes('TTR'));
      if (!alreadyLoggedTtr) {
        const breachLog = {
          ApprovalLogID: `log_ttr_breach_${Date.now()}`,
          TicketID: ticket.TicketID,
          Action: 'sla_breached',
          ActorUserID: 'user-admin',
          ActorUserName: 'SLA Tracker',
          Comments: `[Breach Alert] SLA TTR (Resolution) target has breached! Deadline was ${new Date(ttrDeadline).toLocaleString()}.`,
          DecisionAt: now.toISOString(),
        };
        const createdLog = await dbCreate('ApprovalLog', breachLog);
        updatedLogs.push(normalizeApprovalLog(createdLog));
      }
    }

    // 3. Active Step OLA Breach check
    if (request.ola_deadline && nowMs > new Date(request.ola_deadline).getTime()) {
      const currentStep = (request.workflow_version_snapshot || []).find((s: any) => s.react_flow_node_id === request.current_step_node_id);
      const stepName = currentStep?.name || 'Active Step';
      const alreadyLoggedOla = logs.some((l: any) => l.action === 'ola_breached' && l.comments?.includes(`"${stepName}"`));
      if (!alreadyLoggedOla) {
        const breachLog = {
          ApprovalLogID: `log_ola_breach_${Date.now()}`,
          TicketID: ticket.TicketID,
          Action: 'ola_breached',
          ActorUserID: 'user-admin',
          ActorUserName: 'OLA Tracker',
          Comments: `[Breach Alert] Active Step OLA for "${stepName}" has breached! Deadline was ${new Date(request.ola_deadline).toLocaleString()}.`,
          DecisionAt: now.toISOString(),
        };
        const createdLog = await dbCreate('ApprovalLog', breachLog);
        updatedLogs.push(normalizeApprovalLog(createdLog));
      }
    }
  }

  return { request, workflow, values, logs: updatedLogs };
}

/**
 * Process an approval action (approve, reject, return for revision, RFI).
 */
export async function processApprovalAction(params: {
  requestId: string;
  actorName: string;
  action: 'approved' | 'rejected' | 'returned_for_revision' | 'rfi_sent' | 'cancelled';
  comments?: string;
}): Promise<{ request: WorkflowRequest; log: ApprovalLogEntry }> {
  // 1. Find ticket in database
  let ticket = await dbGetOne<any>('Tickets', params.requestId);
  if (!ticket) {
    const byNumber = await dbGet('Tickets', { TicketNumber: { _eq: params.requestId } }, undefined, 1);
    if (byNumber.length === 0) {
      throw new Error(`Request ${params.requestId} not found in database`);
    }
    ticket = byNumber[0];
  }

  // Use the persisted canvas graph when available. Older workflows without a
  // graph continue through the legacy ordered-step engine below.
  const wf = await dbGetOne<any>('Workflows', ticket.WorkflowID);
  if (wf) {
    const runtime = await continueGraphWorkflow(ticket, wf, params.action);
    if (runtime.handled) {
      const log = await dbCreate('ApprovalLog', {
        ApprovalLogID: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        TicketID: ticket.TicketID,
        StepNodeID: runtime.ticket.current_step_node_id,
        StepOrderSnapshot: runtime.ticket.current_step_order,
        ActorUserID: 'user-admin',
        ActorUserName: params.actorName || 'Approver',
        Action: params.action,
        Comments: params.comments || `Action ${params.action} recorded.`,
        DecisionAt: new Date().toISOString(),
      });

      const step = (wf.steps_json || []).find(
        (s: any) => s.react_flow_node_id === runtime.ticket.current_step_node_id
      );
      await emitApprovalNotification(runtime.ticket, wf, params.action, params.actorName || 'Approver', step);

      // If the request advanced to another approval step, alert the new approver.
      if (params.action === 'approved') {
        await emitApprovalRequested(runtime.ticket, wf, params.actorName || 'Approver', step);
      }

      return { request: normalizeTicket(runtime.ticket), log: normalizeApprovalLog(log) };
    }
  }

  const steps = (ticket.WorkflowSnapshotJson ?? ticket.workflow_snapshot_json) || [];
  const currentStepIdx = steps.findIndex(
    (s: any) => s.react_flow_node_id === (ticket.CurrentStepNodeID ?? ticket.current_step_node_id) || s.step_order === (ticket.CurrentStepOrder ?? ticket.current_step_order)
  );

  let newStatus = ticket.Status ?? ticket.status;
  let nextNodeId = ticket.CurrentStepNodeID ?? ticket.current_step_node_id;
  let nextOrder = ticket.CurrentStepOrder ?? ticket.current_step_order;
  let newAssignees = (ticket.CurrentAssigneesJson ?? ticket.current_assignees_json) || [];
  let solvedAt: string | null = null;
  let closedAt: string | null = null;
  let olaDeadline = ticket.OlaDeadline ?? ticket.ola_deadline;

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
      const newOlaHours = nextStep.ola_hours ?? 4;
      const newOlaMinutes = nextStep.ola_minutes ?? 0;
      const olaMs = (newOlaHours * 60 + newOlaMinutes) * 60 * 1000;
      olaDeadline = new Date(Date.now() + olaMs).toISOString();
    } else {
      // Final approval!
      newStatus = 'approved';
      solvedAt = new Date().toISOString();
      newAssignees = [];
    }
  }

  // Combine existing observers with acting approver and new assignees
  const currentObservers = ((ticket.ObserverUserID ?? ticket.observer_id) || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  const updatedObservers = Array.from(new Set([
    ...currentObservers,
    params.actorName,
    ...newAssignees
  ])).filter(Boolean).join(', ');

  // 2. Update ticket in database
  const ticketUpdate: Record<string, any> = {
    Status: newStatus,
    CurrentStepNodeID: nextNodeId,
    CurrentStepOrder: nextOrder,
    CurrentAssigneesJson: newAssignees,
    ObserverUserID: updatedObservers,
    OlaDeadline: olaDeadline,
    DateUpdated: new Date().toISOString(),
  };
  if (solvedAt) ticketUpdate.SolvedAt = solvedAt;
  if (closedAt) ticketUpdate.ClosedAt = closedAt;

  const updatedTicket = await dbUpdate('Tickets', ticket.TicketID ?? ticket.id, ticketUpdate);

  // 3. Create approval log entry
  const currentStep = steps[currentStepIdx];
  const currentOlaHours = currentStep?.ola_hours ?? 4;
  const currentOlaMinutes = currentStep?.ola_minutes ?? 0;
  const stepStart = (ticket.DateUpdated ?? ticket.date_updated) ? new Date(ticket.DateUpdated ?? ticket.date_updated).getTime() : new Date(ticket.DateCreated ?? ticket.date_created).getTime();
  const elapsedMs = Date.now() - stepStart;
  const elapsedMins = Math.round(elapsedMs / 60000);
  const elapsedStr = elapsedMins >= 60 ? `${Math.floor(elapsedMins / 60)}h ${elapsedMins % 60}m` : `${elapsedMins}m`;

  let appendComments = `\n\n[OLA Tracker]: Step "${currentStep?.name || 'Approval Step'}" OLA completed. Time taken: ${elapsedStr}. Target was: ${currentOlaHours > 0 ? `${Math.round(currentOlaHours)}h` : ''} ${currentOlaMinutes > 0 ? `${currentOlaMinutes}m` : ''}.`;

  if (newStatus === 'approved') {
    const totalSlaStart = new Date(ticket.DateCreated ?? ticket.date_created).getTime();
    const totalSlaElapsedMs = Date.now() - totalSlaStart;
    const totalSlaElapsedMins = Math.round(totalSlaElapsedMs / 60000);
    const totalSlaElapsedStr = totalSlaElapsedMins >= 60 ? `${Math.floor(totalSlaElapsedMins / 60)}h ${totalSlaElapsedMins % 60}m` : `${totalSlaElapsedMins}m`;
    const slaTargetHours = (wf?.SlaTotalHours ?? wf?.sla_total_hours) || 48;
    appendComments += `\n[SLA Tracker]: Ticket Resolution SLA completed. Time taken: ${totalSlaElapsedStr}. Target was: ${slaTargetHours}h.`;
  }

  const logPayload = {
    ApprovalLogID: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    TicketID: ticket.TicketID ?? ticket.id,
    StepNodeID: nextNodeId,
    StepOrderSnapshot: nextOrder,
    ActorUserID: 'user-admin',
    ActorUserName: params.actorName || 'Approver',
    Action: params.action,
    Comments: (params.comments || `Action ${params.action} recorded.`) + appendComments,
    DecisionAt: new Date().toISOString(),
  };

  const createdLog = await dbCreate('ApprovalLog', logPayload);

  // Create OLA started log for next step
  const nextStep = steps[currentStepIdx + 1];
  if (nextStep) {
    const nextOlaHours = nextStep.ola_hours ?? 4;
    const nextOlaMinutes = nextStep.ola_minutes ?? 0;
    const nextOlaStr = nextOlaHours > 0 ? `${Math.round(nextOlaHours)}h ${nextOlaMinutes > 0 ? `${nextOlaMinutes}m` : ''}` : `${nextOlaMinutes}m`;
    await dbCreate('ApprovalLog', {
      ApprovalLogID: `log_ola_next_start_${Date.now()}`,
      TicketID: ticket.TicketID ?? ticket.id,
      ActorUserID: 'user-admin',
      ActorUserName: 'OLA Tracker',
      Action: 'ola_started',
      Comments: `[OLA Tracker]: Active Step OLA for "${nextStep.name || 'Next Step'}" started. Target: ${nextOlaStr}. Deadline is ${new Date(olaDeadline).toLocaleString()}.`,
      DecisionAt: new Date().toISOString(),
    });
  }

  // Persist actor and new assignees as observers for normalized queries
  try {
    await addObserversToTicket(updatedTicket.TicketID ?? updatedTicket.id, Array.from(new Set([String(params.actorName), ...(newAssignees || [])])));
  } catch (e) {
    console.warn('[addObserversToTicket after approval failed]', e);
  }

  // ── Notification: approval decision (legacy ordered-step engine)
  const currentStepForNotify = steps.find(
    (s: any) => s.react_flow_node_id === (ticket.CurrentStepNodeID ?? ticket.current_step_node_id) || s.step_order === (ticket.CurrentStepOrder ?? ticket.current_step_order)
  );
  await emitApprovalNotification(updatedTicket, wf, params.action, params.actorName || 'Approver', currentStepForNotify);

  // If the request advanced to another approval step, alert the new approver.
  if (params.action === 'approved') {
    const nextStepForNotify = steps.find(
      (s: any) => s.react_flow_node_id === (updatedTicket.CurrentStepNodeID ?? updatedTicket.current_step_node_id) || s.step_order === (updatedTicket.CurrentStepOrder ?? updatedTicket.current_step_order)
    );
    await emitApprovalRequested(updatedTicket, wf, params.actorName || 'Approver', nextStepForNotify);
  }

  return {
    request: normalizeTicket(updatedTicket),
    log: normalizeApprovalLog(createdLog),
  };
}

/**
 * Emit an approval-driven notification from a resolved ticket + workflow.
 * Maps engine action -> notification event type, then fans out to recipients.
 */
async function emitApprovalNotification(
  ticket: any,
  wf: any,
  action: string,
  actorName: string,
  step?: any
): Promise<void> {
  let eventType: NotificationEventType | null = null;
  switch (action) {
    case 'approved': eventType = 'approved'; break;
    case 'rejected': eventType = 'rejected'; break;
    case 'returned_for_revision': eventType = 'returned_for_revision'; break;
    case 'rfi_sent': eventType = 'rfi_sent'; break;
    case 'delegated': eventType = 'delegated'; break;
    case 'cancelled': return; // no dedicated consumer notification for cancellation
    default: return;
  }
  if (!eventType) return;
  await notify({
    eventType,
    ticket,
    ticketId: ticket.TicketID ?? ticket.id,
    ticketNumber: ticket.TicketNumber ?? ticket.ticket_number,
    actorId: actorName,
    actorName,
    step,
    metadata: { workflowName: wf?.WorkflowName ?? wf?.name },
  });
}

/**
 * Emit an "approval requested" notification to the ticket's current approver(s).
 * Targets whichever user(s) hold the active approval step (current_assignees_json).
 */
async function emitApprovalRequested(
  ticket: any,
  wf: any,
  actorName: string,
  step?: any
): Promise<void> {
  await notify({
    eventType: 'approval_requested',
    ticket,
    ticketId: ticket.TicketID ?? ticket.id,
    ticketNumber: ticket.TicketNumber ?? ticket.ticket_number,
    actorId: actorName,
    actorName,
    step,
    metadata: { workflowName: wf?.WorkflowName ?? wf?.name },
  });
}

/**
 * Add a comment (public or internal note) to a ticket, persisted to the approval_log table.
 * Supports optional file attachments (image/file) stored via the files API.
 */
export async function addComment(params: {
  ticketId: string;
  actorId: string;
  actorName: string;
  content: string;
  isInternal: boolean;
  attachments?: Array<{ fileId: string; fileName: string; mimeType: string; size: number }>;
  skipNotification?: boolean;
}): Promise<ApprovalLogEntry> {
  // Store attachment metadata as JSON embedded in the comments field
  // (avoids needing new database columns)
  let commentText = params.content || '';
  if (params.attachments && params.attachments.length > 0) {
    const attachmentJson = JSON.stringify({ _attachments: params.attachments });
    commentText = commentText + '\n' + attachmentJson;
  }
  const logPayload: Record<string, any> = {
    ApprovalLogID: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    TicketID: params.ticketId,
    StepNodeID: null,
    StepOrderSnapshot: null,
    ActorUserID: params.actorId,
    ActorUserName: params.actorName,
    Action: params.isInternal ? 'internal_note' : 'commented',
    Comments: commentText,
    DecisionAt: new Date().toISOString(),
  };
  const created = await dbCreate('ApprovalLog', logPayload);

  // ── Notification: public comment / internal note
  if (params.skipNotification) {
    return normalizeApprovalLog(created);
  }
  if (!params.isInternal) {
    // enrichment: load ticket row for targeting
    try {
      const ticketRow = await dbGetOne<any>('Tickets', params.ticketId);
      void notify({
        eventType: 'comment_added',
        ticket: ticketRow || { TicketID: params.ticketId, RequesterUserID: params.actorId },
        ticketId: params.ticketId,
        ticketNumber: ticketRow?.TicketNumber,
        actorId: params.actorId,
        actorName: params.actorName,
      });
    } catch (e) {
      console.warn('[comment notification failed]', e);
    }
  } else {
    try {
      const ticketRow = await dbGetOne<any>('Tickets', params.ticketId);
      void notify({
        eventType: 'internal_note_added',
        ticket: ticketRow || { TicketID: params.ticketId, RequesterUserID: params.actorId },
        ticketId: params.ticketId,
        ticketNumber: ticketRow?.TicketNumber,
        actorId: params.actorId,
        actorName: params.actorName,
      });
    } catch (e) {
      console.warn('[internal note notification failed]', e);
    }
  }

  return normalizeApprovalLog(created);
}


