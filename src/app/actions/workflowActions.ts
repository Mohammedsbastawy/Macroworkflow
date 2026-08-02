"use server";

import { revalidatePath } from "next/cache";
import { dbGet, dbCreate, dbUpdate, dbDelete } from "@/lib/db/mysqlClient";
import { getDbRoles, syncDbRolePermission } from "@/lib/db/iamDatabase";
import {
  getWorkflows,
  saveWorkflowTemplate,
  deleteWorkflowTemplate,
  cloneWorkflowTemplate,
  getRequests,
  submitRequest,
  processApprovalAction,
  getRequestById,
} from "@/lib/engine/workflowCore";

// --- In-Memory Action Cache (3s TTL) for Ultra-Fast Mobile & Server Component Performance ---
let cachedUsers: { data: any[]; timestamp: number } | null = null;
let cachedWorkflows: { data: any[]; timestamp: number } | null = null;
let cachedRequests: { data: any; timestamp: number } | null = null;
let cachedRolePerms: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 3000;

export async function invalidateActionCache() {
  cachedUsers = null;
  cachedWorkflows = null;
  cachedRequests = null;
  cachedRolePerms = null;
}

/**
 * Create Workflow Form Template — stored directly in database via workflowCore
 */
export async function createWorkflowFormAction(formData: {
  id?: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color: string;
  fields: any[];
  steps?: any[];
  slug?: string;
  react_flow_graph?: any;
  visibility_rules?: {
    is_global: boolean;
    department_ids: string[];
    group_ids: string[];
    user_ids: string[];
    ticket_info_panel_config?: any;
  };
}) {
  const slug = formData.slug || formData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

  const defaultSteps = [
    {
      id: `step-1`,
      workflow_id: `wf_${slug}`,
      react_flow_node_id: 'node-step-1',
      name: 'Department Manager',
      step_order: 1,
      step_type: 'approval' as const,
      execution_mode: 'sequential' as const,
      assignee_type: 'manager_of_requester' as const,
      assignee_value: 'Direct Manager',
      ola_hours: 4,
      notify_on_assign: true,
      notify_on_complete: false,
      sort: 1,
    },
    {
      id: `step-2`,
      workflow_id: `wf_${slug}`,
      react_flow_node_id: 'node-step-2',
      name: 'Department Head / Finance Review',
      step_order: 2,
      step_type: 'approval' as const,
      execution_mode: 'sequential' as const,
      assignee_type: 'role' as const,
      assignee_value: 'Finance Manager',
      ola_hours: 8,
      notify_on_assign: true,
      notify_on_complete: false,
      sort: 2,
    },
  ];

  const payload = {
    id: formData.id || undefined,
    name: formData.name,
    slug,
    category: formData.category,
    description: formData.description,
    icon: formData.icon || '📝',
    color: formData.color || '#4F46E5',
    version: 1,
    published_version: 1,
    sla_total_hours: 48,
    steps: formData.steps || [],
    fields: formData.fields,
    visibility_rules: formData.visibility_rules || { is_global: true, department_ids: [], group_ids: [], user_ids: [] },
    react_flow_graph: formData.react_flow_graph || null,
  };

  // Save directly to database via workflowCore
  const template = await saveWorkflowTemplate(payload as any);

  // Invalidate the in-memory catalog cache so the next fetch returns the fresh record
  await invalidateActionCache();

  revalidatePath('/workflows');
  revalidatePath('/requests/new');
  return { success: true, template };
}

/**
 * Submit Request / Ticket — stored directly in database via workflowCore
 */
export async function submitWorkflowRequestAction(payload: {
  workflowSlug: string;
  requesterId: string;
  title: string;
  priority?: string;
  fieldValues: Record<string, any>;
}) {
  const newRequest = await submitRequest({
    workflowSlug: payload.workflowSlug,
    title: payload.title,
    requesterId: payload.requesterId,
    priority: (payload.priority as any) || 'normal',
    formData: payload.fieldValues,
  });

  revalidatePath('/requests');
  revalidatePath('/my-requests');
  revalidatePath('/');
  return { success: true, request: newRequest.request };
}

/**
 * Process Approval Decision — stored directly in database via workflowCore
 */
export async function submitApprovalDecisionAction(payload: {
  requestId: string;
  actorName: string;
  action: 'approved' | 'rejected' | 'returned_for_revision' | 'cancelled';
  comments?: string;
}) {
  const updatedRequest = await processApprovalAction(payload);

  revalidatePath('/requests');
  revalidatePath(`/requests/${payload.requestId}`);
  revalidatePath('/my-requests');
  revalidatePath('/');
  return { success: true, request: updatedRequest.request };
}

/**
 * Add a comment (public or internal note) to a ticket, persisted to the approval_log table.
 * Supports optional file attachments.
 */
export async function addCommentAction(params: {
  ticketId: string;
  actorId: string;
  actorName: string;
  content: string;
  isInternal: boolean;
  attachments?: Array<{ fileId: string; fileName: string; mimeType: string; size: number }>;
  skipNotification?: boolean;
}) {
  const { addComment } = await import('@/lib/engine/workflowCore');
  const log = await addComment(params);
  revalidatePath(`/requests/${params.ticketId}`);
  revalidatePath('/requests');
  return { success: true, log };
}

/**
 * Fetch Catalog Workflows — directly from database
 */
export async function fetchCatalogWorkflowsAction() {
  const now = Date.now();
  if (cachedWorkflows && now - cachedWorkflows.timestamp < CACHE_TTL_MS) {
    return cachedWorkflows.data;
  }
  const data = await getWorkflows();
  cachedWorkflows = { data, timestamp: now };
  return data;
}

/**
 * Fetch Authorized Catalog Workflows for User IAM Membership
 */
export async function fetchAuthorizedCatalogWorkflowsAction(userId?: string) {
  const all = await fetchCatalogWorkflowsAction();
  const { getAuthorizedWorkflowsForUser, SYSTEM_USERS } = await import('@/lib/engine/iamStore');
  
  let user: any = null;
  const dbUsers = await fetchSystemUsersAction();
  const dbGroups = await fetchBusinessGroupsAction();

  if (userId) {
    user = (dbUsers || []).find((u: any) => u.id === userId) || (SYSTEM_USERS || []).find((u) => u.id === userId) || null;
  }
  if (!user) {
    user = dbUsers[0] || SYSTEM_USERS[0];
  }
  return getAuthorizedWorkflowsForUser(user, all, dbGroups as any);
}

/**
 * Fetch All Requests / Tickets — directly from database
 * When a userId is provided, results are filtered to tickets the user can access
 * (requester, assigned group/technician, assignee, or observer).
 */
export async function fetchAllRequestsAction(userId?: string) {
  let currentUser: any = undefined;
  if (userId) {
    const users = await fetchSystemUsersAction();
    currentUser = users.find((u: any) => u.id === userId) || null;
    if (!currentUser) currentUser = undefined;
  }

  const now = Date.now();
  if (!currentUser && cachedRequests && now - cachedRequests.timestamp < CACHE_TTL_MS) {
    return cachedRequests.data;
  }

  const data = await getRequests(undefined, currentUser);
  if (!currentUser) cachedRequests = { data, timestamp: now };
  return data;
}

/**
 * Fetch requests where the given user is the requester (My Requests view)
 */
