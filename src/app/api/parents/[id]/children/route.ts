import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Parent from "@/models/parent";
import Child from "@/models/child";

interface AddChildRequest {
  childId: string;
  relationship?: string;
  isPrimary?: boolean;
}

/**
 * POST /api/parents/[id]/children - 为家长添加孩子关联
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body: AddChildRequest = await request.json();

    if (!body.childId) {
      return NextResponse.json(
        { error: "childId is required" },
        { status: 400 }
      );
    }

    // 查找家长
    const parent = await Parent.findById(id);
    if (!parent) {
      return NextResponse.json(
        { error: "Parent not found" },
        { status: 404 }
      );
    }

    // 查找孩子
    const child = await Child.findById(body.childId);
    if (!child) {
      return NextResponse.json(
        { error: "Child not found" },
        { status: 404 }
      );
    }

    // 检查是否已经关联
    const isAlreadyLinked = parent.children.some(
      (childId) => childId.toString() === body.childId
    );

    if (isAlreadyLinked) {
      return NextResponse.json(
        { error: "Child already linked to this parent" },
        { status: 400 }
      );
    }

    // 添加关联到家长
    parent.children.push(body.childId as any);
    await parent.save();

    // 添加关联到孩子
    const parentInfo = {
      user: parent._id,
      relationship: body.relationship || "其他监护人",
      isPrimary: body.isPrimary || false,
    };

    child.parents.push(parentInfo as any);
    await child.save();

    // 返回更新后的家长信息
    const updatedParent = await Parent.findById(id)
      .populate({
        path: "children",
        select: "name studentId class gender birthDate avatar",
        populate: {
          path: "class",
          select: "name grade classCode",
        },
      })
      .lean();

    return NextResponse.json(updatedParent);
  } catch (error: unknown) {
    console.error("Error adding child to parent:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to add child to parent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/parents/[id]/children - 移除家长与孩子的关联
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");

    if (!childId) {
      return NextResponse.json(
        { error: "childId is required" },
        { status: 400 }
      );
    }

    // 查找家长
    const parent = await Parent.findById(id);
    if (!parent) {
      return NextResponse.json(
        { error: "Parent not found" },
        { status: 404 }
      );
    }

    // 查找孩子
    const child = await Child.findById(childId);
    if (!child) {
      return NextResponse.json(
        { error: "Child not found" },
        { status: 404 }
      );
    }

    // 从家长的 children 数组中移除
    parent.children = parent.children.filter(
      (c) => c.toString() !== childId
    );
    await parent.save();

    // 从孩子的 parents 数组中移除
    child.parents = child.parents.filter(
      (p: any) => p.user.toString() !== id
    );
    await child.save();

    // 返回更新后的家长信息
    const updatedParent = await Parent.findById(id)
      .populate({
        path: "children",
        select: "name studentId class gender birthDate avatar",
        populate: {
          path: "class",
          select: "name grade classCode",
        },
      })
      .lean();

    return NextResponse.json(updatedParent);
  } catch (error: unknown) {
    console.error("Error removing child from parent:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to remove child from parent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
