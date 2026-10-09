import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { hasPermission, listPermissions } from "@/services/permissionService";

// GET /api/permissions — list all permissions grouped by module
//
// 只读：有 users:view 就能看（权限管理页面对普通角色开放查看）
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!(await hasPermission(auth.id, auth.userType, "users", "view"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const permissions = await listPermissions();
    return NextResponse.json({ permissions });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
