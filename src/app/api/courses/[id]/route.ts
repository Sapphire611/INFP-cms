import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Course from "@/models/course";

/**
 * GET /api/courses/[id] - 获取单个课程详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const course = await Course.findById(id)
      .populate("createdBy", "profile.name email")
      .populate("prerequisites", "title level")
      .lean();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error: unknown) {
    console.error("Error fetching course:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/courses/[id] - 更新课程信息
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // 查找课程
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // 更新课程信息
    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "profile.name email")
      .populate("prerequisites", "title level")
      .lean();

    return NextResponse.json(updatedCourse);
  } catch (error: unknown) {
    console.error("Error updating course:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[id] - 删除课程
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // 查找课程
    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // 检查是否有其他课程依赖此课程作为先修课程
    const dependentCourses = await Course.find({ prerequisites: id });
    if (dependentCourses.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete course. ${dependentCourses.length} course(s) depend on it as a prerequisite.`,
        },
        { status: 400 }
      );
    }

    // 删除课程
    await Course.findByIdAndDelete(id);

    return NextResponse.json({ message: "Course deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting course:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
