import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { listPermissions } from "@/services/permissionService";

// GET /api/permissions — list all permissions grouped by module
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.userType !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const permissions = await listPermissions();
    return NextResponse.json({ permissions });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
