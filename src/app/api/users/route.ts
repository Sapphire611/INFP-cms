import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";
import { getToken } from "next-auth/jwt";

import { withDBConnect } from "@/lib/mongoose";
import User from "@/models/user";
import { CreateUserRequest, UpdateUserRequest } from "@/types/user";

// GET /api/users - 获取用户列表
export const GET = withDBConnect(async function GET(request: NextRequest) {
  try {
    const users = await User.find().select("-password");

    const formattedUsers = users.map((user) => ({
      ...user.toObject(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));

    return NextResponse.json(formattedUsers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

// POST /api/users - 创建新用户
export const POST = withDBConnect(async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    const { name, email, password } = body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建新用户
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await user.save();

    // 返回创建的用户（不含密码）
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    return NextResponse.json(
      {
        ...userWithoutPassword,
        id: user._id.toString(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
});

// PUT /api/users/:id - 更新用户信息
export const PUT = withDBConnect(async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取URL中的用户ID
    const url = new URL(request.url);
    const userId = url.pathname.split("/").pop();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const body: UpdateUserRequest = await request.json();
    const { name, email, password } = body;

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 更新用户信息
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      // 哈希新密码
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    user.updatedAt = new Date();

    await user.save();

    // 返回更新后的用户（不含密码）
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    return NextResponse.json({
      ...userWithoutPassword,
      id: user._id.toString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
});
