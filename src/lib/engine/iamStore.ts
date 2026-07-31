export interface Department {
  id: string;
  name: string;
  code: string;
  head_user_id?: string;
}

export interface BusinessGroup {
  id: string;
  name: string;
  code: string;
  member_user_ids: string[];
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  department_id: string;
  group_ids: string[];
  role: 'admin' | 'selfservice';
  avatar_initials: string;
  job_title?: string;
  direct_manager_id?: string;
  unit?: string;
  can_assign_group_tickets?: boolean | number;
}

export interface VisibilityRules {
  is_global: boolean;
  department_ids: string[];
  group_ids: string[];
  user_ids: string[];
  ticket_info_panel_config?: any;
}

export interface RolePermissionsConfig {
  ticketScope?: "own" | "group" | "department" | "all";
  modules: {
    dashboard: boolean;
    catalog: boolean;
    newRequest: boolean;
    myRequests: boolean;
    requestsList: boolean;
    workflowBuilder: boolean;
    usersIam: boolean;
    profileSetup: boolean;
    reportsSla: boolean;
    settings: boolean;
  };
  actions: {
    cancelRequest: boolean;
    delegateApproval: boolean;
    requestInfoRfi: boolean;
    exportReports: boolean;
    overrideOlaTimer: boolean;
    // Ticket View Direct Actions
    approveTicket: boolean;
    rejectTicket: boolean;
    reassignTicket: boolean;
    addInternalNote: boolean;
    addPublicComment: boolean;
  };
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, RolePermissionsConfig> = {
  selfservice: {
    ticketScope: "own",
    modules: {
      dashboard: true,
      catalog: true,
      newRequest: true,
      myRequests: true,
      requestsList: true,
      workflowBuilder: false,
      usersIam: false,
      profileSetup: false,
      reportsSla: false,
      settings: false,
    },
    actions: {
      cancelRequest: true,
      delegateApproval: false,
      requestInfoRfi: false,
      exportReports: false,
      overrideOlaTimer: false,
      approveTicket: false,
      rejectTicket: false,
      reassignTicket: false,
      addInternalNote: false,
      addPublicComment: true,
    },
  },
  admin: {
    ticketScope: "all",
    modules: {
      dashboard: true,
      catalog: true,
      newRequest: true,
      myRequests: true,
      requestsList: true,
      workflowBuilder: true,
      usersIam: true,
      profileSetup: true,
      reportsSla: true,
      settings: true,
    },
    actions: {
      cancelRequest: true,
      delegateApproval: true,
      requestInfoRfi: true,
      exportReports: true,
      overrideOlaTimer: true,
      approveTicket: true,
      rejectTicket: true,
      reassignTicket: true,
      addInternalNote: true,
      addPublicComment: true,
    },
  },
};

// Pre-seeded IAM Hierarchy (Self-Referencing Tree)
export const DEPARTMENTS: (Department & { parent_department_id?: string | null })[] = [
  { id: 'dept-exec', name: 'Executive Board & CEO Office', code: 'EXEC', head_user_id: 'user-mona', parent_department_id: null },
  { id: 'dept-it', name: 'IT & Technology Department', code: 'IT', head_user_id: 'user-khaled', parent_department_id: 'dept-exec' },
  { id: 'dept-hr', name: 'Human Resources (HR)', code: 'HR', head_user_id: 'user-sara', parent_department_id: 'dept-exec' },
  { id: 'dept-finance', name: 'Finance & Accounts Department', code: 'FIN', head_user_id: 'user-mona', parent_department_id: 'dept-exec' },
  { id: 'dept-procurement', name: 'Procurement Department', code: 'PROC', head_user_id: 'user-yasser', parent_department_id: 'dept-exec' },
  { id: 'dept-ops', name: 'Operations & Facilities', code: 'OPS', head_user_id: 'user-karim', parent_department_id: 'dept-exec' },
  { id: 'dept-mkt', name: 'Marketing & Digital Branding Department', code: 'MKT', head_user_id: 'user-sherif', parent_department_id: 'dept-exec' },
];

export const BUSINESS_GROUPS: BusinessGroup[] = [
  { id: 'group-procurement', name: 'Procurement Committee', code: 'PROC_COMM', member_user_ids: ['user-tarek', 'user-yasser', 'user-khaled', 'user-mona'] },
  { id: 'group-finance', name: 'Finance & Payroll Team', code: 'FIN_TEAM', member_user_ids: ['user-huda', 'user-mona'] },
  { id: 'group-it-techs', name: 'IT Technical Support Group', code: 'IT_TECHS', member_user_ids: ['user-ahmed', 'user-khaled'] },
  { id: 'group-mkt-team', name: 'Marketing & Media Team', code: 'MKT_TEAM', member_user_ids: ['user-noha', 'user-omar', 'user-sherif'] },
  { id: 'group-managers', name: 'Department Managers', code: 'DEPT_HEADS', member_user_ids: ['user-khaled', 'user-sara', 'user-mona', 'user-yasser', 'user-karim', 'user-sherif'] },
  { id: 'group-executives', name: 'Executive Board', code: 'EXEC_BOARD', member_user_ids: ['user-mona', 'user-admin'] },
];

export const SYSTEM_USERS: SystemUser[] = [
  { id: 'user-admin', name: 'System Admin', email: 'admin@company.com', department_id: 'dept-it', group_ids: ['group-managers', 'group-executives'], role: 'admin', avatar_initials: 'AD', job_title: 'Infrastructure & System Super Admin', direct_manager_id: 'user-admin', unit: 'Corporate HQ' },
  
  // IT Department
  { id: 'user-ahmed', name: 'Ahmed Mohamed (IT Staff)', email: 'ahmed@company.com', department_id: 'dept-it', group_ids: ['group-it-techs'], role: 'selfservice', avatar_initials: 'AM', job_title: 'IT Technical Support Specialist', direct_manager_id: 'user-khaled', unit: 'Enterprise IT Services' },
  { id: 'user-khaled', name: 'Khaled Samir (IT Manager)', email: 'khaled@company.com', department_id: 'dept-it', group_ids: ['group-it-techs', 'group-managers'], role: 'selfservice', avatar_initials: 'KS', job_title: 'IT Department Director', direct_manager_id: 'user-mona', unit: 'Enterprise IT Services' },
  
  // Marketing & Branding Department
  { id: 'user-noha', name: 'Noha Gamal (Marketing Specialist)', email: 'noha@company.com', department_id: 'dept-mkt', group_ids: ['group-mkt-team'], role: 'selfservice', avatar_initials: 'NG', job_title: 'Digital Marketing & Campaign Specialist', direct_manager_id: 'user-sherif', unit: 'Brand Gamma - Marketing Unit' },
  { id: 'user-omar', name: 'Omar Khaled (Content & Design Lead)', email: 'omar@company.com', department_id: 'dept-mkt', group_ids: ['group-mkt-team'], role: 'selfservice', avatar_initials: 'OK', job_title: 'Content & Graphic Design Lead', direct_manager_id: 'user-sherif', unit: 'Brand Gamma - Marketing Unit' },
  { id: 'user-sherif', name: 'Sherif Ramzy (Marketing Director)', email: 'sherif@company.com', department_id: 'dept-mkt', group_ids: ['group-mkt-team', 'group-managers'], role: 'selfservice', avatar_initials: 'SR', job_title: 'Marketing & Digital Branding Director', direct_manager_id: 'user-mona', unit: 'Brand Gamma - Marketing Unit' },

  // Procurement Department
  { id: 'user-tarek', name: 'Tarek Hassan (Procurement Staff)', email: 'tarek@company.com', department_id: 'dept-procurement', group_ids: ['group-procurement'], role: 'selfservice', avatar_initials: 'TH', job_title: 'Senior Purchasing Officer', direct_manager_id: 'user-yasser', unit: 'Brand Alpha - Retail Unit' },
  { id: 'user-yasser', name: 'Yasser Mahmoud (Procurement Manager)', email: 'yasser@company.com', department_id: 'dept-procurement', group_ids: ['group-procurement', 'group-managers'], role: 'selfservice', avatar_initials: 'YM', job_title: 'Head of Procurement', direct_manager_id: 'user-mona', unit: 'Brand Alpha - Retail Unit' },

  // Finance & Accounts Department
  { id: 'user-huda', name: 'Huda Adel (Accounts Staff)', email: 'huda@company.com', department_id: 'dept-finance', group_ids: ['group-finance'], role: 'selfservice', avatar_initials: 'HA', job_title: 'Senior Financial Accountant', direct_manager_id: 'user-mona', unit: 'Brand Beta - E-Commerce Unit' },
  { id: 'user-mona', name: 'Mona Omar (Finance Manager / CFO)', email: 'mona@company.com', department_id: 'dept-finance', group_ids: ['group-finance', 'group-procurement', 'group-managers', 'group-executives'], role: 'selfservice', avatar_initials: 'MO', job_title: 'Chief Financial Officer (CFO)', direct_manager_id: 'user-admin', unit: 'Corporate HQ' },

  // HR Department
  { id: 'user-laila', name: 'Laila Ibrahim (HR Staff)', email: 'laila@company.com', department_id: 'dept-hr', group_ids: [], role: 'selfservice', avatar_initials: 'LI', job_title: 'HR Specialist', direct_manager_id: 'user-sara', unit: 'Brand Gamma - Marketing Unit' },
  { id: 'user-sara', name: 'Sara Hassan (HR Director)', email: 'sara@company.com', department_id: 'dept-hr', group_ids: ['group-managers'], role: 'selfservice', avatar_initials: 'SH', job_title: 'Director of Human Resources', direct_manager_id: 'user-mona', unit: 'Brand Gamma - Marketing Unit' },

  // Operations Department
  { id: 'user-karim', name: 'Karim Fathy (Operations Manager)', email: 'karim@company.com', department_id: 'dept-ops', group_ids: ['group-managers'], role: 'selfservice', avatar_initials: 'KF', job_title: 'Operations & Facilities Manager', direct_manager_id: 'user-mona', unit: 'Brand Delta - Operations Unit' },
];

export const SEEDED_WORKFLOWS: any[] = [];

export function getAuthorizedWorkflowsForUser(user: SystemUser, allWorkflows: any[], allGroups?: BusinessGroup[]): any[] {
  const pool = (allWorkflows && allWorkflows.length > 0 ? allWorkflows : SEEDED_WORKFLOWS).filter(
    (w) => w.is_archived !== true && w.status !== 'archived'
  );

  const groupsList = allGroups && allGroups.length > 0 ? allGroups : BUSINESS_GROUPS;

  return pool.filter((wf) => {
    if (!user) return true;
    if (user.role === 'admin') return true;

    const rules: VisibilityRules = (wf as any).visibility_rules || (wf as any).visibility_rules_json || {
      is_global: true,
      department_ids: [],
      group_ids: [],
      user_ids: [],
    };

    if (rules.is_global) return true;

    const userDeptId = user.department_id;
    const userDirectGroups = Array.isArray(user.group_ids) 
      ? user.group_ids 
      : Array.isArray((user as any).group_ids_json) 
        ? (user as any).group_ids_json 
        : [];

    // Reverse lookup: check if any group in groupsList includes user.id in member_user_ids
    const memberGroupIds = groupsList
      .filter((g) => Array.isArray(g.member_user_ids) && g.member_user_ids.includes(user.id))
      .map((g) => g.id);

    const userGroups = Array.from(new Set([...userDirectGroups, ...memberGroupIds]));

    const hasDeptMatch = Array.isArray(rules.department_ids) && rules.department_ids.length > 0 && rules.department_ids.includes(userDeptId);
    const hasGroupMatch = Array.isArray(rules.group_ids) && rules.group_ids.length > 0 && rules.group_ids.some((gId) => userGroups.includes(gId));
    const hasUserMatch = Array.isArray(rules.user_ids) && rules.user_ids.length > 0 && rules.user_ids.includes(user.id);

    if (hasDeptMatch || hasGroupMatch || hasUserMatch) return true;

    return false;
  });
}
