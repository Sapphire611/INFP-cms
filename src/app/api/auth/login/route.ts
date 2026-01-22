import { NextRequest, NextResponse } from "next/server";

import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

import { connectDB } from "@/lib/mongoose";
import User from "@/models/user";

interface LoginRequest {
  email: string;
  password: string;
}

async function validateUserExists(email: string) {
  const user = await User.findOne({ email });
  if (!user) {
    return { error: NextResponse.json({ error: "Invalid credentials" }, { status: 401 }) };
  }
  return { user };
}

async function validateUserType(userType: string) {
  if (!["admin", "teacher"].includes(userType)) {
    return { error: NextResponse.json({ error: "Unauthorized user type" }, { status: 403 }) };
  }
  return { valid: true };
}

async function validateUserActive(isActive: boolean) {
  if (!isActive) {
    return { error: NextResponse.json({ error: "Account is disabled" }, { status: 403 }) };
  }
  return { valid: true };
}

async function validatePassword(password: string, hashedPassword: string) {
  const isPasswordValid = await compare(password, hashedPassword);
  if (!isPasswordValid) {
    return { error: NextResponse.json({ error: "Invalid credentials" }, { status: 401 }) };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    console.log("Database connection established for login request");

    const body: LoginRequest = await request.json();
    const { email, password } = body;

    console.log({ email, password });

    const userResult = await validateUserExists(email);
    if (userResult.error) return userResult.error;
    const user = userResult.user!;

    const typeResult = await validateUserType(user.userType);
    if (typeResult.error) return typeResult.error;

    const activeResult = await validateUserActive(user.isActive);
    if (activeResult.error) return activeResult.error;

    const passwordResult = await validatePassword(password, user.password);
    if (passwordResult.error) return passwordResult.error;

    const token = sign({ id: user._id, email: user.email, userType: user.userType }, process.env.JWT_SECRET ?? "", {
      expiresIn: "1d",
    });

    return NextResponse.json({
      ok: true,
      success: true,
      token,
      user: {
        id: user._id,
        name: user.profile.name || user.username,
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
