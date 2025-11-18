import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Course from "@/models/course";

/**
 * POST /api/admin/migrate-courses - 迁移课程数据，添加 isPublished 字段
 */
export async function POST(request: NextRequest) {
  try {
    console.log("开始迁移课程数据...");
    await connectDB();

    // 为所有没有 isPublished 字段的课程添加该字段，默认值为 false
    const result = await Course.updateMany(
      { isPublished: { $exists: false } },
      { $set: { isPublished: false } }
    );

    console.log(`成功更新 ${result.modifiedCount} 个课程`);

    // 显示所有课程的发布状态
    const allCourses = await Course.find({})
      .select("title isPublished")
      .lean();

    const summary = allCourses.map((course) => ({
      title: course.title,
      isPublished: course.isPublished ?? false,
    }));

    return NextResponse.json({
      code: 10001,
      msg: "迁移成功",
      data: {
        modifiedCount: result.modifiedCount,
        totalCourses: allCourses.length,
        courses: summary,
      },
    });
  } catch (error: unknown) {
    console.error("迁移失败:", error);
    const message = error instanceof Error ? error.message : "迁移失败";
    return NextResponse.json(
      {
        code: 50001,
        msg: message,
        error: message,
      },
      { status: 500 }
    );
  }
}
