import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { getSensitiveRoleIds, hasPermission, listRoles, createRole } from "@/services/permissionService";

// GET /api/roles — list all roles
//
// 只读：有 users:view 就能看；改角色仍然只有超管（见下面的 POST）
// isSensitive = 带用户管理写权限，这种角色只有超管能授予 —— 用户弹窗据此过滤下拉项
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!(await hasPermission(auth.id, auth.userType, "users", "view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const roles = await listRoles();
    const sensitiveIds = await getSensitiveRoleIds(roles.map((r) => r.id));
    return NextResponse.json({
      roles: roles.map((r) => ({ ...r, isSensitive: sensitiveIds.has(r.id) })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// POST /api/roles — create a new role
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.userType !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description = "", permissionIds = [] } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const role = await createRole(name, description, permissionIds);
    return NextResponse.json({ role }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
