import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import WechatUser from "@/models/wechatUser";
import { UpdateWechatUserRequest } from "@/types/wechatUser";

// GET /api/wechat-users/[id] - 获取单个微信用户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const wechatUser = await WechatUser.findById(id).lean();

    if (!wechatUser) {
      return NextResponse.json({ error: "Wechat user not found" }, { status: 404 });
    }

    return NextResponse.json(wechatUser);
  } catch (error: unknown) {
    console.error("Error fetching wechat user:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch wechat user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/wechat-users/[id] - 更新微信用户信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body: UpdateWechatUserRequest = await request.json();

    // 查找微信用户
    const existingWechatUser = await WechatUser.findById(id);
    if (!existingWechatUser) {
      return NextResponse.json({ error: "Wechat user not found" }, { status: 404 });
    }

    // 构建更新数据
    const updateData: any = {};

    if (body.profile) {
      updateData.profile = {
        ...existingWechatUser.profile,
        ...body.profile,
      };
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    if (body.wechatInfo) {
      updateData.wechatInfo = {
        ...existingWechatUser.wechatInfo,
        ...body.wechatInfo,
      };
    }

    // 更新微信用户信息
    const updatedWechatUser = await WechatUser.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate({
        path: "children",
        select: "name studentId class gender birthDate",
        populate: {
          path: "class",
          select: "name grade classCode",
        },
      })
      .lean();

    return NextResponse.json(updatedWechatUser);
  } catch (error: unknown) {
    console.error("Error updating wechat user:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update wechat user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/wechat-users/[id] - 删除微信用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // 查找并删除微信用户
    const wechatUser = await WechatUser.findById(id);
    if (!wechatUser) {
      return NextResponse.json({ error: "Wechat user not found" }, { status: 404 });
    }

    await WechatUser.findByIdAndDelete(id);

    return NextResponse.json({ message: "Wechat user deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting wechat user:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete wechat user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
