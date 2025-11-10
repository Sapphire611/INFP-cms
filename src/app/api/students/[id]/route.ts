import { NextRequest, NextResponse } from "next/server";

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

// GET /api/students/[id] - 获取单个学生详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await Child.findById(id)
      .populate("class", "name grade classCode academic")
      .populate("parents.user", "profile.name profile.phone") // 引用 Parent 模型
      .lean();

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 手动计算年龄
    const birthDate = new Date(student.birthDate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return NextResponse.json({
      ...student,
      age,
    });
  } catch (error: unknown) {
    console.error("Error fetching student:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch student";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/students/[id] - 更新学生信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 查找学生
    const existingStudent = await Child.findById(id);
    if (!existingStudent) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 如果更新studentId，检查是否唯一
    if (body.studentId && body.studentId !== existingStudent.studentId) {
      const idExists = await Child.findOne({ studentId: body.studentId });
      if (idExists) {
        return NextResponse.json({ error: "Student ID already exists" }, { status: 409 });
      }
    }

    // 如果更新班级，需要更新班级的students数组
    if (body.classId && body.classId !== existingStudent.class.toString()) {
      // 检查新班级是否存在
      const newClass = await Class.findById(body.classId);
      if (!newClass) {
        return NextResponse.json({ error: "New class not found" }, { status: 404 });
      }

      // 检查新班级是否已满
      if (newClass.students.length >= newClass.capacity) {
        return NextResponse.json({ error: "New class is full" }, { status: 400 });
      }

      const oldClassId = existingStudent.class.toString();

      // 从旧班级移除学生
      await Class.findByIdAndUpdate(oldClassId, {
        $pull: { students: id },
      });

      // 添加到新班级
      await Class.findByIdAndUpdate(body.classId, {
        $addToSet: { students: id },
      });

      // 更新旧班级和新班级的班主任统计信息
      await updateClassTeachersStats(oldClassId);
      await updateClassTeachersStats(body.classId);
    }

    // 构建更新数据，将 classId 转换为 class
    const updateData = { ...body };
    if (body.classId) {
      updateData.class = body.classId;
      delete updateData.classId;
    }

    // 更新学生信息
    const updatedStudent = await Child.findByIdAndUpdate(id, updateData, { new: true })
      .populate("class", "name grade classCode academic")
      .populate("parents.user", "profile.name profile.phone") // 引用 Parent 模型
      .lean();

    // 手动计算年龄
    if (updatedStudent) {
      const birthDate = new Date(updatedStudent.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return NextResponse.json({
        ...updatedStudent,
        age,
      });
    }

    return NextResponse.json(updatedStudent);
  } catch (error: unknown) {
    console.error("Error updating student:", error);
    const message = error instanceof Error ? error.message : "Failed to update student";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/students/[id] - 删除学生
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 查找学生
    const student = await Child.findById(id);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const classId = student.class.toString();

    // 从班级的students数组中移除
    await Class.findByIdAndUpdate(classId, {
      $pull: { students: id },
    });

    // 更新班级班主任的统计信息
    await updateClassTeachersStats(classId);

    // 删除学生
    await Child.findByIdAndDelete(id);

    return NextResponse.json({ message: "Student deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting student:", error);
    const message = error instanceof Error ? error.message : "Failed to delete student";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
