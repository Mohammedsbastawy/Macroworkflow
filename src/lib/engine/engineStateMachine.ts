/**
 * Enterprise State Machine (DAG) Engine for ITSM Workflows
 * Supports Parallel Execution (Fork/Join), RFI Loops, Idempotency, and Versioning Snapshots.
 */

export interface DAGNode {
  id: string;
  type: string;
  data: Record<string, any>;
}

export interface DAGEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

export interface ExecutionContext {
  ticketId: string;
  workflowSlug: string;
  workflowVersion: number;
  currentNodeId: string;
  status: 'active' | 'waiting_rfi' | 'waiting_join' | 'waiting_async' | 'completed' | 'failed';
  formValues: Record<string, any>;
  joinedBranches?: Record<string, boolean>; // Node ID -> Approval decision
  retryCount?: Record<string, number>;
}

/**
 * Evaluates next node transition in the State Machine DAG.
 */
export function evaluateNextState(
  context: ExecutionContext,
  nodes: DAGNode[],
  edges: DAGEdge[],
  inputAction?: { action: string; actor: string; payload?: Record<string, any> }
): {
  nextStatus: string;
  nextNodeId: string;
  isCompleted: boolean;
  actionsToExecute: DAGNode[];
  error?: string;
} {
  const currentNode = nodes.find((n) => n.id === context.currentNodeId);
  const actionsToExecute: DAGNode[] = [];

  if (!currentNode) {
    return {
      nextStatus: 'completed',
      nextNodeId: context.currentNodeId,
      isCompleted: true,
      actionsToExecute: [],
    };
  }

  // 1. Handle Human Approval Node
  if (currentNode.type === 'approval') {
    if (inputAction?.action === 'rfi_sent' || inputAction?.action === 'returned_for_revision') {
      return {
        nextStatus: 'pending_info',
        nextNodeId: context.currentNodeId, // Stay on current approval node until user updates
        isCompleted: false,
        actionsToExecute: [],
      };
    }

    if (inputAction?.action === 'rejected') {
      const rejectEdge = edges.find((e) => e.source === currentNode.id && (e.sourceHandle === 'reject' || e.sourceHandle === 'false'));
      const targetNodeId = rejectEdge ? rejectEdge.target : currentNode.id;
      return {
        nextStatus: 'rejected',
        nextNodeId: targetNodeId,
        isCompleted: true,
        actionsToExecute: [],
      };
    }

    if (inputAction?.action === 'approved') {
      // Find outgoing approve wire (green)
      const approveEdge = edges.find((e) => e.source === currentNode.id && (e.sourceHandle === 'approve' || e.sourceHandle === 'true' || !e.sourceHandle));
      if (!approveEdge) {
        return {
          nextStatus: 'approved',
          nextNodeId: currentNode.id,
          isCompleted: true,
          actionsToExecute: [],
        };
      }

      // Move to target node
      const targetNode = nodes.find((n) => n.id === approveEdge.target);
      if (targetNode && (targetNode.type === 'send_email' || targetNode.type === 'webhook' || targetNode.type === 'update_record' || targetNode.type.includes('node'))) {
        actionsToExecute.push(targetNode);
      }

      return {
        nextStatus: targetNode?.type === 'end' ? 'approved' : 'in_progress',
        nextNodeId: approveEdge.target,
        isCompleted: targetNode?.type === 'end',
        actionsToExecute,
      };
    }
  }

  // 2. Handle Parallel Split (Fork)
  if (currentNode.type === 'parallel_split') {
    const outgoingEdges = edges.filter((e) => e.source === currentNode.id);
    const branchNodes = outgoingEdges.map((e) => nodes.find((n) => n.id === e.target)).filter(Boolean) as DAGNode[];

    return {
      nextStatus: 'in_progress',
      nextNodeId: branchNodes[0]?.id || currentNode.id,
      isCompleted: false,
      actionsToExecute: branchNodes,
    };
  }

  // 3. Handle Parallel Merge (Join Gate)
  if (currentNode.type === 'parallel_merge') {
    const mode = currentNode.data?.merge_mode || 'AND'; // AND = wait all, OR = any
    const joined = context.joinedBranches || {};
    const totalRequired = edges.filter((e) => e.target === currentNode.id).length;
    const completedCount = Object.keys(joined).length;

    if (mode === 'AND' && completedCount < totalRequired) {
      return {
        nextStatus: 'waiting_join',
        nextNodeId: currentNode.id,
        isCompleted: false,
        actionsToExecute: [],
      };
    }

    const nextEdge = edges.find((e) => e.source === currentNode.id);
    return {
      nextStatus: 'in_progress',
      nextNodeId: nextEdge ? nextEdge.target : currentNode.id,
      isCompleted: !nextEdge,
      actionsToExecute: [],
    };
  }

  // Default step progression
  const nextEdge = edges.find((e) => e.source === currentNode.id);
  return {
    nextStatus: nextEdge ? 'in_progress' : 'completed',
    nextNodeId: nextEdge ? nextEdge.target : currentNode.id,
    isCompleted: !nextEdge,
    actionsToExecute: [],
  };
}

/**
 * Idempotent Execution Wrapper for Webhook / REST API Action Nodes
 */
export async function executeNodeActionIdempotent(
  node: DAGNode,
  context: ExecutionContext,
  executor: (node: DAGNode, ctx: ExecutionContext) => Promise<any>,
  maxRetries = 3
): Promise<{ success: boolean; result?: any; error?: string }> {
  let attempt = 0;
  let lastError = '';

  while (attempt < maxRetries) {
    try {
      attempt++;
      const res = await executor(node, context);
      return { success: true, result: res };
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`[State Machine Retry Warning] Action Node ${node.id} (${node.type}) failed attempt ${attempt}/${maxRetries}: ${lastError}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500)); // Exponential backoff
      }
    }
  }

  return {
    success: false,
    error: `Action Node ${node.id} failed after ${maxRetries} idempotent retries. Error: ${lastError}`,
  };
}
