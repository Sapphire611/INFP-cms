import { supabaseAdmin } from '@/lib/supabase-admin';
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
