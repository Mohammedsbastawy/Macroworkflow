/**
 * Notification System — Routing & Targeting.
 *
 * Resolves the exact recipient set (concrete `user-*` ids) for each event
 * using the IAM relations: system_users, business_groups, departments,
 * ticket observers / assignees / requester.
 *
 * Group/role/dept targets are expanded to concrete users at WRITE time.
 */

import { dbGet } from '@/lib/db/mysqlClient';
import {
  NotificationContext,
  NotificationEventType,
  NotificationMetadata,
  NotificationPriority,
} from './types';

let usersCache: any[] | null = null;
let groupsCache: any[] | null = null;
let deptsCache: any[] | null = null;

async function getUsers(): Promise<any[]> {
  if (usersCache) return usersCache;
  try {
    const rows = await dbGet('Users');
    usersCache = rows.map((u: any) => ({
      id: u.UserID ?? u.id,
      name: u.UserName ?? u.name,
      email: u.UserEmail ?? u.email,
      role: u.Role ?? u.role ?? 'selfservice',
      roles: u.RolesJson ?? u.roles_json ?? (u.Roles ? (Array.isArray(u.Roles) ? u.Roles : [u.Role]) : [u.Role ?? 'selfservice']),
      department_id: u.DepartmentID ?? u.department_id,
      group_ids: u.GroupIDsJson ?? u.group_ids_json ?? [],
    }));
  } catch (e) {
    usersCache = [];
  }
  return usersCache;
}

async function getGroups(): Promise<any[]> {
  if (groupsCache) return groupsCache;
  try {
    groupsCache = (await dbGet('BusinessGroups')).map((g: any) => ({
      id: g.BusinessGroupID ?? g.id,
      name: g.BusinessGroupName ?? g.name,
      code: g.BusinessGroupCode ?? g.code,
      member_user_ids: g.MemberUserIDsJson ?? g.member_user_ids_json ?? [],
    }));
  } catch (e) {
    groupsCache = [];
  }
  return groupsCache;
}

async function getDepartments(): Promise<any[]> {
  if (deptsCache) return deptsCache;
  try {
    deptsCache = (await dbGet('Departments')).map((d: any) => ({
      id: d.DepartmentID ?? d.id,
      name: d.DepartmentName ?? d.name,
      code: d.DepartmentCode ?? d.code,
      head_user_id: d.HeadUserID ?? d.head_user_id,
      manager_id: d.ManagerUserID ?? d.manager_id,
    }));
  } catch (e) {
    deptsCache = [];
  }
  return deptsCache;
}

/** Expand a group id/code/name to member user ids. */
export async function expandGroup(groupRef: string): Promise<string[]> {
  if (!groupRef) return [];
  const groups = await getGroups();
  const g = groups.find(
    (bg) =>
      String(bg.id).toLowerCase() === String(groupRef).toLowerCase() ||
      String(bg.name || '').toLowerCase() === String(groupRef).toLowerCase() ||
      String(bg.code || '').toLowerCase() === String(groupRef).toLowerCase()
  );
  return g ? (g.member_user_ids || []).map(String) : [groupRef];
}

/** Users holding a given normalized role across a department. */
export async function usersByRoleInDept(deptId: string | undefined, role: string): Promise<string[]> {
  if (!deptId) return [];
  const normDept = String(deptId).toLowerCase();
  const users = await getUsers();
  return users
    .filter((u) => {
      const userDept = String(u.department_id || '').toLowerCase();
      const roles = (u.roles || []).map((r: string) => String(r).toLowerCase());
      const rawRole = String(u.role || '').toLowerCase();
      return userDept === normDept && (roles.includes(role) || rawRole === role);
    })
    .map((u) => u.id);
}

/** Department manager (head) user id. */
export async function deptManagerId(deptId: string | undefined): Promise<string | undefined> {
  if (!deptId) return undefined;
  const depts = await getDepartments();
  const d = depts.find((x) => String(x.id).toLowerCase() === String(deptId).toLowerCase());
  return d?.head_user_id || d?.manager_id || undefined;
}

