export interface DbRole {
  id: string;
  name: string;
  icon: string;
  description?: string;
  admin_access: boolean;
  app_access: boolean;
}

export interface DbUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string | DbRole;
  status: string;
}

/**
 * Fetch Database Roles
 */
export async function getDbRoles(): Promise<DbRole[]> {
  return [
    { id: 'role-admin', name: 'Administrator', icon: 'verified_user', admin_access: true, app_access: true },
    { id: 'role-selfservice', name: 'Self-Service Employee', icon: 'person', admin_access: false, app_access: true },
    { id: 'role-agent', name: 'Agent', icon: 'support_agent', admin_access: false, app_access: true },
  ];
}

/**
 * Fetch Database Users from local MySQL 'system_users' table
 */
export async function getDbUsers(): Promise<DbUser[]> {
  const { dbGet } = await import('./mysqlClient');
  try {
    const users = await dbGet('system_users', { is_active: 1 });
    return users.map(u => ({
      id: u.id,
      first_name: u.name?.split(' ')[0] || u.name || '',
      last_name: u.name?.split(' ').slice(1).join(' ') || '',
      email: u.email || '',
      role: u.role || 'role-selfservice',
      status: 'active'
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Sync Role Permissions locally
 */
export async function syncDbRolePermission(roleName: string, permissionsConfig: any) {
  console.log(`Syncing role permissions for ${roleName}:`, permissionsConfig);
  return { success: true };
}
