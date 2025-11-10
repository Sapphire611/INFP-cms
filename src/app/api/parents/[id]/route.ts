import { NextRequest, NextResponse } from "next/server";

import Parent from "@/models/parent";
import { UpdateParentRequest } from "@/types/parent";

// GET /api/parents/[id] - 获取单个家长详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const parent = await Parent.findById(id)
      .populate({
        path: "children",
        select: "name studentId class gender birthDate",
        populate: {
          path: "class",
          select: "name grade classCode",
        },
      })
      .lean();

    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    return NextResponse.json(parent);
  } catch (error: unknown) {
    console.error("Error fetching parent:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch parent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/parents/[id] - 更新家长信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateParentRequest = await request.json();

    // 查找家长
    const existingParent = await Parent.findById(id);
    if (!existingParent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    // 构建更新数据
    const updateData: any = {};

    if (body.profile) {
      updateData.profile = {
        ...existingParent.profile,
        ...body.profile,
      };
    }

    if (body.children !== undefined) {
      updateData.children = body.children;
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    if (body.wechatInfo) {
      updateData.wechatInfo = {
        ...existingParent.wechatInfo,
        ...body.wechatInfo,
      };
    }

    // 更新家长信息
    const updatedParent = await Parent.findByIdAndUpdate(id, updateData, {
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

    return NextResponse.json(updatedParent);
  } catch (error: unknown) {
    console.error("Error updating parent:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update parent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/parents/[id] - 删除家长
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 查找家长
    const parent = await Parent.findById(id);
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    // 检查是否有关联的子女
    if (parent.children && parent.children.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete parent with associated children. Please remove children first." },
        { status: 400 }
      );
    }

    // 删除家长
    await Parent.findByIdAndDelete(id);

    return NextResponse.json({ message: "Parent deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting parent:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete parent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
