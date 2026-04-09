import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { listRoles, createRole } from "@/services/permissionService";

// GET /api/roles — list all roles
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.userType !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const roles = await listRoles();
    return NextResponse.json({ roles });
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
