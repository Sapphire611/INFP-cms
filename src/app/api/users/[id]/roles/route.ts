import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { findUserById } from "@/services/userService";
import {
  assignRolesToUser,
  getUserRoles,
  hasPermission,
  isSensitiveRole,
  userEditBlockReason,
} from "@/services/permissionService";
import {
  SENSITIVE_ROLE_NOT_GRANTABLE,
  SUPER_ADMIN_NOT_CREATABLE,
  isAssignableRole,
} from "@/types/permission";

// GET /api/users/[id]/roles — get roles assigned to a user
// 编辑弹窗要用（选中当前角色），users:view 即可 —— 角色本来就在用户列表里露着
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!(await hasPermission(auth.id, auth.userType, "users", "view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const roles = await getUserRoles(id);
    return NextResponse.json({ roles });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// PUT /api/users/[id]/roles — replace all roles for a user
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (!(await hasPermission(auth.id, auth.userType, "users", "update"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { roleIds } = await request.json();

    if (!Array.isArray(roleIds)) {
      return NextResponse.json({ error: "roleIds must be an array" }, { status: 400 });
    }

    // 换角色 = 改用户，走和 PATCH 一样的保护：超管只有超管能动，管理员之间互相不能动
    // （用户不存在时 findUserById 自己会抛，不会漏过检查）
    const target = await findUserById(id);
    const blockReason = await userEditBlockReason(auth, target, "修改");
    if (blockReason) {
      return NextResponse.json({ error: blockReason }, { status: 403 });
    }

    // 两道闸：超管角色永远不可分配；敏感角色（带用户管理写权限）只有超管能授 ——
    // 否则管理员给自己或新账号挂一个带 users:update 的角色，就能无限复制管理员
    for (const roleId of roleIds) {
      if (!isAssignableRole(roleId)) {
        return NextResponse.json({ error: SUPER_ADMIN_NOT_CREATABLE }, { status: 403 });
      }
      if (auth.userType !== "admin" && (await isSensitiveRole(roleId))) {
        return NextResponse.json({ error: SENSITIVE_ROLE_NOT_GRANTABLE }, { status: 403 });
      }
    }

    await assignRolesToUser(id, roleIds);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
