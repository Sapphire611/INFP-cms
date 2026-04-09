import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { getUserRoles, assignRolesToUser } from "@/services/permissionService";

// GET /api/users/[id]/roles — get roles assigned to a user
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.userType !== "admin") {
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
    if (auth.userType !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const { roleIds } = await request.json();

    if (!Array.isArray(roleIds)) {
      return NextResponse.json({ error: "roleIds must be an array" }, { status: 400 });
    }

    await assignRolesToUser(id, roleIds);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
