import mysql from 'mysql2/promise';
import crypto from 'crypto';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  database: process.env.MYSQL_DATABASE || 'emacro_dashboard',
  user: process.env.MYSQL_USER || 'emacro',
  password: process.env.MYSQL_PASSWORD || 'emacro123',
  connectionLimit: 15,
  waitForConnections: true,
  queueLimit: 0,
  timezone: '+00:00',
  charset: 'utf8mb4',
});

// JSON Column lists to automatically parse/serialize
const JSON_KEYS = [
  'StepsJson',
  'FieldsJson',
  'ReactFlowGraphJson',
  'VisibilityRulesJson',
  'WorkflowSnapshotJson',
  'CurrentAssigneesJson',
  'ValueJson',
  'GroupIDsJson',
  'MemberUserIDsJson',
  'TargetGroupIDsJson',
  'TargetDepartmentIDsJson',
  'RulesJson',
  'AuthConfigJson',
  'DepartmentIDsJson',
  'TriggerRulesJson',
  'InitialFormData',
  'ExecutionPathJson',
  'MetadataJson',
  'RolesJson',
  'Attachments',
  'steps_json',
  'fields_json',
  'react_flow_graph_json',
  'visibility_rules_json',
  'workflow_snapshot_json',
  'current_assignees_json',
  'value_json',
  'group_ids_json',
  'member_user_ids_json',
  'target_group_ids_json',
  'target_department_ids_json',
  'rules_json',
  'auth_config_json',
  'department_ids_json',
  'trigger_rules_json',
  'initial_form_data',
  'execution_path_json',
  'metadata_json',
  'roles_json',
  'attachments',
  'm365_token_json',
  'modules_json',
  'actions_json'
];

// Mapping from PascalCase or legacy table names to unified snake_case MySQL tables
const TABLE_NAME_MAP: Record<string, string> = {
  Users: 'system_users',
  system_users: 'system_users',
  Departments: 'departments',
  departments: 'departments',
  BusinessGroups: 'business_groups',
  business_groups: 'business_groups',
  SystemUserGroups: 'system_user_groups',
  system_user_groups: 'system_user_groups',
  Workflows: 'workflows',
  workflows: 'workflows',
  Tickets: 'tickets',
  tickets: 'tickets',
  TicketValues: 'ticket_values',
  ticket_values: 'ticket_values',
  TicketObservers: 'ticket_observers',
  ticket_observers: 'ticket_observers',
  TicketAssignees: 'ticket_assignees',
  ticket_assignees: 'ticket_assignees',
  TicketComments: 'ticket_comments',
  ticket_comments: 'ticket_comments',
  ApprovalLog: 'approval_log',
  approval_log: 'approval_log',
  ExternalApiEndpoints: 'external_api_endpoints',
  external_api_endpoints: 'external_api_endpoints',
  Policies: 'policies',
  policies: 'policies',
  Budgets: 'budgets',
  budgets: 'budgets',
  TravelZones: 'travel_zones',
  travel_zones: 'travel_zones',
  PolicyTravelRates: 'policy_travel_rates',
  policy_travel_rates: 'policy_travel_rates',
  Notifications: 'notifications',
  notifications: 'notifications',
  SystemSettings: 'system_settings',
  system_settings: 'system_settings',
  WorkflowSimulations: 'workflow_simulations',
  workflow_simulations: 'workflow_simulations',
  RolePermissions: 'role_permissions',
  role_permissions: 'role_permissions',
  BusinessRules: 'business_rules',
  business_rules: 'business_rules',
  RuleCriteria: 'rule_criteria',
  rule_criteria: 'rule_criteria',
  RuleActions: 'rule_actions',
  rule_actions: 'rule_actions',
};

export function resolveTable(collection: string): string {
  return TABLE_NAME_MAP[collection] || collection;
}