export async function fetchMyRequestsAction(userId?: string) {
  const now = Date.now();
  if (cachedRequests && now - cachedRequests.timestamp < CACHE_TTL_MS && userId == null) {
    return cachedRequests.data;
  }

  // If userId provided, request filtered server-side by requesterId
  const user = userId ? (await fetchSystemUsersAction()).find((u: any) => u.id === userId) || null : null;
  const data = await getRequests({ requesterId: userId }, user || undefined);
  return data;
}

/**
 * Fetch requests where the given user is involved (assignee, approver, observer) but NOT the requester
 */
export async function fetchInvolvedRequestsAction(userId?: string) {
  const users = await fetchSystemUsersAction();
  const currentUser = userId ? users.find((u: any) => u.id === userId) || users[0] : users[0];
  const all = await getRequests(undefined, currentUser);
  // Filter out tickets created by the user (requester)
  const requests = (all.requests || []).filter((r: any) => (r.requester_id || '').toLowerCase() !== (currentUser.id || '').toLowerCase());
  return { ...all, requests };
}

export async function fetchRequestDetailAction(id: string, userId?: string) {
  let currentUser = null;
  if (userId) {
    const users = await fetchSystemUsersAction();
    currentUser = users.find((u: any) => u.id === userId) || null;
  }
  return await getRequestById(id, currentUser);
}

/**
 * Pause OLA Clock (RFI Flow)
 */
export async function pauseTicketOlaAction(payload: { requestId: string; actorName: string; question: string }) {
  const { pauseTicketOlaClockForRfi } = await import('@/lib/engine/itsmEngine');
  const res = await pauseTicketOlaClockForRfi(payload.requestId, payload.actorName, payload.question);
  revalidatePath(`/requests/${payload.requestId}`);
  return { success: true, ticket: res.ticket };
}

/**
 * Resume OLA Clock (RFI Flow)
 */
export async function resumeTicketOlaAction(payload: { requestId: string; requesterName: string; answer: string }) {
  const { resumeTicketOlaClockAfterRfi } = await import('@/lib/engine/itsmEngine');
  const res = await resumeTicketOlaClockAfterRfi(payload.requestId, payload.requesterName, payload.answer);
  revalidatePath(`/requests/${payload.requestId}`);
  return { success: true, ticket: res.ticket };
}

/**
 * Fetch Role Permissions — from database role_permissions collection
 */
export async function fetchRolePermissionsAction() {
  try {
    const rows = await dbGet('role_permissions');
    if (rows && rows.length > 0) {
      const result: Record<string, any> = {};
      for (const row of rows) {
        result[row.role_code?.toLowerCase() || row.role_code] = {
          modules: row.modules_json || {},
          actions: row.actions_json || {},
          ticketScope: row.ticket_scope || 'own',
        };
      }
      return result;
    }
  } catch {
    // Fall back to defaults
  }
  const { DEFAULT_ROLE_PERMISSIONS } = await import('@/lib/engine/iamStore');
  return DEFAULT_ROLE_PERMISSIONS;
}

/**
 * Save Role Permissions — to database role_permissions collection
 */
export async function saveRolePermissionsAction(roleCode: string, config: any) {
  // Sync to database BaaS Roles REST API
  await syncDbRolePermission(roleCode.toUpperCase(), config);

  // Save to role_permissions collection
  try {
    const existing = await dbGet('role_permissions', { role_code: { _eq: roleCode } }, undefined, 1);
    if (existing.length > 0) {
      await dbUpdate('role_permissions', existing[0].id, {
        modules_json: config.modules || config,
        actions_json: config.actions || {},
        ticket_scope: config.ticketScope || 'own',
        date_updated: new Date().toISOString(),
      });
    } else {
      await dbCreate('role_permissions', {
        role_code: roleCode,
        modules_json: config.modules || config,
        actions_json: config.actions || {},
        ticket_scope: config.ticketScope || 'own',
      });
    }
  } catch (err) {
    console.warn('[role_permissions save warning]', err);
  }

  revalidatePath('/admin/profiles');
  revalidatePath('/');
  return { success: true };
}

/**
 * Delete Workflow — from database
 */
export async function deleteWorkflowAction(id: string) {
  const success = await deleteWorkflowTemplate(id);
  revalidatePath('/workflows');
  revalidatePath('/workflows/catalog');
  revalidatePath('/requests/new');
  return { success };
}

/**
 * Clone Workflow — in database
 */
export async function cloneWorkflowAction(id: string) {
  const cloned = await cloneWorkflowTemplate(id);
  revalidatePath('/workflows');
  revalidatePath('/workflows/catalog');
  revalidatePath('/requests/new');
  return { success: true, cloned };
}

/**
 * Fetch All GLPI Business Rules from database (with criteria and actions)
 */
export async function fetchBusinessRulesAction() {
  try {
    const rules = await dbGet('business_rules', {}, 'execution_order');
    const result = [];
    for (const r of rules) {
      const criteria = await dbGet('rule_criteria', { rule_id: { _eq: r.id } });
      const actions = await dbGet('rule_actions', { rule_id: { _eq: r.id } }, 'execution_order');
      result.push({
        ...r,
        criteria,
        actions,
      });
    }
    return result;
  } catch (err) {
    console.error('[fetchBusinessRulesAction Error]', err);
    return [];
  }
}

/**
 * Save GLPI Business Rule (Create or Update with Criteria & Actions)
 */
export async function saveBusinessRuleAction(payload: {
  id?: string;
  name: string;
  description?: string;
  is_active: boolean;
  execution_order: number;
  match_type: 'AND' | 'OR';
  stop_on_match: boolean;
  criteria: Array<{ field: string; operator: string; value: string }>;
  actions: Array<{ action_type: string; target_value: string; execution_order?: number }>;
}) {
  const ruleData = {
    name: payload.name,
    description: payload.description || '',
    is_active: payload.is_active,
    execution_order: payload.execution_order,
    match_type: payload.match_type,
    stop_on_match: payload.stop_on_match,
    date_updated: new Date().toISOString(),
  };

  let ruleId = payload.id;

  if (ruleId) {
    const { dbUpdate, dbDelete } = await import('@/lib/db/mysqlClient');
    await dbUpdate('business_rules', ruleId, ruleData);
    // Remove existing criteria & actions to refresh
    const oldCriteria = await dbGet('rule_criteria', { rule_id: { _eq: ruleId } });
    for (const c of oldCriteria) await dbDelete('rule_criteria', c.id);
    const oldActions = await dbGet('rule_actions', { rule_id: { _eq: ruleId } });
    for (const a of oldActions) await dbDelete('rule_actions', a.id);
  } else {
    const { dbCreate } = await import('@/lib/db/mysqlClient');
    const created = await dbCreate<any>('business_rules', {
      ...ruleData,
      date_created: new Date().toISOString(),
    });
    ruleId = created.id;
  }

  // Insert Criteria
  const { dbCreate } = await import('@/lib/db/mysqlClient');
  for (const c of payload.criteria) {
    if (!c.field || !c.value) continue;
    await dbCreate('rule_criteria', {
      rule_id: ruleId,
      field: c.field,
      operator: c.operator,
      value: c.value,
    });
  }

  // Insert Actions
  for (let idx = 0; idx < payload.actions.length; idx++) {
    const a = payload.actions[idx];
    if (!a.action_type || !a.target_value) continue;
    await dbCreate('rule_actions', {
      rule_id: ruleId,
      action_type: a.action_type,
      target_value: a.target_value,
      execution_order: a.execution_order || idx + 1,
    });
  }

  revalidatePath('/admin/rules');
  return { success: true, id: ruleId };
}

