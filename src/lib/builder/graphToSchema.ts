import { Edge, Node } from '@xyflow/react';
import { WorkflowStep } from '@/types/workflow';

export function graphToWorkflowSteps(nodes: Node[], edges: Edge[], workflowId: string): Partial<WorkflowStep>[] {
  const stepOrderMap = topologicalSort(nodes, edges);

  return nodes
    .filter((n) => n.type !== 'trigger') // Triggers initiate the flow, not step rows
    .map((node) => {
      const order = stepOrderMap.get(node.id) || 1;
      const outgoing = edges.filter((e) => e.source === node.id);

      const trueEdge = outgoing.find((e) => e.sourceHandle === 'true');
      const falseEdge = outgoing.find((e) => e.sourceHandle === 'false');

      return {
        workflow_id: workflowId,
        react_flow_node_id: node.id,
        name: (node.data?.label as string) || node.type || 'Step',
        step_order: order,
        step_type: (node.type as any) || 'approval',
        execution_mode: (node.data?.execution_mode as any) || 'sequential',
        assignee_type: (node.data?.assignee_type as any) || 'specific_user',
        assignee_value: (node.data?.assignee_value as string) || null,
        approval_threshold: (node.data?.approval_threshold as number) || 1,
        condition_field: (node.data?.condition_field as string) || null,
        condition_operator: (node.data?.condition_operator as string) || 'eq',
        condition_value: (node.data?.condition_value as string) || null,
        on_true_node_id: trueEdge?.target || null,
        on_false_node_id: falseEdge?.target || null,
        webhook_url: (node.data?.webhook_url as string) || null,
        webhook_method: (node.data?.webhook_method as any) || 'POST',
        webhook_headers_json: (node.data?.webhook_headers_json as any) || null,
        webhook_body_template: (node.data?.webhook_body_template as string) || null,
        notify_on_assign: (node.data?.notify_on_assign as boolean) ?? true,
        notify_on_complete: (node.data?.notify_on_complete as boolean) ?? false,
        canvas_position_json: node.position,
        ola_hours: (node.data?.ola_hours as number) || null,
        ola_minutes: (node.data?.ola_minutes as number) || 0,
        ola_breach_action: (node.data?.ola_breach_action as any) || 'notify_only',
        ola_escalation_target_id: (node.data?.ola_escalation_target_id as string) || null,
        ola_escalation_use_graph_manager: (node.data?.ola_escalation_use_graph_manager as boolean) || false,
        timer_events_json: (node.data?.timer_events_json as any) || [],
        sort: order,
      };
    })
    .sort((a, b) => (a.step_order || 0) - (b.step_order || 0));
}

function topologicalSort(nodes: Node[], edges: Edge[]): Map<string, number> {
  const inDegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const adjacency = new Map<string, string[]>(nodes.map((n) => [n.id, []]));

  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    const list = adjacency.get(edge.source) || [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  const queue = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
  const order = new Map<string, number>();
  let count = 1;

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.set(current, count++);
    for (const neighbor of adjacency.get(current) || []) {
      const deg = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  return order;
}