// Mapping from PascalCase/legacy column names to unified snake_case MySQL columns
const COLUMN_NAME_MAP: Record<string, string> = {
  // system_users columns
  UserID: 'id',
  UserName: 'name',
  UserEmail: 'email',
  Username: 'username',
  Phone: 'phone',
  DepartmentID: 'department_id',
  GroupIDsJson: 'group_ids_json',
  Role: 'role',
  RolesJson: 'roles_json',
  AvatarInitials: 'avatar_initials',
  JobTitle: 'job_title',
  DirectManagerUserID: 'direct_manager_id',
  DirectManagerID: 'direct_manager_id',
  Unit: 'unit',
  IsActive: 'is_active',
  LoginName: 'login_name',
  PasswordHash: 'password_hash',
  AuthType: 'auth_type',
  AzureAdId: 'azure_ad_id',
  M365TokenJson: 'm365_token_json',
  M365MailEnabled: 'm365_mail_enabled',
  DelegatedUserId: 'delegated_user_id',
  DelegationEnabled: 'delegation_enabled',
  DelegationStartDate: 'delegation_start_date',
  DelegationEndDate: 'delegation_end_date',
  DelegationNotes: 'delegation_notes',
  CanAssignGroupTickets: 'can_assign_group_tickets',
  DeletedAt: 'deleted_at',

  // departments columns
  DepartmentName: 'name',
  DepartmentCode: 'code',
  ParentDepartmentID: 'parent_department_id',
  ManagerUserID: 'manager_user_id',
  HeadUserID: 'head_user_id',

  // business_groups columns
  BusinessGroupID: 'id',
  BusinessGroupName: 'name',
  BusinessGroupCode: 'code',
  MemberUserIDsJson: 'member_user_ids_json',

  // workflows columns
  WorkflowID: 'id',
  WorkflowName: 'name',
  WorkflowSlug: 'slug',
  Category: 'category',
  Description: 'description',
  Icon: 'icon',
  Color: 'color',
  Version: 'version',
  PublishedVersion: 'published_version',
  SlaTotalHours: 'sla_total_hours',
  SlaBreachAction: 'sla_breach_action',
  ReactFlowGraphJson: 'react_flow_graph_json',
  FieldsJson: 'fields_json',
  StepsJson: 'steps_json',
  VisibilityRulesJson: 'visibility_rules_json',
  Status: 'status',
  IsArchived: 'is_archived',
  DateCreated: 'date_created',
  DateUpdated: 'date_updated',

  // tickets columns
  TicketID: 'id',
  TicketNumber: 'ticket_number',
  WorkflowVersion: 'workflow_version',
  WorkflowSnapshotJson: 'workflow_snapshot_json',
  RequesterUserID: 'requester_id',
  RequesterID: 'requester_id',
  RequesterName: 'requester_name',
  RequesterDepartmentID: 'requester_department_id',
  Title: 'title',
  Priority: 'priority',
  CurrentStepNodeID: 'current_step_node_id',
  CurrentStepOrder: 'current_step_order',
  CurrentAssigneesJson: 'current_assignees_json',
  SubmittedAt: 'submitted_at',
  SlaDeadline: 'sla_deadline',
  OlaDeadline: 'ola_deadline',
  OlaClockPausedAt: 'ola_clock_paused_at',
  OlaAccumulatedPauseMs: 'ola_accumulated_pause_ms',
  SolvedAt: 'solved_at',
  ClosedAt: 'closed_at',
  Type: 'type',
  Attachments: 'attachments',
  SubcategoryID: 'subcategory_id',
  Impact: 'impact',
  Urgency: 'urgency',
  LocationID: 'location_id',
  RequesterDepartment: 'requester_department',
  ObserverUserID: 'observer_user_id',
  PendingReason: 'pending_reason',
  SlaTtoDeadline: 'sla_tto_deadline',
  SlaTtrDeadline: 'sla_ttr_deadline',
  TimeSpent: 'time_spent',
  ApprovalStatus: 'approval_status',
  CurrentApprover: 'current_approver',
  SolutionType: 'solution_type',
  SolutionDescription: 'solution_description',
  SolvedDate: 'solved_date',
  BudgetChecked: 'budget_checked',
  PolicyChecked: 'policy_checked',
  TargetGroupIDsJson: 'target_group_ids_json',
  AssignedGroup: 'assigned_group',
  AssignedUser: 'assigned_user',
  TargetDepartmentIDsJson: 'target_department_ids_json',

  // ticket_values columns
  TicketValueID: 'id',
  FieldKey: 'field_key',
  ValueText: 'value_text',
  ValueNumber: 'value_number',
  ValueDate: 'value_date',
  ValueJson: 'value_json',
  FileAttachmentID: 'file_attachment_id',

  // approval_log columns
  ApprovalLogID: 'id',
  StepNodeID: 'step_node_id',
  StepOrderSnapshot: 'step_order_snapshot',
  ActorUserID: 'actor_user_id',
  ActorUserName: 'actor_user_name',
  Action: 'action',
  Comments: 'comments',
  DecisionAt: 'decision_at',
  OlaElapsedMs: 'ola_elapsed_ms',
  HashSha256: 'hash_sha256',

  // policies columns
  PolicyID: 'id',
  PolicyName: 'name',
  PolicyCode: 'code',
  WorkflowSlugRef: 'workflow_slug',
  MaxAmountLimit: 'max_amount_limit',
  ErrorMessageAr: 'error_message_ar',
  RulesJson: 'rules_json',
  DepartmentIDsJson: 'department_ids_json',
  ApplyToAll: 'apply_to_all',

  // budgets columns
  BudgetID: 'id',
  FiscalYear: 'fiscal_year',
  Quarter: 'quarter',
  AllocatedAmount: 'allocated_amount',
  SpentAmount: 'spent_amount',
  Currency: 'currency',

  // travel_zones columns
  TravelZoneID: 'id',
  TravelZoneName: 'name',
  TravelZoneCode: 'code',

  // ticket_observers columns
  TicketObserverID: 'id',

  // notifications columns
  MetadataJson: 'metadata_json',
};