/**
 * Delete GLPI Business Rule from database
 */
export async function deleteBusinessRuleAction(id: string) {
  const { dbDelete } = await import('@/lib/db/mysqlClient');
  const success = await dbDelete('business_rules', id);
  revalidatePath('/admin/rules');
  return { success };
}

/**
 * Save Visual Canvas ReactFlow Graph (nodes, edges, steps) to database/MySQL
 */
export async function saveWorkflowCanvasGraphAction(payload: {
  workflowSlug: string;
  nodes: any[];
  edges: any[];
  version?: number;
}) {
  const { saveWorkflowTemplate, getWorkflowBySlug } = await import('@/lib/engine/workflowCore');
  const { graphToWorkflowSteps } = await import('@/lib/builder/graphToSchema');

  const existingWf = await getWorkflowBySlug(payload.workflowSlug);
  const graphJson = { nodes: payload.nodes, edges: payload.edges };
  const stepRows = graphToWorkflowSteps(payload.nodes, payload.edges, payload.workflowSlug);

  await saveWorkflowTemplate({
    id: existingWf?.id,
    slug: payload.workflowSlug,
    name: existingWf?.name || payload.workflowSlug,
    react_flow_graph_json: graphJson as any,
    steps: stepRows as any,
    version: payload.version || existingWf?.version || 1,
    published_version: payload.version || existingWf?.published_version || 1,
  });

  revalidatePath('/workflows');
  revalidatePath(`/admin/builder/${payload.workflowSlug}`);
  return { success: true, stepsCount: stepRows.length };
}

/**
 * Fetch Visual Canvas Graph for a Workflow from database/MySQL
 */
export async function fetchWorkflowCanvasGraphAction(slug: string) {
  const { getWorkflowBySlug } = await import('@/lib/engine/workflowCore');
  const wf = await getWorkflowBySlug(slug);
  if (!wf) return null;
  return {
    workflow: wf,
    graph: wf.react_flow_graph_json,
    steps: wf.steps,
  };
}

/**
 * Enterprise Org Hierarchy & Departments Server Actions
 */
export async function fetchOrgHierarchyAction() {
  const { dbGet } = await import('@/lib/db/mysqlClient');
  try {
    const rows = await dbGet('Departments');
    if (rows && rows.length > 0) {
      return rows.map((r: any) => ({
        id: r.DepartmentID,
        name: r.DepartmentName,
        code: r.DepartmentCode,
        parent_department_id: r.ParentDepartmentID,
        manager_id: r.ManagerUserID,
        head_user_id: r.HeadUserID,
      }));
    }
  } catch (e) {
    console.error('database departments fetch fallback to seeded hierarchy:', e);
  }
  const { DEPARTMENTS } = await import('@/lib/engine/iamStore');
  return DEPARTMENTS;
}

/**
 * Enterprise Budgets Module Server Actions
 */
export async function fetchBudgetsAction() {
  const { dbGet } = await import('@/lib/db/mysqlClient');
  try {
    const rows = await dbGet('Budgets');
    return (rows || []).map((r: any) => ({
      id: r.BudgetID,
      department_id: r.DepartmentID,
      fiscal_year: r.FiscalYear,
      quarter: r.Quarter,
      allocated_amount: r.AllocatedAmount,
      spent_amount: r.SpentAmount,
      currency: r.Currency,
    }));
  } catch (e) {
    return [];
  }
}

export async function saveBudgetAction(payload: {
  id?: string;
  department_id: string;
  fiscal_year: number;
  quarter: string;
  allocated_amount: number;
  spent_amount?: number;
  currency?: string;
}) {
  const { dbCreate, dbUpdate } = await import('@/lib/db/mysqlClient');
  const record = {
    DepartmentID: payload.department_id,
    FiscalYear: payload.fiscal_year,
    Quarter: payload.quarter,
    AllocatedAmount: payload.allocated_amount,
    SpentAmount: payload.spent_amount || 0,
    Currency: payload.currency || 'EGP',
  };
  if (payload.id) {
    await dbUpdate('Budgets', payload.id, record);
  } else {
    await dbCreate('Budgets', record);
  }
  revalidatePath('/admin/budgets');
  return { success: true };
}

/**
 * Enterprise Policies & Pre-Submission Module Server Actions
 */
export async function fetchPoliciesAction() {
  const { dbGet } = await import('@/lib/db/mysqlClient');
  try {
    const rows = await dbGet('Policies');
    if (rows && rows.length > 0) {
      return rows.map((r: any) => {
        const deptId = r.DepartmentID || null;
        const applyToAll = r.ApplyToAll === undefined || r.ApplyToAll === null
          ? (deptId ? 0 : 1)
          : r.ApplyToAll;
        const deptIds = r.DepartmentIDsJson || (deptId ? [deptId] : []);
        const groupIds = r.GroupIDsJson || [];
        return {
          id: r.PolicyID,
          name: r.PolicyName,
          department_id: deptId,
          description: r.Description,
          code: r.PolicyCode,
          is_active: r.IsActive,
          rules_json: r.RulesJson || [],
          apply_to_all: applyToAll,
          department_ids_json: deptIds,
          group_ids_json: groupIds,
        };
      });
    }
  } catch (e) {
    console.error('database policies fetch fallback:', e);
  }
  // Default Seeded Department Policies
  return [
    {
      id: 'pol-dept-it',
      name: 'لائحة وسياسات قطاع تكنولوجيا المعلومات (IT Governance Policy)',
      department_id: 'dept-it',
      description: 'ضوابط طلب الأجهزة والمعدات والتراخيص وتصاريح الصيانة برمجياً',
      is_active: true,
      rules_json: [
        {
          id: 'rule-it-1',
          name: 'حظر الطلبات الفردية للأجهزة الاستثنائية الأعلى من 50,000 ج.م بدون موافقة المشتريات',
          condition_field: 'form.amount',
          condition_operator: '>',
          condition_value: '50000',
          action_type: 'block_submission',
          error_message_ar: 'عفواً، يتطلب شراء معدات تكنولوجيا معلومات أزيد من 50,000 ج.م موافقة لجنة تكنولوجيا المعلومات المسبقة.',
          is_active: true,
        },
        {
          id: 'rule-it-2',
          name: 'اشتراط الميزانية لأذون شراء السيرفرات',
          condition_field: 'ticket.priority',
          condition_operator: '==',
          condition_value: 'CRITICAL',
          action_type: 'warning_banner',
          error_message_ar: 'تنبيه: التذاكر حارجة الأهمية تتطلب إرفاق تقرير تقييم الأثر الفني قبل الإسناد.',
          is_active: true,
        }
      ]
    },
    {
      id: 'pol-dept-finance',
      name: 'لائحة الضوابط المالية والمصروفات النقدية (Financial Policy)',
      department_id: 'dept-finance',
      description: 'سياسات صرف العهد النقدية، السلف، والمصروفات النثرية في الشركة',
      is_active: true,
      rules_json: [
        {
          id: 'rule-fin-1',
          name: 'سقف العهدة النقدية المباشرة للموظفين 10,000 ج.م',
          condition_field: 'form.amount',
          condition_operator: '>',
          condition_value: '10000',
          action_type: 'block_submission',
          error_message_ar: 'عفواً، الحد الأقصى للعهدة النقدية المباشرة 10,000 ج.م. للطلبات الأعلى يرجى التقديم عبر أمر شراء رسمى.',
          is_active: true,
        }
      ]
    },
    {
      id: 'pol-dept-hr',
      name: 'لائحة الاستحقاقات والموارد البشرية (HR Policy)',
      department_id: 'dept-hr',
      description: 'ضوابط وتصاريح التدريب الخارجي، السفر، والانتقالات الرسمية',
      is_active: true,
      rules_json: [
        {
          id: 'rule-hr-1',
          name: 'اشتراط موافقة مدير القطاع لطلب الدورات التدريبية الخارجية',
          condition_field: 'form.amount',
          condition_operator: '>',
          condition_value: '15000',
          action_type: 'require_approval',
          error_message_ar: 'تنبيه: الدورات الأعلى من 15,000 ج.م تتطلب إرفاق خطة التطوير الوظيفي السنوية.',
          is_active: true,
        }
      ]
    }
  ];
}

