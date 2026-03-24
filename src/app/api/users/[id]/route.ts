import { NextRequest, NextResponse } from "next/server";
import { findUserById, updateUser, deleteUser, findByEmail, findByUsername } from "@/services/userService";

type UserType = 'admin' | 'user';

interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  userType?: UserType;
  profile?: {
    name?: string;
    phone?: string;
  };
}

// GET /api/users/[id] - 获取单个用户
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await findUserById(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// PATCH /api/users/[id] - 更新用户
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body: UpdateUserRequest = await request.json();
    const { username, email, password, userType, profile } = body;

    // 查找用户
    const existingUser = await findUserById(id);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 检查邮箱是否已被其他用户使用
    if (email && email !== existingUser.email) {
      const emailExists = await findByEmail(email);
      if (emailExists) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    // 检查用户名是否已被其他用户使用
    if (username && username !== existingUser.username) {
      const usernameExists = await findByUsername(username);
      if (usernameExists) {
        return NextResponse.json({ error: "Username already in use" }, { status: 409 });
      }
    }

    // Build update data
    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (userType) updateData.userType = userType;
    if (profile) {
      if (profile.name) updateData.profileName = profile.name;
      if (profile.phone !== undefined) updateData.profilePhone = profile.phone;
    }

    const user = await updateUser(id, updateData);

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/users/[id] - 删除用户
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await deleteUser(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