export function resolveColumn(col: string, table?: string): string {
  const tbl = table ? resolveTable(table) : '';
  if (tbl === 'tickets') {
    if (col === 'WorkflowID' || col === 'workflow_id' || col === 'WorkflowDefinitionID') return 'workflow_id';
    if (col === 'TicketID' || col === 'id') return 'id';
    if (col === 'RequesterUserID' || col === 'RequesterID' || col === 'requester_id') return 'requester_id';
    if (col === 'RequesterDepartmentID' || col === 'requester_department_id') return 'requester_department_id';
  } else if (tbl === 'workflows') {
    if (col === 'WorkflowID' || col === 'id') return 'id';
  } else if (tbl === 'ticket_values') {
    if (col === 'TicketID' || col === 'ticket_id' || col === 'RequestID' || col === 'request_id') return 'ticket_id';
    if (col === 'TicketValueID' || col === 'id') return 'id';
  } else if (tbl === 'approval_log') {
    if (col === 'TicketID' || col === 'ticket_id' || col === 'RequestID' || col === 'request_id') return 'ticket_id';
    if (col === 'ApprovalLogID' || col === 'id') return 'id';
  } else if (tbl === 'ticket_observers') {
    if (col === 'TicketID' || col === 'ticket_id' || col === 'RequestID' || col === 'request_id') return 'ticket_id';
    if (col === 'TicketObserverID' || col === 'id') return 'id';
    if (col === 'UserID' || col === 'user_id') return 'user_id';
  }
  return COLUMN_NAME_MAP[col] || col;
}

// Resolve all keys in a filter/data object
function resolveColumns(obj: Record<string, any>, table?: string): Record<string, any> {
  const resolved: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    resolved[resolveColumn(key, table)] = obj[key];
  }
  return resolved;
}

export function tablePk(collection: string): string {
  const resolved = resolveTable(collection);
  if (resolved === 'system_settings') return 'key';
  return 'id';
}

function formatToMySqlDateTime(val: any): any {
  if (val instanceof Date && !isNaN(val.getTime())) {
    const pad = (n: number, l = 2) => String(n).padStart(l, '0');
    return `${val.getUTCFullYear()}-${pad(val.getUTCMonth() + 1)}-${pad(val.getUTCDate())} ${pad(val.getUTCHours())}:${pad(val.getUTCMinutes())}:${pad(val.getUTCSeconds())}.${pad(val.getUTCMilliseconds(), 3)}`;
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    try {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        const pad = (n: number, l = 2) => String(n).padStart(l, '0');
        return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
      }
    } catch (e) {}
  }
  return val;
}