export async function savePolicyAction(payload: {
  id?: string;
  name: string;
  department_id?: string | null;
  description?: string;
  code?: string;
  is_active: boolean;
  rules_json?: any[];
  department_ids_json?: string[];
  group_ids_json?: string[];
  apply_to_all?: boolean | number;
}) {
  const { dbCreate, dbUpdate, dbGetOne } = await import('@/lib/db/mysqlClient');
  const record = {
    PolicyName: payload.name,
    DepartmentID: payload.department_id || null,
    DepartmentIDsJson: payload.department_ids_json || [],
    GroupIDsJson: payload.group_ids_json || [],
    ApplyToAll: payload.apply_to_all !== undefined ? payload.apply_to_all : (payload.department_id ? 0 : 1),
    Description: payload.description || '',
    PolicyCode: payload.code || '',
    IsActive: payload.is_active,
    RulesJson: payload.rules_json || [],
  };
  try {
    if (payload.id) {
      const existing = await dbGetOne('Policies', payload.id);
      if (existing) {
        await dbUpdate('Policies', payload.id, record);
      } else {
        await dbCreate('Policies', { ...record, PolicyID: payload.id });
      }
    } else {
      await dbCreate('Policies', record);
    }
  } catch (e) {
    console.error('database policies save failure:', e);
  }
  revalidatePath('/admin/policies');
  return { success: true };
}

export async function deletePolicyAction(id: string) {
  const { dbDelete, dbDeleteWhere } = await import('@/lib/db/mysqlClient');
  try {
    await dbDeleteWhere('policy_travel_rates', 'policy_id', id);
    await dbDelete('Policies', id);
  } catch (e) {}
  revalidatePath('/admin/policies');
  return { success: true };
}

/**
 * Enterprise System Settings & Feature Flags Server Actions
 */
export async function fetchSystemSettingsAction() {
  const { dbGet } = await import('@/lib/db/mysqlClient');
  try {
    const rows = await dbGet('system_settings');
    if (rows && rows.length > 0) return rows;
  } catch (e) {
    console.error('database system_settings fetch error:', e);
  }
  return [
    { key: 'ENABLE_BUDGET_CHECKS', value: 'false', description: 'Enable department budget balance evaluation node' },
    { key: 'ENABLE_POLICY_CHECKS', value: 'false', description: 'Enable pre-submission policy rules evaluation node' },
    { key: 'FISCAL_YEAR_START_MONTH', value: '1', description: 'Fiscal Year Start Month (1 = Jan, 7 = July)' },
    { key: 'CURRENT_FISCAL_YEAR', value: '2026', description: 'Current Active Fiscal Year' },
    { key: 'FISCAL_CLOSE_WARNING_DAYS', value: '30', description: 'Days before Fiscal Year end to send alerts' },
    { key: 'FISCAL_NOTIFY_USER_IDS', value: 'user-mona,user-admin', description: 'Comma-separated user IDs for Fiscal closing notifications' },
    { key: 'FISCAL_YEAR_STATUS', value: 'active', description: 'Fiscal Year Status (active, closing_warning, locked)' },
  ];
}

export async function updateSystemSettingAction(key: string, value: string) {
  const { dbUpdate, dbCreate } = await import('@/lib/db/mysqlClient');
  try {
    await dbUpdate('system_settings', key, { value });
  } catch (e) {
    try {
      await dbCreate('system_settings', { key, value, description: `Setting ${key}` });
    } catch (err) {}
  }
  revalidatePath('/admin/settings');
  revalidatePath('/admin/budgets');
  return { success: true };
}

/**
 * Enterprise System Travel Zones Master Data Server Actions
 */
