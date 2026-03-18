import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { validateCredentials } from "@/lib/auth";
import bcrypt from "bcryptjs";

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    console.log({ email, password });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log({ hashedPassword });
    // Validate credentials using auth utility
    const user = await validateCredentials(email, password);

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create JWT token
    const token = sign(
      { id: user.id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET ?? "",
      {
        expiresIn: "1d",
      }
    );

    return NextResponse.json({
      ok: true,
      success: true,
      token,
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
