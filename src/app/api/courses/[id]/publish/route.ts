import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Course from "@/models/course";
import mongoose from "mongoose";

/**
 * POST /api/courses/[id]/publish - 发布课程
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // 先检查课程是否存在
    const exists = await Course.findById(id).lean();
    if (!exists) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    // 使用 MongoDB 原生 driver 直接更新（绕过 Mongoose 的限制）
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const coursesCollection = db.collection("courses");
    const updateResult = await coursesCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          isPublished: true,
          updatedAt: new Date()
        }
      }
    );

    console.log("更新结果:", updateResult);

    // 重新查询获取更新后的文档
    const updatedCourse = await Course.findById(id).lean();

    console.log("发布成功:", {
      id: updatedCourse?._id,
      title: updatedCourse?.title,
      isPublished: updatedCourse?.isPublished,
    });

    return NextResponse.json({
      code: 10001,
      msg: "发布课程成功",
      data: updatedCourse,
    });
  } catch (error: unknown) {
    console.error("Error publishing course:", error);
    const message =
      error instanceof Error ? error.message : "Failed to publish course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[id]/publish - 取消发布课程
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // 先检查课程是否存在
    const exists = await Course.findById(id).lean();
    if (!exists) {
      return NextResponse.json({ error: "课程不存在" }, { status: 404 });
    }

    // 使用 MongoDB 原生 driver 直接更新（绕过 Mongoose 的限制）
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Database not connected" }, { status: 500 });
    }

    const coursesCollection = db.collection("courses");
    const updateResult = await coursesCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          isPublished: false,
          updatedAt: new Date()
        }
      }
    );

    console.log("取消发布更新结果:", updateResult);

    // 重新查询获取更新后的文档
    const updatedCourse = await Course.findById(id).lean();

    console.log("取消发布成功:", {
      id: updatedCourse?._id,
      title: updatedCourse?.title,
      isPublished: updatedCourse?.isPublished,
    });

    return NextResponse.json({
      code: 10001,
      msg: "取消发布成功",
      data: updatedCourse,
    });
  } catch (error: unknown) {
    console.error("Error unpublishing course:", error);
    const message =
      error instanceof Error ? error.message : "Failed to unpublish course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
