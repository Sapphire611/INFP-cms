import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/jwt";
import { findUsers, createUser, findByEmail, findByUsername } from "@/services/userService";
import {
  getBatchUserRoles,
  hasPermission,
  assignRolesToUser,
  getRoleWithPermissions,
} from "@/services/permissionService";
import { SUPER_ADMIN_NOT_CREATABLE, isAssignableRole } from "@/types/permission";

type UserType = "admin" | "user";

interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  /** 用户类型 = 权限管理里的角色。只用来拦截 'admin'，实际写库恒为 'user' */
  userType?: UserType;
  roleId?: string;
  profile?: {
    name?: string;
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
    const roleId = url.searchParams.get("roleId") ?? undefined;
    const isActiveParam = url.searchParams.get("isActive");
    const isActive = isActiveParam ? isActiveParam === "true" : undefined;

    // Use service to fetch users
    const result = await findUsers(
      { search, userType: userType ?? undefined, roleId, isActive },
      { page, pageSize: limit }
    );

    // Batch fetch roles for all users
    const userIds = result.users.map((u: any) => u.id);
    const rolesByUser = await getBatchUserRoles(userIds);

    const usersWithRoles = result.users.map((u: any) => ({
      ...u,
      roles: (rolesByUser.get(u.id) ?? []).map((r) => ({ id: r.id, name: r.name })),
    }));

    return NextResponse.json({
      data: usersWithRoles,
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
//
// 用户类型 = 权限管理里的角色：新用户一律 user_type='user'，权限由所选角色决定。
// 超级管理员（user_type='admin' 与 role_super_admin 角色）只由后台改库产生。
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();

    if (!(await hasPermission(auth.id, auth.userType, "users", "create"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: CreateUserRequest = await request.json();
    const { username, email, password, userType, roleId, profile } = body;

    // 界面已不提供「管理员」选项，这里再兜一层：接口也不接受
    if (userType === "admin") {
      return NextResponse.json({ error: SUPER_ADMIN_NOT_CREATABLE }, { status: 403 });
    }

    if (!roleId) {
      return NextResponse.json({ error: "请为用户选择角色" }, { status: 400 });
    }

    // 超级管理员角色同样不可分配 —— 否则等于绕开上面的拦截造出第二个万能账号
    if (!isAssignableRole(roleId)) {
      return NextResponse.json({ error: SUPER_ADMIN_NOT_CREATABLE }, { status: 403 });
    }

    if (!(await getRoleWithPermissions(roleId))) {
      return NextResponse.json({ error: "角色不存在" }, { status: 400 });
    }

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
      userType: "user",
      roleId,
      profileName: profile?.name,
      profilePhone: profile?.phone,
    });

    // 绑定角色 —— 权限的唯一来源
    await assignRolesToUser(user.id, [roleId]);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === SUPER_ADMIN_NOT_CREATABLE) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
