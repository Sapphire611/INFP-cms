export type PermissionModule =
  | 'dashboard'
  | 'users'
  | 'wechat_users'
  | 'chat'
  | 'models';

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

/**
 * 「权限管理」里种子数据自带的超级管理员角色 —— 等于全权限。
 * 只能由后台直接改库分配：界面不展示、接口不接收（见 isAssignableRole）。
 */
export const SUPER_ADMIN_ROLE_ID = 'role_super_admin';

/** 该角色是否可以由界面 / 接口分配给用户（超级管理员除外） */
export function isAssignableRole(roleId: string): boolean {
  return roleId !== SUPER_ADMIN_ROLE_ID;
}

/** 拒绝创建超级管理员时的统一文案（服务层抛错与接口响应共用） */
export const SUPER_ADMIN_NOT_CREATABLE = '超级管理员不可创建，请直接改库分配';

/**
 * 「管理员」的判定标准：持有带用户管理写权限的角色。
 * 管理员之间互相不可编辑（见 PATCH/DELETE /api/users/[id]）—— 否则拿到 users:update
 * 就能重置同级管理员的密码，把人顶掉。
 * users:view 不算：只读的「查看者」仍旧归管理员管。
 */
export function isAdminPermission(permissionKey: string): boolean {
  return permissionKey === 'users:create' || permissionKey === 'users:update' || permissionKey === 'users:delete';
}

/** 非超管想授予敏感角色时的统一文案 —— 否则管理员能再造一个管理员，人数就控制不住了 */
export const SENSITIVE_ROLE_NOT_GRANTABLE = '该角色带用户管理权限，只有超级管理员能授予';

// Route → required permission mapping
export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  '/cms/dashboard': 'dashboard:view',
  '/cms/users': 'users:view',
  '/cms/wechat-users': 'wechat_users:view',
  '/cms/roles': 'users:view', // Roles management requires users:view permission
};

/**
 * 只有超级管理员能进的路由 —— 权限系统管不着，别人一律进不去。
 * 模型管理里存着 API 密钥，连「只读」都不给。
 */
export const SUPER_ADMIN_ONLY_ROUTES: string[] = ['/cms/models'];

/**
 * 该用户能进的第一条 CMS 路由（一条都进不去则返回 null）。
 * 「切换到 CMS」入口用它决定跳哪 —— 写死 /cms/dashboard 会把只有 users:view 的人弹到 /unauthorized。
 */
export function firstAccessibleRoute(can: (permissionKey: string) => boolean): string | null {
  for (const [path, key] of Object.entries(ROUTE_PERMISSIONS)) {
    if (can(key)) return path;
  }
  return null;
}
