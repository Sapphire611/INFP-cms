import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import WechatUser from "@/models/wechatUser";
import { CreateWechatUserRequest } from "@/types/wechatUser";

// Helper function to extract and validate pagination parameters
function extractPaginationParams(url: URL) {
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Helper function to build query conditions
function buildQueryConditions(url: URL) {
  const query: Record<string, any> = {};
  const search = url.searchParams.get("search") ?? "";
  const isActive = url.searchParams.get("isActive");

  if (search) {
    query.$or = [
      { "profile.name": { $regex: search, $options: "i" } },
      { "profile.phone": { $regex: search, $options: "i" } },
    ];
  }

  if (isActive !== null && isActive !== undefined && isActive !== "") {
    query.isActive = isActive === "true";
  }

  return query;
}

// GET /api/wechat-users - 获取微信用户列表
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const url = new URL(request.url);

    // Extract and validate parameters
    const { page, limit, skip } = extractPaginationParams(url);
    const query = buildQueryConditions(url);

    // Database operations
    const total = await WechatUser.countDocuments(query);
    const wechatUsers = await WechatUser.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    // Format and return data
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: wechatUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching wechat users:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/wechat-users - 创建新微信用户
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body: CreateWechatUserRequest = await request.json();
    const { profile, openid, wechatInfo } = body;

    // 验证必填字段
    if (!profile?.name) {
      return NextResponse.json({ error: "Wechat user name is required" }, { status: 400 });
    }

    // 检查openid是否已存在（如果提供）
    if (openid) {
      const existingWechatUser = await WechatUser.findOne({ openid });
      if (existingWechatUser) {
        return NextResponse.json({ error: "Wechat user with this openid already exists" }, { status: 409 });
      }
    }

    // 创建新微信用户
    const newWechatUser = new WechatUser({
      profile: {
        name: profile.name,
        phone: profile.phone,
        idNumber: profile.idNumber,
      },
      openid,
      wechatInfo,
      isActive: true,
    });

    await newWechatUser.save();

    return NextResponse.json(newWechatUser, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating wechat user:", error);
    const message = error instanceof Error ? error.message : "Failed to create wechat user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