const EGYPT_MASTER_TRAVEL_PLACES = [
  { id: "zone-2", name: "أكتوبر", code: "PLACE_2", is_active: true },
  { id: "zone-3", name: "ابشواي", code: "PLACE_3", is_active: true },
  { id: "zone-4", name: "ابو المطامير", code: "PLACE_4", is_active: true },
  { id: "zone-5", name: "ابو حمص", code: "PLACE_5", is_active: true },
  { id: "zone-6", name: "ابو زعبل", code: "PLACE_6", is_active: true },
  { id: "zone-7", name: "ادفو", code: "PLACE_7", is_active: true },
  { id: "zone-8", name: "ادكو", code: "PLACE_8", is_active: true },
  { id: "zone-9", name: "ارياف امبابه", code: "PLACE_9", is_active: true },
  { id: "zone-10", name: "اسيوط", code: "PLACE_10", is_active: true },
  { id: "zone-11", name: "الاسكندرية", code: "PLACE_11", is_active: true },
  { id: "zone-12", name: "الاسماعيلية", code: "PLACE_12", is_active: true },
  { id: "zone-13", name: "الاقصر", code: "PLACE_13", is_active: true },
  { id: "zone-14", name: "البحيرة", code: "PLACE_14", is_active: true },
  { id: "zone-15", name: "البدرشين", code: "PLACE_15", is_active: true },
  { id: "zone-16", name: "البلينا", code: "PLACE_16", is_active: true },
  { id: "zone-17", name: "التبين", code: "PLACE_17", is_active: true },
  { id: "zone-18", name: "التجمع الخامس", code: "PLACE_18", is_active: true },
  { id: "zone-19", name: "الجمالية", code: "PLACE_19", is_active: true },
  { id: "zone-20", name: "الحمام", code: "PLACE_20", is_active: true },
  { id: "zone-21", name: "الحوامديه", code: "PLACE_21", is_active: true },
  { id: "zone-22", name: "الخانكة", code: "PLACE_22", is_active: true },
  { id: "zone-23", name: "الخصوص", code: "PLACE_23", is_active: true },
  { id: "zone-24", name: "الدقهلية", code: "PLACE_24", is_active: true },
  { id: "zone-25", name: "الدلنجات", code: "PLACE_25", is_active: true },
  { id: "zone-26", name: "الرحاب", code: "PLACE_26", is_active: true },
  { id: "zone-27", name: "الزقازيق", code: "PLACE_27", is_active: true },
  { id: "zone-28", name: "الساحل", code: "PLACE_28", is_active: true },
  { id: "zone-29", name: "الساحل الشمالي", code: "PLACE_29", is_active: true },
  { id: "zone-30", name: "السنبلاوين", code: "PLACE_30", is_active: true },
  { id: "zone-31", name: "السويس", code: "PLACE_31", is_active: true },
  { id: "zone-32", name: "الشرقية", code: "PLACE_32", is_active: true },
  { id: "zone-33", name: "الشروق", code: "PLACE_33", is_active: true },
  { id: "zone-34", name: "الصف", code: "PLACE_34", is_active: true },
  { id: "zone-35", name: "العاشر", code: "PLACE_35", is_active: true },
  { id: "zone-36", name: "العامرية", code: "PLACE_36", is_active: true },
  { id: "zone-37", name: "العبور", code: "PLACE_37", is_active: true },
  { id: "zone-38", name: "العياط", code: "PLACE_38", is_active: true },
  { id: "zone-39", name: "العين السخنه", code: "PLACE_39", is_active: true },
  { id: "zone-40", name: "الغربية", code: "PLACE_40", is_active: true },
  { id: "zone-41", name: "الغردقة", code: "PLACE_41", is_active: true },
  { id: "zone-42", name: "الفيوم", code: "PLACE_42", is_active: true },
  { id: "zone-43", name: "القاهرة", code: "PLACE_43", is_active: true },
  { id: "zone-44", name: "القليوبية", code: "PLACE_44", is_active: true },
  { id: "zone-45", name: "المحلة", code: "PLACE_45", is_active: true },
  { id: "zone-46", name: "المطرية (75ك م)", code: "PLACE_46", is_active: true },
  { id: "zone-47", name: "المعادي", code: "PLACE_47", is_active: true },
  { id: "zone-48", name: "المقطم", code: "PLACE_48", is_active: true },
  { id: "zone-49", name: "المنزلة", code: "PLACE_49", is_active: true },
  { id: "zone-50", name: "المنصورة", code: "PLACE_50", is_active: true },
  { id: "zone-51", name: "المنوفية", code: "PLACE_51", is_active: true },
  { id: "zone-52", name: "المنيا", code: "PLACE_52", is_active: true },
  { id: "zone-53", name: "الهرم", code: "PLACE_53", is_active: true },
  { id: "zone-54", name: "الوسطي", code: "PLACE_54", is_active: true },
  { id: "zone-55", name: "أسوان", code: "PLACE_55", is_active: true },
  { id: "zone-56", name: "أشمون", code: "PLACE_56", is_active: true },
  { id: "zone-57", name: "أيتاي", code: "PLACE_57", is_active: true },
  { id: "zone-58", name: "ببا", code: "PLACE_58", is_active: true },
  { id: "zone-59", name: "برج العرب", code: "PLACE_59", is_active: true },
  { id: "zone-60", name: "بلطيم", code: "PLACE_60", is_active: true },
  { id: "zone-61", name: "بلقاس", code: "PLACE_61", is_active: true },
  { id: "zone-62", name: "بن", code: "PLACE_62", is_active: true },
  { id: "zone-63", name: "بنها", code: "PLACE_63", is_active: true },
  { id: "zone-64", name: "بني سويف", code: "PLACE_64", is_active: true },
  { id: "zone-65", name: "بني مزار", code: "PLACE_65", is_active: true },
  { id: "zone-66", name: "بورسعيد", code: "PLACE_66", is_active: true },
  { id: "zone-67", name: "جرجا", code: "PLACE_67", is_active: true },
  { id: "zone-68", name: "حسينية", code: "PLACE_68", is_active: true },
  { id: "zone-69", name: "حلوان", code: "PLACE_69", is_active: true },
  { id: "zone-70", name: "حوش عيسي", code: "PLACE_70", is_active: true },
  { id: "zone-71", name: "دار السلام", code: "PLACE_71", is_active: true },
  { id: "zone-72", name: "دكرنس", code: "PLACE_72", is_active: true },
  { id: "zone-73", name: "دمنهور", code: "PLACE_73", is_active: true },
  { id: "zone-74", name: "دمياط", code: "PLACE_74", is_active: true },
  { id: "zone-75", name: "ديرمواس", code: "PLACE_75", is_active: true },
  { id: "zone-76", name: "ديروط", code: "PLACE_76", is_active: true },
  { id: "zone-77", name: "راس البر", code: "PLACE_77", is_active: true },
  { id: "zone-78", name: "راس غارب", code: "PLACE_78", is_active: true },
  { id: "zone-79", name: "رشيد", code: "PLACE_79", is_active: true },
  { id: "zone-80", name: "سفاجا", code: "PLACE_80", is_active: true },
  { id: "zone-81", name: "سمالوط", code: "PLACE_81", is_active: true },
  { id: "zone-82", name: "سنورس", code: "PLACE_82", is_active: true },
  { id: "zone-83", name: "سوهاج", code: "PLACE_83", is_active: true },
  { id: "zone-84", name: "شبرا الخيمة", code: "PLACE_84", is_active: true },
  { id: "zone-85", name: "شبين الكوم", code: "PLACE_85", is_active: true },
  { id: "zone-86", name: "شرق القاهره", code: "PLACE_86", is_active: true },
  { id: "zone-87", name: "شرم الشيخ", code: "PLACE_87", is_active: true },
  { id: "zone-88", name: "طما", code: "PLACE_88", is_active: true },
  { id: "zone-89", name: "طنطا", code: "PLACE_89", is_active: true },
  { id: "zone-90", name: "طهطا", code: "PLACE_90", is_active: true },
  { id: "zone-91", name: "فارسكور", code: "PLACE_91", is_active: true },
  { id: "zone-92", name: "فاقوس", code: "PLACE_92", is_active: true },
  { id: "zone-93", name: "فيصل", code: "PLACE_93", is_active: true },
  { id: "zone-94", name: "قنا", code: "PLACE_94", is_active: true },
  { id: "zone-95", name: "قوص", code: "PLACE_95", is_active: true },
  { id: "zone-96", name: "قوصية", code: "PLACE_96", is_active: true },
  { id: "zone-97", name: "كفر الدوار", code: "PLACE_97", is_active: true },
  { id: "zone-98", name: "كفر الشيخ", code: "PLACE_98", is_active: true },
  { id: "zone-99", name: "كوم حمادة", code: "PLACE_99", is_active: true },
  { id: "zone-100", name: "مدينة السلام", code: "PLACE_100", is_active: true },
  { id: "zone-101", name: "مدينة بدر", code: "PLACE_101", is_active: true },
  { id: "zone-102", name: "مدينتي", code: "PLACE_102", is_active: true },
  { id: "zone-103", name: "مرسى مطروح", code: "PLACE_103", is_active: true },
  { id: "zone-104", name: "مطوبس", code: "PLACE_104", is_active: true },
  { id: "zone-105", name: "مغاغة", code: "PLACE_105", is_active: true },
  { id: "zone-106", name: "ملوي", code: "PLACE_106", is_active: true },
  { id: "zone-107", name: "منية النصر", code: "PLACE_107", is_active: true },
  { id: "zone-108", name: "ميت غمر", code: "PLACE_108", is_active: true },
  { id: "zone-109", name: "نجع حمادي", code: "PLACE_109", is_active: true },
  { id: "zone-110", name: "نوبارية", code: "PLACE_110", is_active: true },
];

export async function fetchTravelZonesAction() {
  const { dbGet } = await import('@/lib/db/mysqlClient');
  try {
    const rows = await dbGet('TravelZones');
    if (rows && rows.length > 0) {
      return rows.map((r: any) => ({
        id: r.TravelZoneID,
        name: r.TravelZoneName,
        code: r.TravelZoneCode,
        is_active: r.IsActive,
      }));
    }
  } catch (e) {}

  return EGYPT_MASTER_TRAVEL_PLACES;
}

