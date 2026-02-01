import { NextRequest, NextResponse } from "next/server";
import { findWechatUsers, createWechatUser, findByOpenid } from "@/services/wechatUserService";

interface CreateWechatUserRequest {
  profile: {
    name: string;
    phone?: string;
    idNumber?: string;
  };
  openid?: string;
  wechatInfo?: {
    nickname?: string;
    avatarUrl?: string;
  };
}

// Helper function to extract and validate pagination parameters
function extractPaginationParams(url: URL) {
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 20;
  return { page, limit };
}

// GET /api/wechat-users - 获取微信用户列表
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Extract and validate parameters
    const { page, limit } = extractPaginationParams(url);
    const search = url.searchParams.get("search") ?? undefined;
    const isActiveParam = url.searchParams.get("isActive");
    const isActive = isActiveParam ? isActiveParam === "true" : undefined;

    // Use service to fetch wechat users
    const result = await findWechatUsers(
      { search, isActive },
      { page, pageSize: limit }
    );

    return NextResponse.json({
      data: result.wechatUsers,
      pagination: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.pageSize,
        totalPages: result.pagination.totalPages,
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
    const body: CreateWechatUserRequest = await request.json();
    const { profile, openid, wechatInfo } = body;

    // 验证必填字段
    if (!profile?.name) {
      return NextResponse.json({ error: "Wechat user name is required" }, { status: 400 });
    }

    // 检查openid是否已存在（如果提供）
    if (openid) {
      const existingWechatUser = await findByOpenid(openid);
      if (existingWechatUser) {
        return NextResponse.json({ error: "Wechat user with this openid already exists" }, { status: 409 });
      }
    }

    // 创建新微信用户
    const newWechatUser = await createWechatUser({
      profileName: profile.name,
      profilePhone: profile.phone,
      profileIdNumber: profile.idNumber,
      openid,
      wechatNickname: wechatInfo?.nickname,
      wechatAvatarUrl: wechatInfo?.avatarUrl,
      isActive: true,
    });

    return NextResponse.json(newWechatUser, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating wechat user:", error);
    const message = error instanceof Error ? error.message : "Failed to create wechat user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
