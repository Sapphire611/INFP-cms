import { NextRequest, NextResponse } from "next/server";

import Class from "@/models/class";
import User from "@/models/user";

// Helper function to update teacher statistics
async function updateTeacherStats(teacherId: string) {
  const teacher = await User.findById(teacherId);
  if (!teacher || teacher.userType !== "teacher" || !teacher.teacherInfo) {
    return;
  }

  // 获取教师作为班主任的所有班级
  const classes = await Class.find({
    "teachers.teacher": teacherId,
    "teachers.isPrimary": true,
    "teachers.role": "班主任",
  }).lean();

  // 统计班级数和学生总数
  const totalClasses = classes.length;
  const totalStudents = classes.reduce((sum, cls: any) => {
    return sum + (cls.students?.length || 0);
  }, 0);

  // 更新教师统计信息
  teacher.teacherInfo.classTeacherInfo = {
    totalClasses,
    totalStudents,
  };

  await teacher.save();
}

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
  const grade = url.searchParams.get("grade") ?? "";
  const isActive = url.searchParams.get("isActive");

  if (search) {
    query.$or = [{ name: { $regex: search, $options: "i" } }, { classCode: { $regex: search, $options: "i" } }];
  }

  if (grade) {
    query.grade = grade;
  }

  if (isActive !== null && isActive !== undefined && isActive !== "") {
    query.isActive = isActive === "true";
  }

  return query;
}

// GET /api/classes - 获取班级列表
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Extract and validate parameters
    const { page, limit, skip } = extractPaginationParams(url);
    const query = buildQueryConditions(url);

    // Database operations
    const total = await Class.countDocuments(query);
    const classes = await Class.find(query)
      .populate("teachers.teacher", "profile.name email userType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Add student count to each class
    const classesWithCount = classes.map((cls: any) => ({
      ...cls,
      studentCount: cls.students ? cls.students.length : 0,
    }));

    // Format and return data
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: classesWithCount,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching classes:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/classes - 创建新班级
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, grade, classCode, teachers, academic, schedule, capacity, description } = body;

    // 验证必填字段
    if (!name || !grade || !classCode || !academic?.year || !academic?.semester) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 检查classCode是否唯一
    const existingClass = await Class.findOne({ classCode });
    if (existingClass) {
      return NextResponse.json({ error: "Class code already exists" }, { status: 409 });
    }

    // 创建新班级
    const newClass = new Class({
      name,
      grade,
      classCode,
      teachers: teachers || [],
      students: [],
      academic,
      schedule: schedule || {},
      capacity: capacity || 30,
      description: description || "",
      isActive: true,
    });

    await newClass.save();

    // 同步更新教师的 teacherInfo
    if (teachers && Array.isArray(teachers)) {
      for (const teacherAssignment of teachers) {
        const teacherId = teacherAssignment.teacher;
        const teacher = await User.findById(teacherId);

        if (teacher && teacher.userType === "teacher") {
          // 检查是否已经存在此班级
          const existingClassIndex = teacher.teacherInfo?.classes?.findIndex(
            (c: any) => c.class.toString() === newClass._id.toString()
          ) ?? -1;

          if (existingClassIndex === -1) {
            // 添加新的班级关联
            if (!teacher.teacherInfo) {
              teacher.teacherInfo = {
                classes: [],
                subjects: [],
                classTeacherInfo: {
                  totalClasses: 0,
                  totalStudents: 0,
                },
              };
            }

            teacher.teacherInfo.classes.push({
              class: newClass._id,
              role: teacherAssignment.role || "任课老师",
              isPrimary: teacherAssignment.isPrimary || false,
              assignedAt: new Date(),
            });

            await teacher.save();

            // 如果是班主任，更新统计信息
            if (teacherAssignment.isPrimary && teacherAssignment.role === "班主任") {
              await updateTeacherStats(teacherId.toString());
            }
          }
        }
      }
    }

    // 返回创建的班级
    const populatedClass = await Class.findById(newClass._id)
      .populate("teachers.teacher", "profile.name email userType")
      .lean();

    return NextResponse.json(populatedClass, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating class:", error);
    const message = error instanceof Error ? error.message : "Failed to create class";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