/** Resolve concrete assignee ids for a ticket (users + group members). */
export async function resolveTicketAssignees(ticket: any): Promise<string[]> {
  if (!ticket) return [];
  const ids = new Set<string>();
  const assignees = ticket.CurrentAssigneesJson ?? ticket.current_assignees_json ?? [];
  const assignedUser = ticket.AssignedUser ?? ticket.assigned_user;
  const assignedGroup = ticket.AssignedGroup ?? ticket.assigned_group;
  for (const a of assignees) {
    for (const resolved of await expandGroup(a)) ids.add(String(resolved));
  }
  if (assignedUser) ids.add(String(assignedUser));
  if (assignedGroup) {
    for (const m of await expandGroup(assignedGroup)) ids.add(String(m));
  }
  return Array.from(ids);
}

/** Resolve observer user ids (normalized table + legacy comma-separated). */
export async function resolveTicketObservers(ticket: any): Promise<string[]> {
  if (!ticket) return [];
  const ids = new Set<string>();
  const ticketId = ticket.TicketID ?? ticket.id;
  const observerId = ticket.ObserverUserID ?? ticket.observer_id;
  try {
    const rows = await dbGet('TicketObservers', { TicketID: { _eq: ticketId } });
    for (const r of rows) if (r.UserID) ids.add(String(r.UserID));
  } catch (e) {
    /* non-fatal */
  }
  if (observerId) {
    for (const o of String(observerId).split(',')) if (o) ids.add(o.trim());
  }
  return Array.from(ids);
}

/**
 * Normalize a recipient token so a user referenced by display name — e.g.
 * "Mona Omar (CFO)" or the real stored value
 * "Mona Omar (Finance Manager / CFO) (Chief Financial Officer (CFO))" — still
 * matches the user's bare name "Mona Omar". Everything from the first `(` onward
 * is treated as an appended job-title suffix and dropped before comparing by
 * name. Exact id / email / full-name matches are still tried first.
 */
function normName(value: string): string {
  const s = String(value || '');
  const idx = s.indexOf('(');
  return (idx >= 0 ? s.slice(0, idx) : s).toLowerCase().trim();
}

/** Remove self-bound recipients and honor role capability gate. */
async function finalize(recipients: string[], actorId: string, gate: (user: any) => boolean, allowSelf = false): Promise<string[]> {
  const users = await getUsers();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of recipients) {
    if (!r) continue;
    const rl = String(r);
    const rlNorm = normName(rl);
    const u = users.find((x) => {
      const id = String(x.id || '').toLowerCase();
      const nm = String(x.name || '').toLowerCase();
      const em = String(x.email || '').toLowerCase();
      if (id === rl.toLowerCase() || em === rl.toLowerCase() || nm === rl.toLowerCase()) return true;
      return !!rlNorm && (id === rlNorm || nm === rlNorm || em === rlNorm);
    });
    if (!u) continue;
    if (!allowSelf && String(u.id).toLowerCase() === String(actorId).toLowerCase()) continue; // self-suppression
    if (gate && !gate(u)) continue; // capability gate
    const key = String(u.id).toLowerCase();
    if (seen.has(key)) continue; // dedup
    seen.add(key);
    out.push(u.id);
  }
  return out;
}

// Capability gates (role-based, per plan §1.3).
const gateAssignee = (u: any) => true; // assignees/agents/admins + standard observers allowed
const gateBreach = (u: any) => {
  const roles = (u.roles || []).map((r: string) => String(r).toLowerCase());
  return roles.includes('agent') || roles.includes('admin') || String(u.role || '').toLowerCase() === 'admin';
};
const gateInternal = (u: any) => {
  const roles = (u.roles || []).map((r: string) => String(r).toLowerCase());
  return roles.includes('agent') || roles.includes('admin') || String(u.role || '').toLowerCase() === 'admin';
};

