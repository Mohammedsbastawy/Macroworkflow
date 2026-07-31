import { dbCreate, dbGet, dbUpdate } from './store';
import { SYSTEM_USERS, DEPARTMENTS } from './iamStore';

type Node = { id: string; type?: string; data?: Record<string, any> };
type Edge = { source: string; target: string; sourceHandle?: string | null };

function resolveAssignee(expression: string, ticket: any): string {
  const cleanExpr = String(expression || '').trim();
  const lower = cleanExpr.toLowerCase();
  
  if (cleanExpr === '{{requester.manager}}' || lower === 'requester.manager' || lower === 'manager' || lower === 'direct manager' || lower === 'requester manager') {
    const reqUser = SYSTEM_USERS.find(u => u.id === ticket.requester_id || u.name === ticket.requester_name || u.email === ticket.requester_id);
    const managerId = reqUser?.direct_manager_id;
    const managerUser = SYSTEM_USERS.find(u => u.id === managerId);
    return managerUser ? `${managerUser.name} (${managerUser.job_title || 'Manager'})` : (managerId || 'Department Manager');
  }
  if (cleanExpr === '{{requester.department_head}}' || lower === 'requester.department_head' || lower === 'department_head' || lower === 'dept_head' || lower === 'dept head' || lower === 'department head') {
    const reqUser = SYSTEM_USERS.find(u => u.id === ticket.requester_id || u.name === ticket.requester_name || u.email === ticket.requester_id);
    const deptId = reqUser?.department_id;
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    const headUserId = dept?.head_user_id;
    const headUser = SYSTEM_USERS.find(u => u.id === headUserId);
    return headUser ? `${headUser.name} (${headUser.job_title || 'Department Head'})` : 'Department Head';
  }

  // General Role / Job Title Matcher (Generic for all departments and levels)
  let matchedUser = SYSTEM_USERS.find(u => {
    const job = (u.job_title || '').toLowerCase();
    const name = u.name.toLowerCase();
    return job === lower || job.includes(lower) || name.includes(lower);
  });

  if (!matchedUser) {
    // Keyword matching by department prefix + seniority word
    matchedUser = SYSTEM_USERS.find(u => {
      const job = (u.job_title || '').toLowerCase();
      const deptWords = ['hr', 'human resources', 'finance', 'procurement', 'purchasing', 'marketing', 'branding', 'operations', 'ops', 'it', 'helpdesk'];
      const matchedDept = deptWords.find(dWord => lower.includes(dWord));
      if (matchedDept) {
        const userDeptWords = [u.department_id.toLowerCase(), job];
        const isSameDept = userDeptWords.some(udw => udw.includes(matchedDept));
        if (isSameDept) {
          const isLookingForHead = lower.includes('manager') || lower.includes('director') || lower.includes('head') || lower.includes('cfo');
          const isUserHead = job.includes('director') || job.includes('head') || job.includes('chief') || job.includes('manager');
          if (isLookingForHead === isUserHead) return true;
        }
      }
      return false;
    });
  }

  if (matchedUser) {
    return `${matchedUser.name} (${matchedUser.job_title || 'Staff'})`;
  }

  return cleanExpr;
}

function graphOf(workflow: any): { nodes: Node[]; edges: Edge[] } {
  const graph = workflow?.react_flow_graph_json;
  return { nodes: Array.isArray(graph?.nodes) ? graph.nodes : [], edges: Array.isArray(graph?.edges) ? graph.edges : [] };
}

function nextEdge(edges: Edge[], source: string, handles: string[] = []) {
  return edges.find((edge) => edge.source === source && (handles.length === 0 || handles.includes(edge.sourceHandle || '')))
    || edges.find((edge) => edge.source === source);
}

function valueFor(expression: string | undefined, ticket: any, values: Record<string, any>) {
  const key = (expression || '').trim().replace(/^{{\s*|\s*}}$/g, '');
  if (key.startsWith('form.')) return values[key.slice(5)];
  if (key.startsWith('ticket.')) return ticket[key.slice(7)];
  return values[key] ?? ticket[key];
}

function matches(actual: any, operator: string | undefined, expected: any) {
  const op = (operator || 'equals').toLowerCase();
  if (['>', 'gt', 'greater_than'].includes(op)) return Number(actual) > Number(expected);
  if (['<', 'lt', 'less_than'].includes(op)) return Number(actual) < Number(expected);
  if (['!=', 'not_equals', 'notequals'].includes(op)) return String(actual ?? '').toLowerCase() !== String(expected ?? '').toLowerCase();
  if (op === 'contains') return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
  return String(actual ?? '').toLowerCase() === String(expected ?? '').toLowerCase();
}

async function valuesFor(ticketId: string) {
  const rows = await dbGet<any>('ticket_values', { ticket_id: { _eq: ticketId } });
  return Object.fromEntries(rows.map((row) => {
    const raw = row.value_text ?? row.field_value ?? row.value_number;
    try { return [row.field_key, typeof raw === 'string' ? JSON.parse(raw) : raw]; } catch { return [row.field_key, raw]; }
  }));
}

async function audit(ticketId: string, node: Node, message: string) {
  await dbCreate('approval_log', {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ticket_id: ticketId, step_node_id: node.id, action: 'commented', actor_id: 'workflow-engine', actor_name: 'Workflow Engine', comments: message, decision_at: new Date().toISOString(),
  });
}