function parseJsonColumns(row: any) {
  if (!row) return row;
  const parsed = { ...row };
  const lowerJsonKeys = JSON_KEYS.map(k => k.toLowerCase());
  for (const key of Object.keys(parsed)) {
    const isJsonColumn = lowerJsonKeys.includes(key.toLowerCase()) || key.toLowerCase().endsWith('json');
    if (isJsonColumn && parsed[key] !== null) {
      if (typeof parsed[key] === 'string') {
        try {
          parsed[key] = JSON.parse(parsed[key]);
        } catch (e) {}
      }
    }
  }
  return parsed;
}

// Build SQL WHERE clause from filter object
function buildWhereClause(filter: any): { sql: string; values: any[] } {
  if (!filter || Object.keys(filter).length === 0) {
    return { sql: '', values: [] };
  }

  const clauses: string[] = [];
  const values: any[] = [];

  for (const key of Object.keys(filter)) {
    const fieldVal = filter[key];
    if (fieldVal && typeof fieldVal === 'object' && !Array.isArray(fieldVal)) {
      const op = Object.keys(fieldVal)[0];
      const val = fieldVal[op];

      if (op === '_eq') {
        clauses.push(`\`${key}\` = ?`);
        values.push(val);
      } else if (op === '_neq') {
        clauses.push(`\`${key}\` != ?`);
        values.push(val);
      } else if (op === '_in') {
        if (Array.isArray(val) && val.length > 0) {
          clauses.push(`\`${key}\` IN (${val.map(() => '?').join(', ')})`);
          values.push(...val);
        } else {
          clauses.push('1 = 0');
        }
      }
    } else {
      clauses.push(`\`${key}\` = ?`);
      values.push(fieldVal);
    }
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

// Build SQL ORDER BY clause from sort syntax
function buildOrderByClause(sort: any, table?: string): string {
  if (!sort) return '';
  const fields = Array.isArray(sort) ? sort : String(sort).split(',');
  const clauses = fields
    .map((f) => {
      const trimmed = f.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('-')) {
        return `\`${resolveColumn(trimmed.slice(1), table)}\` DESC`;
      }
      return `\`${resolveColumn(trimmed, table)}\` ASC`;
    })
    .filter(Boolean);

  return clauses.length > 0 ? `ORDER BY ${clauses.join(', ')}` : '';
}

// ============================================================
//  CRUD Helpers — Pure MySQL Direct Database Backend
// ============================================================

export async function dbGet<T = any>(
  collection: string,
  filter?: Record<string, any>,
  sort?: string | string[],
  limit?: number,
  fields?: string[]
): Promise<T[]> {
  const tableName = resolveTable(collection);
  const resolvedFilter = filter ? resolveColumns(filter, tableName) : undefined;
  const { sql: whereSql, values } = buildWhereClause(resolvedFilter);
  const orderSql = buildOrderByClause(sort, tableName);
  const limitSql = limit ? `LIMIT ${Number(limit)}` : '';
  const columns = fields && fields.length > 0 ? fields.map((f) => `\`${resolveColumn(f, tableName)}\``).join(', ') : '*';

  const sql = `SELECT ${columns} FROM \`${tableName}\` ${whereSql} ${orderSql} ${limitSql};`;
  const [rows] = await pool.query(sql, values);

  return (rows as any[]).map(parseJsonColumns) as T[];
}

export async function dbGetOne<T = any>(
  collection: string,
  id: string,
  fields?: string[]
): Promise<T | null> {
  const tableName = resolveTable(collection);
  const pk = tablePk(tableName);
  const rows = await dbGet<T>(tableName, { [pk]: id }, undefined, 1, fields);
  return rows.length > 0 ? rows[0] : null;
}

const FK_NULLABLE_COLUMNS = [
  'assigned_user',
  'assigned_group',
  'requester_department_id',
  'direct_manager_id',
  'current_approver',
  'location_id',
  'subcategory_id',
  'parent_department_id',
  'manager_user_id',
  'head_user_id',
  'delegated_user_id',
  'department_id'
];

export async function dbCreate<T = any>(
  collection: string,
  data: Record<string, any>
): Promise<T> {
  const tableName = resolveTable(collection);
  const pk = tablePk(tableName);
  const resolved = resolveColumns(data, tableName);
  const record = { ...resolved };
  if (!record[pk]) {
    record[pk] = crypto.randomUUID();
  }

  const columns = Object.keys(record);
  const values = columns.map((col) => {
    let val = record[col];
    if (tableName === 'approval_log' && col === 'actor_user_id') {
      if (!val || val === 'System' || val === 'Approver' || val === 'OLA Tracker' || val === 'SLA Tracker') {
        val = 'user-admin';
      }
    }
    if (val === '' && (FK_NULLABLE_COLUMNS.includes(col) || col.endsWith('_id') || col.endsWith('_user') || col.endsWith('_group'))) {
      val = null;
    }
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      return JSON.stringify(val);
    }
    return formatToMySqlDateTime(val);
  });

  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO \`${tableName}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders});`;

  const [result] = await pool.query(sql, values);
  const id = record[pk] || (result as any).insertId;

  const created = await dbGetOne<T>(tableName, String(id));
  if (!created) throw new Error(`Insert failed to retrieve record ${id} from ${tableName}`);
  return created;
}

