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

// Helper function to build query conditions
function buildQueryConditions(url: URL) {
  const query: Record<string, any> = {};
  const search = url.searchParams.get("search") ?? "";
  const level = url.searchParams.get("level") ?? "";
  const grade = url.searchParams.get("grade") ?? "";
  const unit = url.searchParams.get("unit") ?? "";
  const isActive = url.searchParams.get("isActive");

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

  if (grade) {
    query.targetGrades = grade;
  }

  if (unit) {
    query["sequence.unit"] = parseInt(unit);
  }

  if (isActive !== null && isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  return query;
}

/**
 * GET /api/courses - 获取课程列表
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const url = new URL(request.url);
    const { page, limit, skip } = extractPaginationParams(url);
    const query = buildQueryConditions(url);

    // 获取总数
    const total = await Course.countDocuments(query);

    // 获取课程列表
    const courses = await Course.find(query)
      .populate("createdBy", "profile.name email")
      .sort({ "sequence.unit": 1, "sequence.lesson": 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      code: 10001,
      msg: "获取课程列表成功",
      data: {
        data: courses,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching courses:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch courses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/courses - 创建新课程
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // 验证必填字段
    if (!body.title || !body.description || !body.level) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, level" },
        { status: 400 }
      );
    }

    // 创建新课程
    const newCourse = new Course({
      title: body.title,
      description: body.description,
      level: body.level,
      targetGrades: body.targetGrades || [],
      content: body.content || {
        vocabulary: { words: [], exercises: [] },
        phonics: { letters: [], sounds: [], rules: "", audio: "", exercises: [] },
        sentences: { patterns: [], examples: [], dialogues: [], audio: "" },
        songs: { title: "", lyrics: "", audio: "", video: "", actions: [] },
        videos: [],
        presentations: [],
        audios: [],
        objectives: [],
      },
      vocabularyGames: body.vocabularyGames || [],
      metadata: body.metadata || {
        semester: 1,
        week: 1,
        theme: "",
        unit: "",
        code: "",
        festival: "",
        difficulty: 1,
        duration: 30,
        tags: [],
      },
      checkInRequirements: body.checkInRequirements || {
        description: "完成课程打卡",
        type: "video_recitation",
        minDuration: 10,
        criteria: [],
      },
      sequence: body.sequence || { unit: 1, lesson: 1, order: 1 },
      difficulty: body.difficulty || 1,
      estimatedDuration: body.estimatedDuration || 30,
      tags: body.tags || [],
      prerequisites: body.prerequisites || [],
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdBy: body.createdBy,
    });

    await newCourse.save();

    return NextResponse.json(newCourse, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating course:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create course";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