async function executeAction(ticket: any, node: Node) {
  const data = node.data || {};
  const updates: Record<string, any> = { date_updated: new Date().toISOString() };
  switch (node.type) {
    case 'assign_group_node': updates.assigned_group = data.group_name || data.group_id || ''; if (updates.assigned_group) updates.current_assignees_json = [updates.assigned_group]; break;
    case 'assign_user_node': updates.assigned_user = data.user_name || data.user_id || ''; if (updates.assigned_user) updates.current_assignees_json = [updates.assigned_user]; break;
    case 'set_priority_node': updates.priority = data.priority || 'high'; break;
    case 'set_status_node': updates.status = data.status || 'assigned'; if (data.pending_reason) updates.pending_reason = data.pending_reason; break;
    case 'attach_sla_node': { const hours = Number(data.sla_ttr_hours ?? data.sla_ttr ?? 48); if (hours > 0) updates.sla_deadline = new Date(Date.now() + hours * 3600000).toISOString(); break; }
    case 'attach_ola_node': { const hours = Number(data.ola_target_hours ?? 4); if (hours > 0) updates.ola_deadline = new Date(Date.now() + hours * 3600000).toISOString(); break; }
    case 'set_watcher_node': { const watcher = data.watcher_name || data.watcher_id || ''; if (watcher) updates.observer_id = Array.from(new Set([...String(ticket.observer_id || '').split(',').map((v) => v.trim()).filter(Boolean), watcher])).join(', '); break; }
    case 'set_solution_node': updates.solution_type = data.solution_type || 'resolved'; updates.solution_description = data.solution_description || data.label || ''; break;
    case 'update_record': Object.assign(updates, data.ticket_updates || {}); break;
  }
  const updated = await dbUpdate<any>('tickets', ticket.id, updates);
  await audit(ticket.id, node, `Workflow action executed: ${data.label || node.type || 'action'}`);
  return updated;
}

async function run(ticket: any, workflow: any, startNodeId: string, suppliedValues?: Record<string, any>) {
  const { nodes, edges } = graphOf(workflow);
  const values = suppliedValues || await valuesFor(ticket.id);
  let current = ticket;
  let nodeId = startNodeId;
  for (let index = 0; index < 50; index += 1) {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) throw new Error(`Workflow graph references missing node: ${nodeId}`);
    if (node.type === 'approval') {
      const rawAssignee = node.data?.assignee_value || node.data?.assignee_id || '{{requester.manager}}';
      const resolved = resolveAssignee(rawAssignee, current);

      const currentObservers = String(current.observer_id || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      if (resolved && !currentObservers.includes(resolved) && !resolved.toLowerCase().includes("unassigned")) {
        currentObservers.push(resolved);
      }
      const updatedObserverId = currentObservers.join(', ');

      return dbUpdate('tickets', current.id, {
        status: 'pending',
        current_step_node_id: node.id,
        current_step_order: index + 1,
        current_assignees_json: [resolved],
        observer_id: updatedObserverId,
        date_updated: new Date().toISOString()
      });
    }
    if (node.type === 'end') return dbUpdate('tickets', current.id, { status: 'approved', current_step_node_id: node.id, current_step_order: index + 1, current_assignees_json: [], solved_at: new Date().toISOString(), date_updated: new Date().toISOString() });
    let edge: Edge | undefined;
    if (node.type === 'conditional' || node.type === 'rule_criterion') {
      const field = node.data?.condition_field || node.data?.field;
      const passed = matches(valueFor(field, current, values), node.data?.condition_operator || node.data?.operator, node.data?.condition_value ?? node.data?.value);
      await audit(current.id, node, `Condition evaluated ${passed ? 'true' : 'false'}: ${field || 'field'}`);
      edge = nextEdge(edges, node.id, passed ? ['true', 'approve'] : ['false', 'reject']);
    } else {
      if (node.type !== 'trigger') current = await executeAction(current, node);
      edge = nextEdge(edges, node.id);
    }
    if (!edge) throw new Error(`Workflow node "${node.id}" has no outgoing connection`);
    nodeId = edge.target;
  }
  throw new Error('Workflow stopped after 50 automatic transitions; check for a loop in the canvas.');
}

export async function startGraphWorkflow(ticket: any, workflow: any, formValues: Record<string, any>) {
  const { nodes, edges } = graphOf(workflow);
  if (!nodes.length || !edges.length) return { ticket, handled: false };
  const trigger = nodes.find((node) => node.type === 'trigger');
  const start = trigger ? nextEdge(edges, trigger.id)?.target : nodes.find((node) => !edges.some((edge) => edge.target === node.id))?.id;
  if (!start) throw new Error('Workflow graph has no valid entry connection.');
  return { ticket: await run(ticket, workflow, start, formValues), handled: true };
}

export async function continueGraphWorkflow(ticket: any, workflow: any, action: string) {
  const { nodes, edges } = graphOf(workflow);
  if (!nodes.length || !edges.length) return { ticket, handled: false };
  const current = nodes.find((node) => node.id === ticket.current_step_node_id);
  if (!current || current.type !== 'approval') return { ticket, handled: false };
  if (action === 'rejected') return { ticket: await dbUpdate('tickets', ticket.id, { status: 'rejected', current_assignees_json: [], closed_at: new Date().toISOString(), date_updated: new Date().toISOString() }), handled: true };
  if (action !== 'approved') return { ticket, handled: false };
  const edge = nextEdge(edges, current.id, ['approve', 'true', 'out']);
  if (!edge) return { ticket: await dbUpdate('tickets', ticket.id, { status: 'approved', current_assignees_json: [], solved_at: new Date().toISOString(), date_updated: new Date().toISOString() }), handled: true };
  return { ticket: await run(ticket, workflow, edge.target), handled: true };
}