export async function dbUpdate<T = any>(
  collection: string,
  id: string,
  data: Record<string, any>
): Promise<T> {
  const tableName = resolveTable(collection);
  const pk = tablePk(tableName);
  const resolved = resolveColumns(data, tableName);
  const updateData = { ...resolved };
  delete updateData[pk];

  const columns = Object.keys(updateData);
  if (columns.length === 0) {
    const existing = await dbGetOne<T>(tableName, id);
    if (!existing) throw new Error(`Record ${id} not found in ${tableName}`);
    return existing;
  }

  const setClauses = columns.map((c) => `\`${c}\` = ?`).join(', ');
  const values = columns.map((col) => {
    let val = updateData[col];
    if (tableName === 'approval_log' && col === 'actor_user_id') {
      if (!val || val === 'System' || val === 'Approver' || val === 'OLA Tracker' || val === 'SLA Tracker') {
        val = 'user-admin';
      }
    }
    if (val === '' && (FK_NULLABLE_COLUMNS.includes(col) || col.endsWith('_id') || col.endsWith('_user') || col.endsWith('_group'))) {
      val = null;
    }
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      return JSON.stringify(val);
    }
    return formatToMySqlDateTime(val);
  });

  const sql = `UPDATE \`${tableName}\` SET ${setClauses} WHERE \`${pk}\` = ?;`;
  await pool.query(sql, [...values, id]);

  const updated = await dbGetOne<T>(tableName, id);
  if (!updated) throw new Error(`Record ${id} not found after update in ${tableName}`);
  return updated;
}

export async function dbDelete(
  collection: string,
  id: string
): Promise<boolean> {
  const tableName = resolveTable(collection);
  const pk = tablePk(tableName);
  const sql = `DELETE FROM \`${tableName}\` WHERE \`${pk}\` = ?;`;
  const [result] = await pool.query(sql, [id]);
  return (result as any).affectedRows > 0;
}

export async function dbFetch<T = any>(
  collectionName: string,
  queryOptions: Record<string, any> = {}
): Promise<T[]> {
  return dbGet<T>(collectionName, queryOptions.filter, queryOptions.sort, queryOptions.limit);
}

export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function dbDeleteWhere(collection: string, field: string, value: any): Promise<number> {
  const tableName = resolveTable(collection);
  const sql = `DELETE FROM \`${tableName}\` WHERE \`${field}\` = ?;`;
  const [result] = await pool.query(sql, [value]);
  return (result as any).affectedRows || 0;
}

export async function dbBulkCreate(collection: string, records: Record<string, any>[]): Promise<number> {
  if (!records || records.length === 0) return 0;
  const tableName = resolveTable(collection);
  
  const CHUNK_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0) continue;

    const firstRecord = chunk[0];
    const columns = Object.keys(firstRecord);
    const colNames = columns.map(c => `\`${c}\``).join(', ');
    
    const rowPlaceholders = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const sql = `INSERT INTO \`${tableName}\` (${colNames}) VALUES ${rowPlaceholders};`;
    
    const values: any[] = [];
    for (const record of chunk) {
      for (const col of columns) {
        const val = record[col];
        if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
          values.push(JSON.stringify(val));
        } else {
          values.push(formatToMySqlDateTime(val));
        }
      }
    }

    const [result] = await pool.query(sql, values);
    totalInserted += (result as any).affectedRows || 0;
  }

  return totalInserted;
}
