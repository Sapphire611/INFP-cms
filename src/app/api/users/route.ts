import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { findUsers, createUser, findByEmail, findByUsername } from "@/services/userService";

type UserType = 'admin' | 'user';

interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  userType: UserType;
  profile: {
    name: string;
    phone?: string;
  };
}

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

// Helper function to extract pagination parameters
function extractPaginationParams(url: URL) {
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 20;
  return { page, limit };
}

// GET /api/users - 获取用户列表（支持分页、筛选和排序）
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Extract parameters
    const { page, limit } = extractPaginationParams(url);
    const search = url.searchParams.get("search") ?? undefined;
    const userType = url.searchParams.get("userType") as UserType | null;
    const isActiveParam = url.searchParams.get("isActive");
    const isActive = isActiveParam ? isActiveParam === "true" : undefined;

    // Use service to fetch users
    const result = await findUsers(
      { search, userType: userType ?? undefined, isActive },
      { page, pageSize: limit }
    );

    return NextResponse.json({
      data: result.users,
      pagination: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.pageSize,
        totalPages: result.pagination.totalPages,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/users - 创建新用户
export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();
    const { username, email, password, userType, profile } = body;

    // 检查用户是否已存在
    const existingUserByEmail = await findByEmail(email);
    if (existingUserByEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const existingUserByUsername = await findByUsername(username);
    if (existingUserByUsername) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    // 创建新用户
    const user = await createUser({
      username,
      email,
      password,
      userType,
      profileName: profile.name,
      profilePhone: profile.phone,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

// PUT /api/users/:id - 更新用户信息 (deprecated - use PATCH /api/users/[id] instead)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Check if user is admin
    if (user.userType !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 获取URL中的用户ID
    const url = new URL(request.url);
    const userId = url.pathname.split("/").pop();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const body: UpdateUserRequest = await request.json();
    const { username, email, password, profile } = body;

    // Build update data
    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (profile) {
      if (profile.name) updateData.profileName = profile.name;
      if (profile.phone !== undefined) updateData.profilePhone = profile.phone;
    }

    // Update user (importing updateUser from service)
    const { updateUser } = await import("@/services/userService");
    const updatedUser = await updateUser(userId, updateData);

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("Error updating user:", error);
    const message = error instanceof Error ? error.message : "Failed to update user";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
