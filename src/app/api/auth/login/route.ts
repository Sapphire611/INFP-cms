import { NextRequest, NextResponse } from "next/server";

import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

import User from "@/models/user";

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log("Database connection established for login request");

    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if user type is allowed to login (only admin and teacher)
    if (user.userType !== "admin" && user.userType !== "teacher") {
      return NextResponse.json({ error: "Unauthorized user type" }, { status: 403 });
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json({ error: "Account is disabled" }, { status: 403 });
    }

    // Check if password matches
    const isPasswordValid = await compare(password, user.password);
    console.log({ isPasswordValid });
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create JWT token
    const token = sign({ id: user._id, email: user.email, userType: user.userType }, process.env.JWT_SECRET ?? "", {
      expiresIn: "1d",
    });

    // Return token and user data
    return NextResponse.json({
      ok: true,
      success: true,
      token,
      user: {
        id: user._id,
        name: user.profile?.name || user.username,
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
