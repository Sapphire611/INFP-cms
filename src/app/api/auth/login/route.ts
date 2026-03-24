import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { validateCredentials } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password, remember = false } = body;

    // Validate credentials using Supabase
    const user = await validateCredentials(email, password);

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create JWT token with dynamic expiration based on "remember me"
    const token = sign(
      { id: user.id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET ?? "",
      {
        expiresIn: remember ? "30d" : "1d",
      }
    );

    // Calculate max-age for cookies (in seconds)
    const maxAge = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day

    // Optional: Create Supabase session for future use
    const supabase = await createClient();
    const { data: { session: supabaseSession } } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return NextResponse.json({
      ok: true,
      success: true,
      token,
      maxAge, // Send max-age to frontend for cookie configuration
      supabaseSession, // Include Supabase session for potential future use
      user: {
        id: user.id,
        name: user.profileName || user.username,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
