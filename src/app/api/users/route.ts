import { NextRequest, NextResponse } from "next/server";

import bcrypt from "bcryptjs";
import { getToken } from "next-auth/jwt";

import User from "@/models/user";
import { CreateUserRequest, UpdateUserRequest } from "@/types/user";

// Helper function to extract and validate pagination parameters
function extractPaginationParams(url: URL) {
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Helper function to extract sorting parameters
function extractSortingParams(url: URL) {
  const sortField = url.searchParams.get("sortField") ?? "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") ?? "desc";
  const sort: Record<string, 1 | -1> = {};
  sort[sortField] = sortOrder === "asc" ? 1 : -1;
  return sort;
}

// Helper function to build query conditions
function buildQueryConditions(url: URL) {
  const query: Record<string, any> = {};
  const search = url.searchParams.get("search") ?? "";
  const userType = url.searchParams.get("userType") ?? "";

  if (search) {
    query.$or = [
      { "profile.name": { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }
  if (userType) {
    query.userType = userType;
  }

  return query;
}

// GET /api/users - 获取用户列表（支持分页、筛选和排序）
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Extract and validate parameters
    const { page, limit, skip } = extractPaginationParams(url);
    const sort = extractSortingParams(url);
    const query = buildQueryConditions(url);

    // Database operations
    const total = await User.countDocuments(query);
    const users = await User.find(query).select("-password").sort(sort).skip(skip).limit(limit);

    // Format and return data
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages,
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
    const { username, email, password, userType, profile, teacherInfo } = body;

    // 检查用户是否已存在
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    // 验证用户类型
    if (userType !== "admin" && userType !== "teacher") {
      return NextResponse.json(
        { error: "Invalid user type. Only admin and teacher are allowed." },
        { status: 400 }
      );
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password, // Password will be hashed by the pre-save middleware
      userType,
      profile: {
        name: profile.name,
        phone: profile.phone,
      },
      isActive: true,
    });

    // 如果是教师，添加教师信息
    if (userType === "teacher" && teacherInfo) {
      user.teacherInfo = {
        teacherId: teacherInfo.teacherId,
        classes: [],
        subjects: teacherInfo.subjects || [],
        classTeacherInfo: {
          totalClasses: 0,
          totalStudents: 0,
        },
      };
    }

    await user.save();

    // 返回创建的用户（不含密码）
    const userObj = user.toObject() as any;
    delete userObj.password;

    return NextResponse.json(userObj, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

// PUT /api/users/:id - 更新用户信息 (deprecated - use PATCH /api/users/[id] instead)
export async function PUT(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token || token.userType !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取URL中的用户ID
    const url = new URL(request.url);
    const userId = url.pathname.split("/").pop();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const body: UpdateUserRequest = await request.json();
    const { username, email, password, profile, teacherInfo } = body;

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 更新用户信息
    if (username) user.username = username;
    if (email) user.email = email;
    if (password) {
      // Password will be hashed by the pre-save middleware
      user.password = password;
    }

    // 更新 profile
    if (profile) {
      if (profile.name) user.profile.name = profile.name;
      if (profile.phone !== undefined) user.profile.phone = profile.phone;
    }

    // 如果是教师，更新教师信息
    if (user.userType === "teacher" && teacherInfo) {
      if (!user.teacherInfo) {
        user.teacherInfo = {
          classes: [],
          subjects: [],
          classTeacherInfo: {
            totalClasses: 0,
            totalStudents: 0,
          },
        };
      }
      if (teacherInfo.teacherId !== undefined) {
        user.teacherInfo.teacherId = teacherInfo.teacherId;
      }
      if (teacherInfo.subjects !== undefined) {
        user.teacherInfo.subjects = teacherInfo.subjects;
      }
    }

    user.updatedAt = new Date();

    await user.save();

    // 返回更新后的用户（不含密码）
    const userObj = user.toObject() as any;
    delete userObj.password;

    return NextResponse.json(userObj, { status: 200 });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
