import { NextRequest, NextResponse } from "next/server";

import Class from "@/models/class";
import Child from "@/models/child";
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

// GET /api/classes/[id] - 获取单个班级详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const classData = await Class.findById(id)
      .populate("teachers.teacher", "profile.name email userType")
      .populate("students", "name studentId avatar enrollment.status learningProgress")
      .lean();

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    return NextResponse.json(classData);
  } catch (error: unknown) {
    console.error("Error fetching class:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch class";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/classes/[id] - 更新班级信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 查找班级
    const existingClass = await Class.findById(id);
    if (!existingClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // 如果更新classCode，检查是否唯一
    if (body.classCode && body.classCode !== existingClass.classCode) {
      const codeExists = await Class.findOne({ classCode: body.classCode });
      if (codeExists) {
        return NextResponse.json({ error: "Class code already exists" }, { status: 409 });
      }
    }

    // 处理教师变更
    if (body.teachers !== undefined) {
      const oldTeachers = existingClass.teachers || [];
      const newTeachers = body.teachers || [];

      // 找出被移除的教师
      const oldTeacherIds = oldTeachers.map((t: any) => t.teacher.toString());
      const newTeacherIds = newTeachers.map((t: any) => t.teacher.toString());

      const removedTeacherIds = oldTeacherIds.filter((id: string) => !newTeacherIds.includes(id));
      const addedTeacherIds = newTeacherIds.filter((id: string) => !oldTeacherIds.includes(id));

      // 从被移除的教师中删除班级关联
      for (const teacherId of removedTeacherIds) {
        const teacher = await User.findById(teacherId);
        if (teacher && teacher.teacherInfo && teacher.teacherInfo.classes) {
          teacher.teacherInfo.classes = teacher.teacherInfo.classes.filter(
            (c: any) => c.class.toString() !== id.toString()
          );
          await teacher.save();
          // 更新统计信息
          await updateTeacherStats(teacherId);
        }
      }

      // 为新添加的教师添加班级关联
      for (const teacherId of addedTeacherIds) {
        const teacher = await User.findById(teacherId);
        const teacherAssignment = newTeachers.find((t: any) => t.teacher.toString() === teacherId);

        if (teacher && teacher.userType === "teacher" && teacherAssignment) {
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
            class: id,
            role: teacherAssignment.role || "任课老师",
            isPrimary: teacherAssignment.isPrimary || false,
            assignedAt: new Date(),
          });

          await teacher.save();

          // 如果是班主任，更新统计信息
          if (teacherAssignment.isPrimary && teacherAssignment.role === "班主任") {
            await updateTeacherStats(teacherId);
          }
        }
      }

      // 更新仍在班级中但角色可能变化的教师
      for (const teacherId of newTeacherIds) {
        if (!addedTeacherIds.includes(teacherId)) {
          const teacher = await User.findById(teacherId);
          const teacherAssignment = newTeachers.find((t: any) => t.teacher.toString() === teacherId);

          if (teacher && teacher.teacherInfo && teacher.teacherInfo.classes && teacherAssignment) {
            const classIndex = teacher.teacherInfo.classes.findIndex(
              (c: any) => c.class.toString() === id.toString()
            );

            if (classIndex !== -1) {
              teacher.teacherInfo.classes[classIndex].role = teacherAssignment.role || "任课老师";
              teacher.teacherInfo.classes[classIndex].isPrimary = teacherAssignment.isPrimary || false;
              await teacher.save();
              // 更新统计信息（因为角色可能变化）
              await updateTeacherStats(teacherId);
            }
          }
        }
      }
    }

    // 更新班级
    const updatedClass = await Class.findByIdAndUpdate(id, body, { new: true })
      .populate("teachers.teacher", "profile.name email userType")
      .populate("students", "name studentId avatar enrollment.status")
      .lean();

    return NextResponse.json(updatedClass);
  } catch (error: unknown) {
    console.error("Error updating class:", error);
    const message = error instanceof Error ? error.message : "Failed to update class";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/classes/[id] - 删除班级
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查班级是否存在
    const classData = await Class.findById(id);
    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    // 检查是否有学生在班级中
    if (classData.students && classData.students.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete class with students. Please remove all students first." },
        { status: 400 }
      );
    }

    // 从所有教师中删除此班级关联
    if (classData.teachers && classData.teachers.length > 0) {
      for (const teacherAssignment of classData.teachers) {
        const teacherId = teacherAssignment.teacher;
        const teacher = await User.findById(teacherId);

        if (teacher && teacher.teacherInfo && teacher.teacherInfo.classes) {
          teacher.teacherInfo.classes = teacher.teacherInfo.classes.filter(
            (c: any) => c.class.toString() !== id.toString()
          );
          await teacher.save();
          // 更新统计信息
          await updateTeacherStats(teacherId.toString());
        }
      }
    }

    // 删除班级
    await Class.findByIdAndDelete(id);

    return NextResponse.json({ message: "Class deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting class:", error);
    const message = error instanceof Error ? error.message : "Failed to delete class";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
