/**
 * GLPI / ServiceNow Standard Business Rules Engine Criteria & Actions Schema
 */

export interface RuleCriterionSchema {
  id: string;
  name: string;
  field: string;
  type: 'string' | 'number' | 'enum' | 'date';
  operators: { value: string; label: string }[];
  options?: { value: string; label: string }[];
}

export interface RuleActionSchema {
  id: string;
  name: string;
  action_type: string;
  target_type: 'group' | 'user' | 'priority' | 'status' | 'sla' | 'ola' | 'watcher' | 'webhook' | 'email';
  options?: { value: string; label: string }[];
}

/**
 * Standard ITSM Criteria List (Triggers & Conditions)
 */
export const ITSM_RULE_CRITERIA: RuleCriterionSchema[] = [
  {
    id: 'crit_category',
    name: '🏷️ Ticket Category (فئة التذكرة)',
    field: 'category',
    type: 'enum',
    operators: [
      { value: 'eq', label: 'Equals (يساوي)' },
      { value: 'neq', label: 'Not Equal (لا يساوي)' },
      { value: 'in', label: 'IN List (ضمن القائمة)' },
    ],
    options: [
      { value: 'IT Services', label: 'IT Services' },
      { value: 'Hardware & Equipment', label: 'Hardware & Equipment' },
      { value: 'Software & Licenses', label: 'Software & Licenses' },
      { value: 'HR Services', label: 'HR Services' },
      { value: 'Finance & Payroll', label: 'Finance & Payroll' },
      { value: 'General Services', label: 'General Services' },
    ],
  },
  {
    id: 'crit_priority',
    name: '🚨 Ticket Priority (الأولوية)',
    field: 'priority',
    type: 'enum',
    operators: [
      { value: 'eq', label: 'Equals' },
      { value: 'neq', label: 'Not Equal' },
      { value: 'gt', label: 'Higher Than' },
    ],
    options: [
      { value: 'low', label: '🟢 Low' },
      { value: 'normal', label: '🔵 Normal' },
      { value: 'high', label: '🟠 High' },
      { value: 'urgent', label: '🔴 Urgent' },
      { value: 'critical', label: '⚡ Critical' },
    ],
  },
  {
    id: 'crit_requester_dept',
    name: '🏢 Requester Department (إدارة مقدم الطلب)',
    field: 'requester.department',
    type: 'enum',
    operators: [
      { value: 'eq', label: 'Equals' },
      { value: 'neq', label: 'Not Equal' },
    ],
    options: [
      { value: 'dept-it', label: 'IT Department' },
      { value: 'dept-hr', label: 'HR Department' },
      { value: 'dept-finance', label: 'Finance Department' },
      { value: 'dept-procurement', label: 'Procurement Department' },
      { value: 'dept-ops', label: 'Operations Department' },
    ],
  },
  {
    id: 'crit_requester_title',
    name: '👔 Requester Job Title (المسمى الوظيفي)',
    field: 'requester.job_title',
    type: 'string',
    operators: [
      { value: 'contains', label: 'Contains (يحتوي على)' },
      { value: 'eq', label: 'Equals (يساوي)' },
    ],
  },
  {
    id: 'crit_amount',
    name: '💰 Total Requested Amount / Limit (المبلغ الإجمالي)',
    field: 'form.amount',
    type: 'number',
    operators: [
      { value: 'gt', label: 'Greater Than (>)' },
      { value: 'gte', label: 'Greater or Equal (>=)' },
      { value: 'lt', label: 'Less Than (<)' },
      { value: 'lte', label: 'Less or Equal (<=)' },
    ],
  },
  {
    id: 'crit_status',
    name: '🔄 Ticket Status (حالة التذكرة)',
    field: 'status',
    type: 'enum',
    operators: [
      { value: 'eq', label: 'Equals' },
      { value: 'neq', label: 'Not Equal' },
    ],
    options: [
      { value: 'new', label: 'New' },
      { value: 'pending', label: 'Pending Approval' },
      { value: 'assigned', label: 'Assigned' },
      { value: 'processing', label: 'Processing (قيد المعالجة)' },
      { value: 'solved', label: 'Solved' },
      { value: 'closed', label: 'Closed' },
    ],
  },
];

/**
 * Standard ITSM Actions List (Execution Payload)
 */
export const ITSM_RULE_ACTIONS: RuleActionSchema[] = [
  {
    id: 'act_assign_group',
    name: '👥 Assign Group (إسناد لمجموعة)',
    action_type: 'assign_group',
    target_type: 'group',
    options: [
      { value: 'IT Technical Support Group', label: 'IT Technical Support Group' },
      { value: 'Procurement Committee', label: 'Procurement Committee' },
      { value: 'Finance & Payroll Team', label: 'Finance & Payroll Team' },
      { value: 'Department Managers', label: 'Department Managers' },
      { value: 'Executive Board', label: 'Executive Board' },
    ],
  },
  {
    id: 'act_assign_user',
    name: '👤 Assign Individual Employee (إسناد لموظف محدد)',
    action_type: 'assign_user',
    target_type: 'user',
    options: [
      { value: 'Khaled Samir (IT Manager)', label: 'Khaled Samir (IT Manager)' },
      { value: 'Yasser Mahmoud (Procurement Manager)', label: 'Yasser Mahmoud (Procurement Manager)' },
      { value: 'Mona Omar (Finance Manager / CFO)', label: 'Mona Omar (Finance Manager / CFO)' },
      { value: 'Sara Hassan (HR Director)', label: 'Sara Hassan (HR Director)' },
    ],
  },
  {
    id: 'act_set_priority',
    name: '🚩 Set Priority Level (تغيير الأولوية)',
    action_type: 'set_priority',
    target_type: 'priority',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'normal', label: 'Normal' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
      { value: 'critical', label: 'Critical' },
    ],
  },
  {
    id: 'act_set_status',
    name: '🔄 Set Ticket Status (تغيير حالة التذكرة)',
    action_type: 'set_status',
    target_type: 'status',
    options: [
      { value: 'new', label: 'New' },
      { value: 'assigned', label: 'Assigned' },
      { value: 'pending', label: 'Pending' },
      { value: 'processing', label: 'Processing (قيد المعالجة)' },
      { value: 'solved', label: 'Solved' },
      { value: 'closed', label: 'Closed' },
    ],
  },
  {
    id: 'act_attach_sla',
    name: '⏱️ Attach SLA Policy Target (ربط اتفاقية مستوى الخدمة SLA)',
    action_type: 'attach_sla',
    target_type: 'sla',
    options: [
      { value: 'Standard SLA (48h)', label: 'Standard SLA (48h Target)' },
      { value: 'Urgent SLA (4h)', label: 'Urgent SLA (4h Target)' },
      { value: 'Critical Incident SLA (1h)', label: 'Critical Incident SLA (1h Target)' },
    ],
  },
  {
    id: 'act_attach_ola',
    name: '⏱️ Attach OLA Policy Target (ربط الاتفاقية التشغيلية OLA)',
    action_type: 'attach_ola',
    target_type: 'ola',
    options: [
      { value: 'Standard OLA (4h)', label: 'Standard OLA (4h Target)' },
      { value: 'Department OLA (2h)', label: 'Department OLA (2h Target)' },
      { value: 'Emergency OLA (30m)', label: 'Emergency OLA (30m Target)' },
    ],
  },
  {
    id: 'act_add_watcher',
    name: '👁️ Add Watcher / Observer CC (إضافة مراقب على التذكرة)',
    action_type: 'set_watcher',
    target_type: 'watcher',
  },
];
