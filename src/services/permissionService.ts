import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminPermission } from '@/types/permission';
import type { PermissionKey, PermissionModule, PermissionAction, Role, RoleWithPermissions } from '@/types/permission';

// ─────────────────────────────────────────────────────────────────────────────
// Permission queries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all permission keys for a given CMS user.
 * admin users have every permission implicitly — this is enforced in the caller.
 */
export async function getUserPermissions(userId: string): Promise<PermissionKey[]> {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select(`
      roles (
        role_permissions (
          permissions (module, action)
        )
      )
    `)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to fetch user permissions: ${error.message}`);

  const keys = new Set<PermissionKey>();

  for (const ur of data ?? []) {
    const role = (ur as any).roles;
    if (!role) continue;
    for (const rp of role.role_permissions ?? []) {
      const p = rp.permissions;
      if (p?.module && p?.action) {
        keys.add(`${p.module}:${p.action}` as PermissionKey);
      }
    }
  }

  return Array.from(keys);
}

/**
 * Check whether a user has a specific permission.
 * admin users always return true.
 */
export async function hasPermission(
  userId: string,
  userType: string,
  module: PermissionModule,
  action: PermissionAction
): Promise<boolean> {
  if (userType === 'admin') return true;
  const permissions = await getUserPermissions(userId);
  return permissions.includes(`${module}:${action}`);
}

/**
 * 这批用户里哪些是「管理员」（持有带用户管理写权限的角色），一次查完。
 * 用户列表用它给每行打 isAdmin 标记，编辑/删除按钮据此隐藏；真正的拦截在接口里。
 */
export async function getAdminUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select(`
      user_id,
      roles (
        role_permissions (
          permissions (module, action)
        )
      )
    `)
    .in('user_id', userIds);

  if (error) throw new Error(`Failed to fetch user admin flags: ${error.message}`);

  const admins = new Set<string>();

  for (const row of data ?? []) {
    const role = (row as any).roles;
    const keys: string[] = (role?.role_permissions ?? [])
      .map((rp: any) => rp.permissions)
      .filter(Boolean)
      .map((p: any) => `${p.module}:${p.action}`);

    if (keys.some(isAdminPermission)) admins.add((row as any).user_id);
  }

  return admins;
}

/** 单个用户是不是管理员（上面的便捷版） */
export async function isUserAdmin(userId: string): Promise<boolean> {
  return (await getAdminUserIds([userId])).has(userId);
}

/**
 * 这些角色里哪些是「敏感角色」（带用户管理写权限），一次查完。
 * 敏感角色只有超管能授予 —— 否则管理员自己就能再造一个管理员。
 */
export async function getSensitiveRoleIds(roleIds: string[]): Promise<Set<string>> {
  if (roleIds.length === 0) return new Set();

  const { data, error } = await supabaseAdmin
    .from('role_permissions')
    .select('role_id, permissions (module, action)')
    .in('role_id', roleIds);

  if (error) throw new Error(`Failed to fetch role permissions: ${error.message}`);

  const sensitive = new Set<string>();

  for (const row of data ?? []) {
    const p = (row as any).permissions;
    if (p && isAdminPermission(`${p.module}:${p.action}`)) sensitive.add((row as any).role_id);
  }

  return sensitive;
}

/** 单个角色是不是敏感角色（上面的便捷版） */
export async function isSensitiveRole(roleId: string): Promise<boolean> {
  return (await getSensitiveRoleIds([roleId])).has(roleId);
}

/**
 * 当前登录者能不能动这个目标账号。返回拒绝原因，null = 放行。
 * 超管随便动；其余人只能动自己和普通用户 —— 同级管理员之间互相改密码 = 互相顶号。
 */
export async function userEditBlockReason(
  actor: { id: string; userType: string },
  target: { id: string; userType: string },
  action: '修改' | '删除'
): Promise<string | null> {
  if (actor.userType === 'admin' || actor.id === target.id) return null;
  if (target.userType === 'admin') return `无权${action}超级管理员`;
  if (await isUserAdmin(target.id)) return `无权${action}其他管理员`;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Role CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function listRoles(): Promise<Role[]> {
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);

  return (data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }));
}

export async function getRoleWithPermissions(roleId: string): Promise<RoleWithPermissions | null> {
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select(`
      *,
      role_permissions (
        permissions (id, module, action, description)
      )
    `)
    .eq('id', roleId)
    .single();

  if (error) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    permissions: (data.role_permissions ?? []).map((rp: any) => rp.permissions).filter(Boolean),
  };
}

export async function createRole(name: string, description: string, permissionIds: string[]): Promise<Role> {
  const id = `role_${crypto.randomUUID().replace(/-/g, '')}`;

  const { data: role, error: roleError } = await supabaseAdmin
    .from('roles')
    .insert({ id, name, description })
    .select()
    .single();

  if (roleError) throw new Error(roleError.message);

  if (permissionIds.length > 0) {
    const { error: rpError } = await supabaseAdmin
      .from('role_permissions')
      .insert(permissionIds.map(pid => ({ role_id: id, permission_id: pid })));
    if (rpError) throw new Error(rpError.message);
  }

  return {
    id: role.id,
    name: role.name,
    description: role.description,
    createdAt: new Date(role.created_at),
    updatedAt: new Date(role.updated_at),
  };
}

export async function updateRole(
  roleId: string,
  updates: { name?: string; description?: string; permissionIds?: string[] }
): Promise<void> {
  if (updates.name !== undefined || updates.description !== undefined) {
    const { error } = await supabaseAdmin
      .from('roles')
      .update({ name: updates.name, description: updates.description })
      .eq('id', roleId);
    if (error) throw new Error(error.message);
  }

  if (updates.permissionIds !== undefined) {
    await supabaseAdmin.from('role_permissions').delete().eq('role_id', roleId);
    if (updates.permissionIds.length > 0) {
      const { error } = await supabaseAdmin
        .from('role_permissions')
        .insert(updates.permissionIds.map(pid => ({ role_id: roleId, permission_id: pid })));
      if (error) throw new Error(error.message);
    }
  }
}

export async function deleteRole(roleId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('roles').delete().eq('id', roleId);
  if (error) throw new Error(error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// User-Role assignment
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserRoles(userId: string): Promise<Role[]> {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('roles (*)')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((ur: any) => ur.roles)
    .filter(Boolean)
    .map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
}

/**
 * Batch fetch roles for multiple users at once.
 * Returns a Map of userId -> Role[]
 */
export async function getBatchUserRoles(userIds: string[]): Promise<Map<string, Role[]>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, roles (*)')
    .in('user_id', userIds);

  if (error) throw new Error(error.message);

  const rolesByUser = new Map<string, Role[]>();

  for (const ur of data ?? []) {
    const userId = ur.user_id;
    const role = (ur as any).roles;

    if (!role) continue;

    const roleObj: Role = {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: new Date(role.created_at),
      updatedAt: new Date(role.updated_at),
    };

    if (!rolesByUser.has(userId)) {
      rolesByUser.set(userId, []);
    }
    rolesByUser.get(userId)!.push(roleObj);
  }

  return rolesByUser;
}

export async function assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
  await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
  if (roleIds.length > 0) {
    const { error } = await supabaseAdmin
      .from('user_roles')
      .insert(roleIds.map(rid => ({ user_id: userId, role_id: rid })));
    if (error) throw new Error(error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// List all permissions (for UI)
// ─────────────────────────────────────────────────────────────────────────────

export async function listPermissions() {
  const { data, error } = await supabaseAdmin
    .from('permissions')
    .select('*')
    .order('module')
    .order('action');

  if (error) throw new Error(error.message);
  return data ?? [];
}