export async function saveTravelZoneAction(payload: {
  id?: string;
  name: string;
  code: string;
  is_active: boolean;
}) {
  const { dbCreate, dbUpdate } = await import('@/lib/db/mysqlClient');
  const record = {
    TravelZoneName: payload.name,
    TravelZoneCode: payload.code,
    IsActive: payload.is_active,
  };
  try {
    if (payload.id) {
      await dbUpdate('TravelZones', payload.id, record);
    } else {
      await dbCreate('TravelZones', record);
    }
  } catch (e) {
    console.warn('database travel_zones save fallback:', e);
  }
  revalidatePath('/admin/policies');
  return { success: true };
}

export async function deleteTravelZoneAction(id: string) {
  const { dbDelete } = await import('@/lib/db/mysqlClient');
  try {
    await dbDelete('TravelZones', id);
  } catch (e) {}
  revalidatePath('/admin/policies');
  return { success: true };
}

function normalizeRole(role: string): string {
  // Strip 'role-' prefix if present (e.g., 'role-agent' -> 'agent', 'role-selfservice' -> 'selfservice')
  const cleaned = role.replace(/^role-/, '');
  // Map legacy database roles to the expected role names
  const roleMap: Record<string, string> = {
    'standard': 'selfservice',
    'approver': 'agent',
  };
  return roleMap[cleaned] || cleaned;
}

export async function fetchSystemUsersAction() {
  const now = Date.now();
  if (cachedUsers && now - cachedUsers.timestamp < CACHE_TTL_MS) {
    return cachedUsers.data;
  }
  const { dbGet } = await import('@/lib/db/mysqlClient');
  try {
    const rows = await dbGet('Users');
    if (rows && rows.length > 0) {
      const data = rows.map((r: any) => {
        const rawRole = r.Role || 'selfservice';
        const role = normalizeRole(rawRole);
        let roles: string[];
        if (r.RolesJson) {
          roles = r.RolesJson.map(normalizeRole);
        } else if (Array.isArray(r.Roles)) {
          roles = r.Roles.map(normalizeRole);
        } else {
          roles = [role];
        }
        return {
          id: r.UserID,
          name: r.UserName,
          email: r.UserEmail,
          department_id: r.DepartmentID,
          job_title: r.JobTitle,
          direct_manager_id: r.DirectManagerUserID,
          unit: r.Unit,
          avatar_initials: r.AvatarInitials,
          is_active: r.IsActive,
          username: r.LoginName, 
          phone: r.Phone,
          role,
          roles,
          role_raw: rawRole,
          group_ids: r.GroupIDsJson || [],
          group_ids_json: r.GroupIDsJson || [],
        };
      });
      cachedUsers = { data, timestamp: now };
      return data;
    }
  } catch (e) {
    console.error('database system_users fetch error:', e);
  }
  const { SYSTEM_USERS } = await import('@/lib/engine/iamStore');
  return SYSTEM_USERS;
}

export async function saveSystemUserAction(payload: {
  id?: string;
  name: string;
  email: string;
  department_id: string;
  group_ids: string[];
  role: 'admin' | 'selfservice' | string;
  roles?: ('admin' | 'selfservice' | 'agent')[];
  avatar_initials: string;
  job_title?: string;
  direct_manager_id?: string;
  unit?: string;
  is_active?: boolean;
  phone?: string;
  delegated_user_id?: string;
  delegation_enabled?: boolean | number;
  delegation_start_date?: string;
  delegation_end_date?: string;
  delegation_notes?: string;
  can_assign_group_tickets?: boolean | number;
  username?: string;
  password?: string;
  auth_type?: 'password' | 'microsoft' | 'both';
}) {
  const { dbCreate, dbUpdate } = await import('@/lib/db/mysqlClient');
  const role = payload.role || 'selfservice';
  const roles = payload.roles || [role];
  const record: Record<string, any> = {
    UserName: payload.name,
    UserEmail: payload.email,
    DepartmentID: payload.department_id || null,
    Role: role,
    RolesJson: roles,
    AvatarInitials: payload.avatar_initials || '',
    JobTitle: payload.job_title || '',
    DirectManagerUserID: payload.direct_manager_id || null,
    Unit: payload.unit || '',
    GroupIDsJson: payload.group_ids || [],
    IsActive: payload.is_active === undefined ? 1 : payload.is_active,
  };

  // Local credentials
  if (payload.username !== undefined) record.LoginName = payload.username;
  if (payload.auth_type) record.AuthType = payload.auth_type;
  if (payload.phone !== undefined) record.Phone = payload.phone;
  if (payload.delegated_user_id !== undefined) record.DelegatedUserId = payload.delegated_user_id;
  if (payload.delegation_enabled !== undefined) record.DelegationEnabled = payload.delegation_enabled;
  if (payload.delegation_start_date !== undefined) record.DelegationStartDate = payload.delegation_start_date;
  if (payload.delegation_end_date !== undefined) record.DelegationEndDate = payload.delegation_end_date;
  if (payload.delegation_notes !== undefined) record.DelegationNotes = payload.delegation_notes;
  if (payload.can_assign_group_tickets !== undefined) record.CanAssignGroupTickets = payload.can_assign_group_tickets;

  // Hash new/cleartext passwords (skip masked placeholders from the edit form).
  if (payload.password && payload.password.trim() && !payload.password.includes('••')) {
    const bcrypt = await import('bcryptjs');
    record.PasswordHash = await bcrypt.hash(payload.password, 10);
  }
  if (payload.username !== undefined || payload.password) {
    record.AuthType = payload.auth_type || 'password';
  }

  try {
    if (payload.id) {
      await dbUpdate('Users', payload.id, record);
    } else {
      await dbCreate('Users', {
        ...record,
        UserID: payload.id || `user-${Date.now()}`,
      });
    }
  } catch (e) {
    console.error('database system_users save error:', e);
  }
  revalidatePath('/admin/users');
  revalidatePath('/');
  invalidateActionCache();
  return { success: true };
}

export async function fetchBusinessGroupsAction() {
  const { dbGet } = await import('@/lib/db/mysqlClient');
  try {
    const rows = await dbGet('BusinessGroups');
    if (rows && rows.length > 0) {
      return rows.map((r: any) => ({
        id: r.BusinessGroupID,
        name: r.BusinessGroupName,
        code: r.BusinessGroupCode,
        is_active: r.IsActive,
        member_user_ids: r.MemberUserIDsJson || [],
        member_user_ids_json: r.MemberUserIDsJson || [],
      }));
    }
  } catch (e) {
    console.error('database business_groups fetch error:', e);
  }
  const { BUSINESS_GROUPS } = await import('@/lib/engine/iamStore');
  return BUSINESS_GROUPS;
}

