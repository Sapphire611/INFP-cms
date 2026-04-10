import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { validateCredentials } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { getUserPermissions } from "@/services/permissionService";

interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password, remember = false } = body;

    const user = await validateCredentials(email, password);

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Load RBAC permissions (admin bypasses — empty array is fine, middleware checks userType)
    const permissions = user.userType === "admin"
      ? []
      : await getUserPermissions(user.id as string);

    const token = sign(
      {
        id: user.id,
        email: user.email,
        userType: user.userType,
        permissions,
      },
      process.env.JWT_SECRET ?? "",
      { expiresIn: remember ? "30d" : "1d" }
    );

    const maxAge = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

    const supabase = await createClient();
    const { data: { session: supabaseSession } } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return NextResponse.json({
      ok: true,
      success: true,
      token,
      maxAge,
      supabaseSession,
      user: {
        id: user.id,
        name: user.profileName || user.username,
        email: user.email,
        userType: user.userType,
        permissions,
      },
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
