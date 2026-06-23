export type PermissionModule =
  | 'dashboard'
  | 'users'
  | 'wechat_users'
  | 'chat';

export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

export type PermissionKey = `${PermissionModule}:${PermissionAction}`;

export interface Permission {
  id: string;
  module: PermissionModule;
  action: PermissionAction;
  description: string | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface UserRole {
  userId: string;
  roleId: string;
  roleName: string;
}

// Route → required permission mapping
export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  '/cms/dashboard': 'dashboard:view',
  '/cms/users': 'users:view',
  '/cms/wechat-users': 'wechat_users:view',
  '/cms/roles': 'users:view', // Roles management requires users:view permission
  '/demo/chat': 'chat:view',
};
