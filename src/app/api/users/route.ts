import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import bcrypt from "bcryptjs";

import User from "@/models/user";
import { CreateUserRequest } from "@/types/user";

// GET /api/users - 获取用户列表
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await User.find().select("-password");

    // 转换日期为字符串
    const formattedUsers = users.map(user => ({
      ...user.toObject(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users - 创建新用户
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateUserRequest = await request.json();
    const { name, email, password, role } = body;

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
      role: role || "user"
    });

    await user.save();

    // 返回创建的用户（不含密码）
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    return NextResponse.json({
      ...userWithoutPassword,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
