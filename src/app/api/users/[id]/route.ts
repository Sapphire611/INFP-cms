import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { withDBConnect } from "@/lib/mongoose";
import User from "@/models/user";
import { UpdateUserRequest } from "@/types/user";

// GET /api/users/[id] - 获取单个用户
export const GET = withDBConnect(async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params before accessing id
    const { id } = await params;
    const user = await User.findById(id).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 确保日期字段是字符串格式
    const userWithStringDates = {
      ...user.toObject(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return NextResponse.json(userWithStringDates);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
});

// PATCH /api/users/[id] - 更新用户
export const PATCH = withDBConnect(async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params before accessing id
    const { id } = await params;
    const body: UpdateUserRequest = await request.json();
    const { name, email, password } = body;

    // 查找用户
    const existingUser = await User.findById(id);

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 检查邮箱是否已被其他用户使用
    if (email && email !== existingUser.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    // 准备更新数据
    const updateData: any = { name, email };
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // 更新用户
    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select("-password");

    // 确保日期字段是字符串格式
    const userWithStringDates = {
      ...updatedUser.toObject(),
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    };

    return NextResponse.json(userWithStringDates);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
});

// DELETE /api/users/[id] - 删除用户
export const DELETE = withDBConnect(async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params before accessing id
    const { id } = await params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
});