export async function saveBusinessGroupAction(payload: {
  id?: string;
  name: string;
  code: string;
  member_user_ids: string[];
  is_active?: boolean;
  manager_id?: string;
}) {
  const { dbCreate, dbUpdate } = await import('@/lib/db/mysqlClient');
  const record = {
    BusinessGroupName: payload.name,
    BusinessGroupCode: payload.code,
    MemberUserIDsJson: payload.member_user_ids,
    IsActive: payload.is_active === undefined ? 1 : payload.is_active,
    ManagerUserID: payload.manager_id || null,
  };

  try {
    if (payload.id) {
      await dbUpdate('BusinessGroups', payload.id, record);
    } else {
      await dbCreate('BusinessGroups', {
        ...record,
        BusinessGroupID: payload.id || `group-${Date.now()}`,
      });
    }
  } catch (e) {
    console.error('database business_groups save error:', e);
  }
  revalidatePath('/admin/users');
  return { success: true };
}

export async function saveDepartmentAction(payload: {
  id?: string;
  name: string;
  code: string;
  head_user_id?: string;
  parent_department_id?: string | null;
}) {
  const { dbCreate, dbUpdate } = await import('@/lib/db/mysqlClient');
  const record = {
    DepartmentName: payload.name,
    DepartmentCode: payload.code,
    HeadUserID: payload.head_user_id || null,
    ParentDepartmentID: payload.parent_department_id || null,
  };
  try {
    if (payload.id) {
      await dbUpdate('Departments', payload.id, record);
    } else {
      await dbCreate('Departments', {
        ...record,
        DepartmentID: `dept-${payload.code.toLowerCase().trim()}`,
      });
    }
  } catch (e) {
    console.error('database departments save error:', e);
  }
  revalidatePath('/admin/users');
  return { success: true };
}

export async function fetchPolicyTravelRatesAction(policyId?: string, userId?: string) {
  const { dbGet } = await import('@/lib/db/mysqlClient');
  
  if (policyId) {
    return await dbGet('policy_travel_rates', { policy_id: { _eq: policyId } });
  }

  // 1. Fetch all active policies
  const policies = await fetchPoliciesAction();
  const activePolicies = policies.filter((p: any) => p.is_active !== false);

  if (!activePolicies || activePolicies.length === 0) return await dbGet('policy_travel_rates');

  // 2. Fetch target user if userId provided
  let targetUser: any = null;
  if (userId) {
    const users = await fetchSystemUsersAction();
    targetUser = users.find((u: any) => 
      u.id === userId || 
      u.email?.toLowerCase().trim() === userId.toLowerCase().trim() ||
      u.name?.toLowerCase().trim() === userId.toLowerCase().trim()
    ) || null;
  }

  // If user is Admin or no user specified, return all active policy rates
  if (!targetUser || targetUser.role === 'admin') {
    return await dbGet('policy_travel_rates');
  }

  // Filter policies matching user's department or business groups (Direct + Reverse Member Lookup with Multi-Token Matching)
  const userDeptId = targetUser?.department_id ? String(targetUser.department_id).toLowerCase().trim() : '';
  const userDirectGroups: string[] = targetUser?.group_ids || targetUser?.group_ids_json || [];

  const dbGroups = await fetchBusinessGroupsAction();
  const matchedUserGroupTokens = new Set<string>();

  // Collect group tokens from direct groups
  for (const gVal of userDirectGroups) {
    if (!gVal) continue;
    const cleanVal = String(gVal).toLowerCase().trim();
    matchedUserGroupTokens.add(cleanVal);

    const foundG = (dbGroups || []).find((bg: any) => 
      String(bg.id).toLowerCase().trim() === cleanVal || 
      String(bg.code || '').toLowerCase().trim() === cleanVal || 
      String(bg.name || '').toLowerCase().trim() === cleanVal
    );
    if (foundG) {
      if (foundG.id) matchedUserGroupTokens.add(String(foundG.id).toLowerCase().trim());
      if (foundG.code) matchedUserGroupTokens.add(String(foundG.code).toLowerCase().trim());
      if (foundG.name) matchedUserGroupTokens.add(String(foundG.name).toLowerCase().trim());
    }
  }

  // Collect group tokens from reverse group membership lookup
  for (const bg of (dbGroups || [])) {
    const members = (bg as any).member_user_ids || (bg as any).member_user_ids_json || [];
    const isMember = Array.isArray(members) && members.some((m: any) => {
      if (!m) return false;
      const cleanM = String(m).toLowerCase().trim();
      return (
        cleanM === String(targetUser.id).toLowerCase().trim() ||
        (targetUser.email && cleanM === String(targetUser.email).toLowerCase().trim()) ||
        (targetUser.name && cleanM === String(targetUser.name).toLowerCase().trim())
      );
    });

    if (isMember) {
      if (bg.id) matchedUserGroupTokens.add(String(bg.id).toLowerCase().trim());
      if (bg.code) matchedUserGroupTokens.add(String(bg.code).toLowerCase().trim());
      if (bg.name) matchedUserGroupTokens.add(String(bg.name).toLowerCase().trim());
    }
  }

  const matchedPolicies = activePolicies.filter((pol: any) => {
    // If apply_to_all is true
    if (pol.apply_to_all === true || pol.apply_to_all === 1) return true;
    
    // Check department match
    const depts: string[] = pol.department_ids_json || (pol.department_id ? [pol.department_id] : []);
    if (depts.length > 0 && userDeptId) {
      const hasDeptMatch = depts.some((d: string) => String(d).toLowerCase().trim() === userDeptId);
      if (hasDeptMatch) return true;
    }

    // Check group match (Direct or Member in Group)
    const groups: string[] = pol.group_ids_json || [];
    if (groups.length > 0 && matchedUserGroupTokens.size > 0) {
      const hasGroupMatch = groups.some((g: string) => matchedUserGroupTokens.has(String(g).toLowerCase().trim()));
      if (hasGroupMatch) return true;
    }

    // If policy has no depts and no groups defined, it applies to all by default
    if ((!depts || depts.length === 0) && (!groups || groups.length === 0)) return true;

    return false;
  });

  const targetPolicies = matchedPolicies.length > 0 ? matchedPolicies : activePolicies;
  const matchedPolicyIds = targetPolicies.map((p: any) => p.id);
  const allRates = await dbGet('policy_travel_rates');
  
  const filteredRates = allRates.filter((r: any) => matchedPolicyIds.includes(r.policy_id));
  return filteredRates.length > 0 ? filteredRates : allRates;
}

