export type StepType = 
  | 'trigger' 
  | 'approval' 
  | 'notification' 
  | 'webhook' 
  | 'api_call' 
  | 'conditional' 
  | 'parallel_split' 
  | 'parallel_merge' 
  | 'end';

export type AssigneeType = 
  | 'specific_user' 
  | 'role' 
  | 'dynamic_field' 
  | 'manager_of_requester' 
  | 'delegate_of';

export type TimerEventAction = 'pause' | 'reset' | 'continue' | 'add_buffer';

export interface TimerEventRule {
  event_type: 'rfi_sent' | 'rfi_answered' | 'approver_delegated' | 'document_uploaded' | string;
  label: string;
  ola_action: TimerEventAction;
  max_pause_hours?: number | null;
  reset_to_hours?: number | null;
  buffer_hours?: number | null;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  react_flow_node_id: string;
  name: string;
  step_order: number;
  step_type: StepType;
  execution_mode: 'sequential' | 'parallel';
  assignee_type?: AssigneeType | null;
  assignee_value?: string | null;
  approval_threshold?: number | null;
  condition_field?: string | null;
  condition_operator?: string | null;
  condition_value?: string | null;
  on_true_node_id?: string | null;
  on_false_node_id?: string | null;
  webhook_url?: string | null;
  webhook_method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | null;
  webhook_headers_json?: Record<string, string> | null;
  webhook_body_template?: string | null;
  notify_on_assign: boolean;
  notify_on_complete: boolean;
  canvas_position_json?: { x: number; y: number };
  ola_hours?: number | null;
  ola_minutes?: number | null;
  ola_breach_action?: 'notify_only' | 'auto_approve' | 'auto_reject' | 'escalate_to_manager' | 'escalate_to_custom' | null;
  ola_escalation_target_id?: string | null;
  ola_escalation_use_graph_manager?: boolean;
  timer_events_json?: TimerEventRule[];
  sort: number;
}

export interface WorkflowFormField {
  id: string;
  workflow_id: string;
  field_key: string;
  label: string;
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'file' | 'boolean' | 'user_picker' | 'external_lookup';
  placeholder?: string;
  default_value?: string;
  options_json?: Array<{ label: string; value: string }>;
  validation_rules_json?: {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    regex?: string;
  };
  is_required: boolean;
  is_visible_to_approvers: boolean;
  display_condition_json?: Record<string, unknown>;
  external_lookup_config_json?: {
    endpoint_id: string;
    label_field: string;
    value_field: string;
    search_param?: string;
    display_fields?: string[];
    min_search_length?: number;
    debounce_ms?: number;
    cache_ttl_seconds?: number;
  };
  sort: number;
  section: string;
  width: 'full' | 'half' | 'third';
}

export interface WorkflowRequest {
  id: string;
  request_number: string;
  workflow_id: string;
  workflow_version: number;
  workflow_version_snapshot: WorkflowStep[];
  requester_id: string;
  unit?: string;
  title: string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'on_hold' | 'pending_info' | 'new' | 'assigned' | 'processing' | 'planned' | 'solved' | 'closed';
  current_step_node_id?: string;
  current_step_order: number;
  current_assignees_json: string[];
  submitted_at?: string;
  sla_deadline?: string;
  ola_deadline?: string;
  ola_clock_paused_at?: string | null;
  ola_accumulated_pause_ms?: number;
  completed_at?: string;
  date_created: string;
  date_updated: string;

  // GLPI 7-Module Extended Fields
  type?: 'incident' | 'request';
  attachments?: any[];
  subcategory_id?: string;
  impact?: 'low' | 'medium' | 'high' | 'very_high';
  urgency?: 'low' | 'medium' | 'high' | 'urgent';
  location_id?: string;
  requester_department?: string;
  observer_id?: string;
  pending_reason?: 'wait_approval' | 'wait_spare_part' | 'wait_requester' | string;
  sla_tto_deadline?: string;
  sla_ttr_deadline?: string;
  time_spent?: number;
  approval_status?: 'none' | 'waiting' | 'approved' | 'rejected';
  current_approver?: string;
  solution_type?: string;
  solution_description?: string;
  solved_date?: string;
  assigned_group?: string;
  assigned_user?: string;
  requester_name?: string;
}

export interface ApprovalLogEntry {
  id: string;
  request_id: string;
  workflow_step_node_id?: string;
  step_order_snapshot?: number;
  actor_id: string;
  action: 
    | 'submitted'
    | 'approved' 
    | 'rejected' 
    | 'returned_for_revision' 
    | 'delegated' 
    | 'escalated' 
    | 'commented' 
    | 'cancelled' 
    | 'rfi_sent' 
    | 'rfi_answered' 
    | 'ola_paused' 
    | 'ola_resumed' 
    | 'ola_breached' 
    | 'sla_breached' 
    | 'auto_approved' 
    | 'auto_rejected' 
    | 'ooo_rerouted';
  comments?: string;
  decision_at: string;
  ola_elapsed_ms?: number;
  date_created?: string;
  metadata_json?: Record<string, unknown>;
}

export interface DepartmentNode {
  id: string;
  name: string;
  code: string;
  parent_department_id?: string | null;
  manager_id?: string | null;
  created_at?: string;
}

export interface BudgetRecord {
  id: string;
  department_id: string;
  fiscal_year: number;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | string;
  allocated_amount: number;
  spent_amount: number;
  currency: string;
  created_at?: string;
}

export interface PolicyRecord {
  id: string;
  name: string;
  department_id?: string | null;
  workflow_slug?: string | null;
  max_amount_limit?: number | null;
  error_message_ar: string;
  is_active: boolean;
  created_at?: string;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string;
}
