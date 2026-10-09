import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { assignRolesToUser, getUserRoles, hasPermission } from "@/services/permissionService";
import { SUPER_ADMIN_NOT_CREATABLE, isAssignableRole } from "@/types/permission";

// GET /api/users/[id]/roles — get roles assigned to a user
// 编辑弹窗只读展示当前角色用，users:view 即可 —— 角色本来就在用户列表里露着
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
//
// 角色只有超管能分配：编辑弹窗里普通管理员的角色字段是只读的，接口也只收超管 ——
// 否则管理员挑个「查看者」就能把别人（或自己）降级。role_super_admin 更是永远不可分配。
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.userType !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { roleIds } = await request.json();

    if (!Array.isArray(roleIds)) {
      return NextResponse.json({ error: "roleIds must be an array" }, { status: 400 });
    }

    for (const roleId of roleIds) {
      if (!isAssignableRole(roleId)) {
        return NextResponse.json({ error: SUPER_ADMIN_NOT_CREATABLE }, { status: 403 });
      }
    }

    await assignRolesToUser(id, roleIds);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