export async function savePolicyTravelRatesAction(policyId: string, rates: any[]) {
  const { dbDeleteWhere, dbBulkCreate } = await import('@/lib/db/mysqlClient');
  try {
    // 1. Single SQL Query Bulk Delete (5ms)
    await dbDeleteWhere('policy_travel_rates', 'policy_id', policyId);
    
    // 2. Chunked Multi-row Batch INSERT (500 rows per query chunk ~100ms)
    if (rates && rates.length > 0) {
      const payloads = rates.map((row) => ({
        id: row.id || `tr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        policy_id: policyId,
        zone_from_id: row.zone_from_id || row.zone_from || '',
        zone_to_id: row.zone_to_id || row.zone_to || '',
        meal_price: Number(row.meal_price || 0),
        meal_overnight_price: Number(row.meal_overnight_price || 0),
        transport_allowance: Number(row.transport_allowance || 0),
      }));

      await dbBulkCreate('policy_travel_rates', payloads);
    }
  } catch (e) {
    console.error('Error saving policy travel rates in bulk:', e);
  }
  
  revalidatePath('/admin/policies');
  revalidatePath('/requests/new');
  return { success: true };
}

export async function runWorkflowSimulationAction(
  workflowId: string,
  initialFormData: Record<string, any>,
  triggerRules: any[]
) {
  const { runWorkflowSimulation } = await import('@/lib/engine/simulationEngine');
  const { dbCreate } = await import('@/lib/db/mysqlClient');
  
  const result = await runWorkflowSimulation(workflowId, initialFormData, triggerRules);
  
  try {
    await dbCreate('workflow_simulations', {
      id: `sim-${Date.now()}`,
      workflow_id: workflowId,
      name: `Simulation Run - ${new Date().toLocaleTimeString()}`,
      description: `Tested ${Object.keys(initialFormData).length} fields with ${triggerRules.length} rules`,
      trigger_rules_json: triggerRules,
      initial_form_data: initialFormData,
      execution_path_json: result.executionPath,
      created_by: 'System Admin'
    });
  } catch (e) {
    console.error('Failed to save simulation history:', e);
  }
  
  return result;
}

export async function fetchWorkflowSimulationsAction(workflowId: string) {
  const { dbGet } = await import('@/lib/db/mysqlClient');
  try {
    return await dbGet('workflow_simulations', { workflow_id: { _eq: workflowId } }, '-created_at');
  } catch (e) {
    return [];
  }
}

export async function deleteWorkflowSimulationAction(id: string) {
  const { dbDelete } = await import('@/lib/db/mysqlClient');
  try {
    await dbDelete('workflow_simulations', id);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Update Ticket Classification & Info Metadata
 */
export async function updateTicketClassificationAction(
  requestId: string,
  updates: {
    status?: string;
    priority?: string;
    urgency?: string;
    impact?: string;
    subcategory_id?: string;
    location_id?: string;
    unit?: string;
    assigned_group?: string;
    assigned_user?: string;
    requester_name?: string;
    requester_department?: string;
    observer_id?: string;
    sla_tto_deadline?: string;
    sla_ttr_deadline?: string;
    sla_deadline?: string;
  }
) {
  const { dbUpdate, dbGet } = await import('@/lib/engine/store');
  
  const ticketUpdates: Record<string, any> = {};
  if (updates.status !== undefined) ticketUpdates.Status = updates.status;
  if (updates.priority !== undefined) ticketUpdates.Priority = updates.priority;
  if (updates.urgency !== undefined) ticketUpdates.Urgency = updates.urgency;
  if (updates.impact !== undefined) ticketUpdates.Impact = updates.impact;
  if (updates.subcategory_id !== undefined) ticketUpdates.SubcategoryID = updates.subcategory_id;
  if (updates.location_id !== undefined) ticketUpdates.LocationID = updates.location_id;
  if (updates.unit !== undefined) ticketUpdates.Unit = updates.unit;
  if (updates.assigned_group !== undefined) ticketUpdates.AssignedGroup = updates.assigned_group;
  if (updates.assigned_user !== undefined) ticketUpdates.AssignedUser = updates.assigned_user;
  if (updates.requester_name !== undefined) ticketUpdates.RequesterName = updates.requester_name;
  if (updates.requester_department !== undefined) ticketUpdates.RequesterDepartment = updates.requester_department;
  if (updates.observer_id !== undefined) ticketUpdates.ObserverUserID = updates.observer_id;
  if (updates.sla_tto_deadline !== undefined) ticketUpdates.SlaTtoDeadline = updates.sla_tto_deadline;
  if (updates.sla_ttr_deadline !== undefined) ticketUpdates.SlaTtrDeadline = updates.sla_ttr_deadline;
  if (updates.sla_deadline !== undefined) ticketUpdates.SlaDeadline = updates.sla_deadline;

  await dbUpdate('Tickets', requestId, ticketUpdates);

  try {
    const existingValues = await dbGet('TicketValues', { TicketID: { _eq: requestId } });
    for (const valRow of existingValues) {
      if (valRow.FieldKey === 'glpi_urgency' && updates.urgency) {
        await dbUpdate('TicketValues', valRow.TicketValueID, { ValueText: updates.urgency });
      }
      if (valRow.FieldKey === 'glpi_category' && updates.subcategory_id) {
        await dbUpdate('TicketValues', valRow.TicketValueID, { ValueText: updates.subcategory_id });
      }
      if (valRow.FieldKey === 'glpi_location' && updates.location_id) {
        await dbUpdate('TicketValues', valRow.TicketValueID, { ValueText: updates.location_id });
      }
    }
  } catch (e) {
    console.warn('[updateTicketClassificationAction ticket_values warning]', e);
  }

  revalidatePath(`/requests/${requestId}`);
  revalidatePath('/requests');
  revalidatePath('/approvals');
  return { success: true };
}

export async function assignTicketUserAction(ticketId: string, assignedUser: string, actorName: string) {
  const now = new Date().toISOString();
  
  // Calculate SLA TTO takeover duration
  const { dbGetOne } = await import('@/lib/db/mysqlClient');
  const ticket = await dbGetOne('Tickets', ticketId);
  const previousAssignee = ticket?.AssignedUser || '';
  let slaTtoLog = '';
  if (ticket) {
    const ttoStart = new Date(ticket.DateCreated).getTime();
    const ttoElapsedMs = Date.now() - ttoStart;
    const ttoElapsedMins = Math.round(ttoElapsedMs / 60000);
    const ttoElapsedStr = ttoElapsedMins >= 60 ? `${Math.floor(ttoElapsedMins / 60)}h ${ttoElapsedMins % 60}m` : `${ttoElapsedMins}m`;

    const wf = await dbGetOne('Workflows', ticket.WorkflowID);
    const panelCfg = wf?.VisibilityRulesJson?.ticket_info_panel_config || wf?.visibility_rules?.ticket_info_panel_config || {};
    const ttoTargetStr = panelCfg.defaultSlaTto || '1 Hour';
    slaTtoLog = `\n\n[SLA Tracker]: SLA TTO (Takeover) completed. Time taken: ${ttoElapsedStr}. Target was: ${ttoTargetStr}.`;
  }

  await dbUpdate('Tickets', ticketId, {
    AssignedUser: assignedUser,
    DateUpdated: now,
  });

  // Create audit comment log
  await dbCreate('ApprovalLog', {
    ApprovalLogID: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    TicketID: ticketId,
    Action: 'commented',
    ActorUserName: actorName,
    Comments: `Ticket assigned to employee: ${assignedUser} by ${actorName}.${slaTtoLog}`,
    DecisionAt: now,
  });

  // ── Notification: assignment
  const { notify } = await import('@/lib/notifications/notifier');
  try {
    // Notify the new assignee.
    void notify({
      eventType: 'assigned_to_you',
      ticket: { ...(ticket || {}), TicketID: ticketId, AssignedUser: assignedUser },
      ticketId,
      ticketNumber: ticket?.TicketNumber,
      actorId: actorName,
      actorName,
      recipients: [assignedUser],
    });
    // If the ticket was reassigned from someone else, inform the previous assignee.
    if (previousAssignee && previousAssignee !== assignedUser) {
      void notify({
        eventType: 'assignment_changed',
        ticket: { ...(ticket || {}), TicketID: ticketId },
        ticketId,
        ticketNumber: ticket?.TicketNumber,
        actorId: actorName,
        actorName,
        recipients: [previousAssignee],
        metadata: { previousAssignees: [previousAssignee] as string[] },
      });
    }
  } catch (e) {
    console.warn('[assignment notification failed]', e);
  }

  revalidatePath('/requests');
  revalidatePath(`/requests/${ticketId}`);
  return { success: true };
}