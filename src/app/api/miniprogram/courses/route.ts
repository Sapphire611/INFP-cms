import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import Course from "@/models/course";

// Helper function to extract and validate pagination parameters
function extractPaginationParams(url: URL) {
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");
  const page = pageParam ? parseInt(pageParam) : 1;
  const limit = limitParam ? parseInt(limitParam) : 20;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Helper function to build query conditions for miniprogram
function buildMiniprogramQueryConditions(url: URL) {
  const query: Record<string, any> = {
    isPublished: true, // 只返回已发布的课程
    isActive: true, // 只返回启用的课程
  };

  const search = url.searchParams.get("search") ?? "";
  const level = url.searchParams.get("level") ?? "";
  const grade = url.searchParams.get("grade") ?? "";
  const unit = url.searchParams.get("unit") ?? "";

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { "metadata.theme": { $regex: search, $options: "i" } },
    ];
  }

  if (level) {
    query.level = level;
  }

  // 年级筛选 - 小程序端必须传入年级参数
  if (grade) {
    // 将班级年级映射到课程年级格式
    const gradeMapping: Record<string, string> = {
      "小班": "小班 Ivy K1",
      "中班": "中班 Ivy K2",
      "大班": "大班 Ivy K3",
      "学前班": "学前班",
    };

    const mappedGrade = gradeMapping[grade] || grade;
    query.targetGrades = mappedGrade;
  }

  if (unit) {
    query["sequence.unit"] = parseInt(unit);
  }

  return query;
}

/**
 * GET /api/miniprogram/courses - 获取小程序端课程列表
 * 只返回已发布的课程，并根据年级筛选
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const url = new URL(request.url);
    const { page, limit, skip } = extractPaginationParams(url);
    const query = buildMiniprogramQueryConditions(url);

    // 验证必须传入年级参数
    const grade = url.searchParams.get("grade");
    if (!grade) {
      return NextResponse.json(
        {
          code: 40001,
          msg: "请提供年级参数",
          error: "Grade parameter is required"
        },
        { status: 400 }
      );
    }

    // 获取总数
    const total = await Course.countDocuments(query);

    // 获取课程列表
    const courses = await Course.find(query)
      .select(
        "title description level targetGrades sequence metadata difficulty estimatedDuration content vocabularyGames checkInRequirements tags"
      )
      .sort({ "sequence.unit": 1, "sequence.lesson": 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      code: 10001,
      msg: "获取课程列表成功",
      data: {
        courses,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching miniprogram courses:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch courses";
    return NextResponse.json({
      code: 50001,
      msg: "获取课程列表失败",
      error: message
    }, { status: 500 });
  }
}
