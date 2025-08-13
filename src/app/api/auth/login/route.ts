import { NextRequest, NextResponse } from "next/server";

import { compare } from "bcryptjs";
import { sign } from "jsonwebtoken";

import { connectDB } from "@/lib/mongoose";
import User from "@/models/user";

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    // Ensure database connection is established
    await connectDB();
    console.log("Database connection established for login request");

    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if password matches
    const isPasswordValid = await compare(password, user.password);
    console.log({ isPasswordValid });
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create JWT token
    const token = sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET ?? "", {
      expiresIn: "1d",
    });

    // Return token and user data
    return NextResponse.json({
      ok: true,
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
