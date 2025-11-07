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
    const { username, email, password, userType, profile, teacherInfo } = body;

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

    // 检查用户名是否已被其他用户使用
    if (username && username !== existingUser.username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return NextResponse.json({ error: "Username already in use" }, { status: 409 });
      }
    }

    // 更新用户信息
    if (username) existingUser.username = username;
    if (email) existingUser.email = email;
    if (password) {
      // Password will be hashed by the pre-save middleware
      existingUser.password = password;
    }

    // 更新用户类型
    if (userType && userType !== existingUser.userType) {
      const oldUserType = existingUser.userType;
      existingUser.userType = userType;

      // 如果从非教师变为教师，初始化 teacherInfo
      if (userType === "teacher" && oldUserType !== "teacher") {
        existingUser.teacherInfo = {
          classes: [],
          subjects: [],
          classTeacherInfo: {
            totalClasses: 0,
            totalStudents: 0,
          },
        };
      }

      // 如果从非家长变为家长，初始化 parentInfo
      if (userType === "parent" && oldUserType !== "parent") {
        existingUser.parentInfo = {
          children: [],
        };
      }
    }

    // 更新 profile
    if (profile) {
      if (profile.name) existingUser.profile.name = profile.name;
      if (profile.phone !== undefined) existingUser.profile.phone = profile.phone;
    }

    // 如果是教师，更新教师信息
    if (existingUser.userType === "teacher" && teacherInfo) {
      if (!existingUser.teacherInfo) {
        existingUser.teacherInfo = {
          classes: [],
          subjects: [],
          classTeacherInfo: {
            totalClasses: 0,
            totalStudents: 0,
          },
        };
      }
      if (teacherInfo.teacherId !== undefined) {
        existingUser.teacherInfo.teacherId = teacherInfo.teacherId;
      }
      if (teacherInfo.subjects !== undefined) {
        existingUser.teacherInfo.subjects = teacherInfo.subjects;
      }
    }

    existingUser.updatedAt = new Date();
    await existingUser.save();

    // 返回更新后的用户（不含密码）
    const userObj = existingUser.toObject() as any;
    delete userObj.password;

    // 确保日期字段是字符串格式
    const userWithStringDates = {
      ...userObj,
      createdAt: existingUser.createdAt.toISOString(),
      updatedAt: existingUser.updatedAt.toISOString(),
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