/**
 * Core routing matrix — resolve recipient ids for an event.
 * `recipients` in context (if provided) takes precedence.
 */
export async function resolveRecipients(ctx: NotificationContext): Promise<string[]> {
  if (ctx.recipients && ctx.recipients.length > 0) {
    return finalize(ctx.recipients, ctx.actorId, gateAssignee);
  }
  const t = ctx.ticket;
  const tv = (name: string) => (t ? (t[name] ?? t[{
    requester_id: 'RequesterUserID', requester_name: 'RequesterName', current_step_order: 'CurrentStepOrder', priority: 'Priority', id: 'TicketID', requester_department_id: 'RequesterDepartmentID', ticket_number: 'TicketNumber',
  }[name] as any]) : undefined);
  const requester = tv('requester_id') || tv('requester_name');
  switch (ctx.eventType) {
    case 'request_submitted': {
      // Requester gets a confirmation (allowSelf regardless of actor id).
      // The assigned approver is notified separately via `approval_requested`.
      return finalize([requester], ctx.actorId, gateAssignee, true);
    }
    case 'approval_requested': {
      // Notify the current approver/assignee that a request awaits their approval.
      const approvers = await resolveTicketAssignees(t);
      return finalize(approvers, ctx.actorId, gateAssignee);
    }
    case 'assigned_to_you': {
      const assignees = await resolveTicketAssignees(t);
      return finalize(assignees, ctx.actorId, gateAssignee);
    }
    case 'assignment_changed': {
      const prev = ctx.metadata?.previousAssignees as string[] | undefined || [];
      const assignees = await resolveTicketAssignees(t);
      return finalize([...prev, requester], ctx.actorId, gateAssignee);
    }
    case 'approved': {
      const nextAssignees = (await resolveTicketAssignees(t)).filter((a) => a !== ctx.actorId);
      const observers = await resolveTicketObservers(t);
      return finalize([requester, ...nextAssignees, ...observers], ctx.actorId, gateAssignee);
    }
    case 'rejected':
    case 'returned_for_revision': {
      const observers = await resolveTicketObservers(t);
      return finalize([requester, ...observers], ctx.actorId, gateAssignee);
    }
    case 'rfi_sent': {
      // RFI reaches everyone involved in the ticket: requester, tech
      // group/assignee, and CC'd observers.
      const assignees = await resolveTicketAssignees(t);
      const observers = await resolveTicketObservers(t);
      return finalize([requester, ...assignees, ...observers], ctx.actorId, gateAssignee);
    }
    case 'rfi_answered': {
      // The RFI reply is announced to everyone on the ticket, not just the staff.
      const assignees = await resolveTicketAssignees(t);
      const observers = await resolveTicketObservers(t);
      return finalize([requester, ...assignees, ...observers], ctx.actorId, gateAssignee);
    }
    case 'comment_added': {
      const assignees = await resolveTicketAssignees(t);
      const observers = await resolveTicketObservers(t);
      return finalize([requester, ...assignees, ...observers], ctx.actorId, gateAssignee);
    }
    case 'internal_note_added': {
      const assignees = await resolveTicketAssignees(t);
      const observers = await resolveTicketObservers(t);
      // Only agents/admins ever see internal notes (never selfservice requester).
      return finalize([...assignees, ...observers], ctx.actorId, gateInternal);
    }
    case 'ticket_closed': {
      return finalize([requester], ctx.actorId, gateAssignee);
    }
    case 'sla_breached': {
      const assignees = await resolveTicketAssignees(t);
      const dept = tv('requester_department_id') || undefined;
      const deptAgents = dept ? await usersByRoleInDept(dept, 'agent') : [];
      const manager = dept ? await deptManagerId(dept) : undefined;
      return finalize([...assignees, ...deptAgents, ...(manager ? [manager] : [])], ctx.actorId, gateBreach);
    }
    case 'ola_breached': {
      const assignees = await resolveTicketAssignees(t);
      const escalationTarget: string[] = [];
      const targetId = (t?.OlaEscalationTargetId ?? t?.ola_escalation_target_id) || ctx.metadata?.escalationTargetId;
      if (targetId) escalationTarget.push(String(targetId));
      return finalize([...assignees, ...escalationTarget], ctx.actorId, gateAssignee);
    }
    case 'ola_escalated': {
      const targetId = (t?.OlaEscalationTargetId ?? t?.ola_escalation_target_id) || ctx.metadata?.escalationTargetId;
      return finalize([String(targetId)].filter(Boolean), ctx.actorId, gateAssignee);
    }
    case 'delegated': {
      const delegatee = ctx.metadata?.delegateeId as string | undefined;
      return finalize([delegatee, requester].filter(Boolean) as string[], ctx.actorId, gateAssignee);
    }
    default:
      return [];
  }
}

