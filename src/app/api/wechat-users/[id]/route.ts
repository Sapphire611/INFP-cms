import { NextRequest, NextResponse } from "next/server";
import {
  findWechatUserById,
  updateWechatUser,
  deleteWechatUser,
} from "@/services/wechatUserService";

interface UpdateWechatUserRequest {
  profile?: {
    name?: string;
    phone?: string;
    idNumber?: string;
  };
  isActive?: boolean;
  wechatInfo?: {
    nickname?: string;
    avatarUrl?: string;
  };
}

// GET /api/wechat-users/[id] - 获取单个微信用户详情
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const wechatUser = await findWechatUserById(id);

    if (!wechatUser) {
      return NextResponse.json({ error: "Wechat user not found" }, { status: 404 });
    }

    return NextResponse.json(wechatUser);
  } catch (error: unknown) {
    console.error("Error fetching wechat user:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch wechat user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/wechat-users/[id] - 更新微信用户信息
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body: UpdateWechatUserRequest = await request.json();

    // Build update data
    const updateData: any = {};

    if (body.profile?.name !== undefined) {
      updateData.profileName = body.profile.name;
    }
    if (body.profile?.phone !== undefined) {
      updateData.profilePhone = body.profile.phone;
    }
    if (body.profile?.idNumber !== undefined) {
      updateData.profileIdNumber = body.profile.idNumber;
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    if (body.wechatInfo) {
      if (body.wechatInfo.nickname !== undefined) {
        updateData.wechatNickname = body.wechatInfo.nickname;
      }
      if (body.wechatInfo.avatarUrl !== undefined) {
        updateData.wechatAvatarUrl = body.wechatInfo.avatarUrl;
      }
    }

    // Update wechat user information
    const updatedWechatUser = await updateWechatUser(id, updateData);

    return NextResponse.json(updatedWechatUser);
  } catch (error: unknown) {
    console.error("Error updating wechat user:", error);
    const message = error instanceof Error ? error.message : "Failed to update wechat user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/wechat-users/[id] - 删除微信用户
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if wechat user exists
    const wechatUser = await findWechatUserById(id);
    if (!wechatUser) {
      return NextResponse.json({ error: "Wechat user not found" }, { status: 404 });
    }

    await deleteWechatUser(id);

    return NextResponse.json({ message: "Wechat user deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting wechat user:", error);
    const message = error instanceof Error ? error.message : "Failed to delete wechat user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
