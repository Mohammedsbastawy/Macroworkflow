import { TriggerNode } from './nodes/TriggerNode';
import { HumanApprovalNode } from './nodes/ApprovalNode';
import { ConditionalNode } from './nodes/ConditionalNode';
import { ParallelSplitNode, ParallelMergeNode, EndNode } from './nodes/OtherNodes';
import { SendEmailNode, WebhookApiNode, UpdateRecordNode } from './nodes/SystemActionNodes';
import {
  RuleCriterionNode,
  AssignGroupNode,
  AssignUserNode,
  SetPriorityNode,
  SetStatusNode,
  AttachSlaNode,
  AttachOlaNode,
  CheckBudgetNode,
  EnforcePolicyNode,
  SetWatcherNode,
  SetSolutionNode,
} from './nodes/RuleActionNodes';

export const nodeTypes = {
  trigger: TriggerNode,
  approval: HumanApprovalNode,
  conditional: ConditionalNode,
  rule_criterion: RuleCriterionNode,
  assign_group_node: AssignGroupNode,
  assign_user_node: AssignUserNode,
  set_priority_node: SetPriorityNode,
  set_status_node: SetStatusNode,
  attach_sla_node: AttachSlaNode,
  attach_ola_node: AttachOlaNode,
  check_budget_node: CheckBudgetNode,
  enforce_policy_node: EnforcePolicyNode,
  set_watcher_node: SetWatcherNode,
  set_solution_node: SetSolutionNode,
  parallel_split: ParallelSplitNode,
  parallel_merge: ParallelMergeNode,
  send_email: SendEmailNode,
  webhook: WebhookApiNode,
  update_record: UpdateRecordNode,
  end: EndNode,
} as const;
