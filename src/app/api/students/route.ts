import { NextRequest, NextResponse } from "next/server";

import { withDBConnect } from "@/lib/mongoose";
import Child from "@/models/child";
import Class from "@/models/class";
import User from "@/models/user";

// Helper function to update teacher statistics for a class
async function updateClassTeachersStats(classId: string) {
  const classData = await Class.findById(classId).lean();
  if (!classData || !classData.teachers) {
    return;
  }

  // 更新所有班主任的统计信息
  for (const teacherAssignment of classData.teachers) {
    if (teacherAssignment.isPrimary && teacherAssignment.role === "班主任") {
      const teacherId = teacherAssignment.teacher.toString();
      const teacher = await User.findById(teacherId);

      if (teacher && teacher.userType === "teacher" && teacher.teacherInfo) {
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
    }
  }
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
  const classId = url.searchParams.get("classId") ?? "";
  const status = url.searchParams.get("status") ?? "";

  if (search) {
    query.$or = [{ name: { $regex: search, $options: "i" } }, { studentId: { $regex: search, $options: "i" } }];
  }

  if (classId) {
    query.class = classId;
  }

  if (status) {
    query["enrollment.status"] = status;
  }

  return query;
}

// GET /api/students - 获取学生列表
export const GET = withDBConnect(async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Extract and validate parameters
    const { page, limit, skip } = extractPaginationParams(url);
    const query = buildQueryConditions(url);

    // Database operations
    const total = await Child.countDocuments(query);
    const students = await Child.find(query)
      .populate("class", "name grade classCode")
      .populate("parents.user", "profile.name profile.phone") // 引用 Parent 模型
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 手动计算年龄并添加到每个学生对象中
    const studentsWithAge = students.map((student: any) => {
      const birthDate = new Date(student.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return {
        ...student,
        age,
      };
    });

    // Format and return data
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: studentsWithAge,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching students:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

// POST /api/students - 创建新学生
export const POST = withDBConnect(async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, gender, birthDate, studentId, classId, parents, enrollment, healthInfo, notes } = body;

    // 验证必填字段
    if (!name || !gender || !birthDate || !studentId || !classId || !enrollment?.startDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 检查studentId是否唯一
    const existingStudent = await Child.findOne({ studentId });
    if (existingStudent) {
      return NextResponse.json({ error: "Student ID already exists" }, { status: 409 });
    }

    // 检查班级是否存在
    const classData = await Class.findById(classId);
    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // 检查班级是否已满
    if (classData.students.length >= classData.capacity) {
      return NextResponse.json({ error: "Class is full" }, { status: 400 });
    }

    // 创建新学生
    const newStudent = new Child({
      name,
      gender,
      birthDate: new Date(birthDate),
      studentId,
      class: classId,
      parents: parents || [],
      enrollment: {
        startDate: new Date(enrollment.startDate),
        status: enrollment.status || "在读",
      },
      learningProgress: {
        totalLessons: 0,
        completedLessons: 0,
        totalStars: 0,
        currentLevel: "Beginner",
      },
      healthInfo: healthInfo || {},
      notes: notes || "",
    });

    await newStudent.save();

    // 将学生添加到班级的students数组
    await Class.findByIdAndUpdate(classId, {
      $push: { students: newStudent._id },
    });

    // 更新班级班主任的统计信息
    await updateClassTeachersStats(classId);

    // 返回创建的学生
    const populatedStudent = await Child.findById(newStudent._id)
      .populate("class", "name grade classCode")
      .populate("parents.user", "profile.name profile.phone") // 引用 Parent 模型
      .lean();

    // 手动计算年龄
    if (populatedStudent) {
      const birthDate = new Date(populatedStudent.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return NextResponse.json({
        ...populatedStudent,
        age,
      }, { status: 201 });
    }

    return NextResponse.json(populatedStudent, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating student:", error);
    const message = error instanceof Error ? error.message : "Failed to create student";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