/** Build localized content + priority + metadata for an event. */
export function buildNotificationContent(
  ctx: NotificationContext
): {
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  priority: NotificationPriority;
  metadata: NotificationMetadata;
} {
  const t = ctx.ticket;
  const ticketNumber = ctx.ticketNumber || t?.ticket_number || '';
  const num = ticketNumber ? ` ${ticketNumber}` : '';
  const stepName = ctx.step?.name || ctx.metadata?.stepName || '';
  const m: NotificationMetadata = {
    entity: 'ticket',
    entityId: ctx.ticketId || t?.id,
    route: ctx.ticketId || t?.id ? `/requests/${ctx.ticketId || t?.id}` : '/',
    workflowName: ctx.metadata?.workflowName,
    stepName: stepName || undefined,
    stepNodeId: ctx.step?.react_flow_node_id || ctx.metadata?.stepNodeId,
    actionStep: t?.current_step_order,
    ...(ctx.metadata || {}),
    observers: ctx.metadata?.observers,
  };
  const priority: NotificationPriority = ctx.priority || t?.priority || 'normal';

  const c: Record<NotificationEventType, { ta: string; te: string; ba: string; be: string }> = {
    request_submitted: {
      ta: `تم استلام طلبك${num}`,
      te: `Request received${num}`,
      ba: 'تم إنشاء طلبك وجارِ توجيهه لخطوة الموافقة الأولى.',
      be: 'Your request was created and routed to the first approval step.',
    },
    assigned_to_you: {
      ta: `طلب جديد بانتظار إجراءك${num}`,
      te: `New task assigned to you${num}`,
      ba: stepName ? `تم إسناد الخطوة "${stepName}" إليك للموافقة/الإجراء.` : 'تم إسناد طلب إليك لإجراء اللازم.',
      be: stepName ? `You have been assigned step "${stepName}" for action.` : 'A request has been assigned to you for action.',
    },
    approval_requested: {
      ta: `طلب بانتظار موافقتك${num}`,
      te: `Approval requested from you${num}`,
      ba: stepName
        ? `مطلوب موافقتك على الخطوة "${stepName}". اضغط لمراجعة تفاصيل الطلب.`
        : 'تم توجيه طلب إليك لاتخاذ قرار الموافقة. اضغط لمراجعة التفاصيل.',
      be: stepName
        ? `Your approval is requested on step "${stepName}". Tap to review the request.`
        : 'A request was routed to you for approval. Tap to review the details.',
    },
    assignment_changed: {
      ta: `تغيير في إسناد الطلب${num}`,
      te: `Assignment changed${num}`,
      ba: 'تم تغيير المسؤول عن الطلب، وتمت إعادة توجيهه.',
      be: 'The ticket assignment changed and has been re-routed.',
    },
    approved: {
      ta: `تمت الموافقة على الطلب${num}`,
      te: `Request approved${num}`,
      ba: 'تمت الموافقة على طلبك، وسيتم الانتقال للخطوة التالية.',
      be: 'Your request was approved and moved to the next step.',
    },
    rejected: {
      ta: `تم رفض الطلب${num}`,
      te: `Request rejected${num}`,
      ba: 'تم رفض الطلب. راجع ملاحظات المعتمد للحصول على التفاصيل.',
      be: 'Your request was rejected. Review the approver notes for details.',
    },
    returned_for_revision: {
      ta: `مطلوب تعديل على الطلب${num}`,
      te: `Revision requested${num}`,
      ba: 'تم إرجاع الطلب للتعديل. يرجى مراجعة الملاحظات وتحديث البيانات.',
      be: 'Your request was returned for revision. Please review the notes and update details.',
    },
    rfi_sent: {
      ta: `مطلوب معلومات إضافية${num}`,
      te: `Additional info requested${num}`,
      ba: 'طلب منك تزويد معلومات إضافية لاستكمال معالجة الطلب.',
      be: 'You are asked to provide additional information to continue processing.',
    },
    rfi_answered: {
      ta: `تم الرد على طلب المعلومات${num}`,
      te: `RFI answered${num}`,
      ba: 'قام مقدم الطلب بالرد على طلب المعلومات، يمكنك المتابعة.',
      be: 'The requester answered the info request. You may continue.',
    },
    comment_added: {
      ta: `تعليق جديد على الطلب${num}`,
      te: `New comment${num}`,
      ba: 'أضاف ' + (ctx.actorName || 'أحد المستخدمين') + ' تعليقاً على الطلب.',
      be: (ctx.actorName || 'A user') + ' added a comment on the request.',
    },
    internal_note_added: {
      ta: `ملاحظة داخلية على الطلب${num}`,
      te: `Internal note${num}`,
      ba: 'أضاف ' + (ctx.actorName || 'أحد المسؤولين') + ' ملاحظة داخلية على الطلب.',
      be: (ctx.actorName || 'An agent') + ' added an internal note on the request.',
    },
    ticket_closed: {
      ta: `تم إغلاق الطلب${num}`,
      te: `Request closed${num}`,
      ba: 'تم إغلاق الطلب واعتماد معالجته.',
      be: 'Your request has been closed.',
    },
    sla_breached: {
      ta: `انتهاك اتفاقية مستوى الخدمة (SLA)${num}`,
      te: `SLA breach${num}`,
      ba: 'تم تجاوز المهلة المحددة لإنهاء الطلب. يرجى المعالجة الفورية.',
      be: 'The service-level target was breached. Please action immediately.',
    },
    ola_breached: {
      ta: `انتهاك مهلة الخطوة (OLA)${num}`,
      te: `OLA breach${num}`,
      ba: stepName ? `تم تجاوز المهلة الزمنية للخطوة "${stepName}".` : 'تم تجاوز المهلة الزمنية للخطوة الحالية.',
      be: stepName ? `The OLA for step "${stepName}" was breached.` : 'The current step OLA was breached.',
    },
    ola_escalated: {
      ta: `تصعيد الطلب إليك${num}`,
      te: `Request escalated to you${num}`,
      ba: 'تم تصعيد الطلب إليك نظراً لتجاوز المهلة الزمنية للخطوة.',
      be: 'The request was escalated to you due to an OLA breach.',
    },
    delegated: {
      ta: `تفويض بخصوص الطلب${num}`,
      te: `Delegation${num}`,
      ba: 'تم تفويض معالجة الطلب إليك / تسجيل تفويض على الطلب.',
      be: 'Handling of the request has been delegated.',
    },
  };

  const xx = c[ctx.eventType];
  return {
    title_ar: xx.ta,
    title_en: xx.te,
    body_ar: xx.ba,
    body_en: xx.be,
    priority,
    metadata: m,
  };
}
