import { NextRequest, NextResponse } from "next/server";

import Child from "@/models/child";
import Class from "@/models/class";
import User from "@/models/user";
import CheckIn from "@/models/checkin";

// GET /api/dashboard/stats - 获取Dashboard统计数据
export async function GET(request: NextRequest) {
  try {
    // 获取基本统计数据
    const [totalClasses, totalStudents, totalTeachers, activeStudents] = await Promise.all([
      Class.countDocuments({ isActive: true }),
      Child.countDocuments(),
      User.countDocuments({ userType: "teacher", isActive: true }),
      Child.countDocuments({ "enrollment.status": "在读" }),
    ]);

    // 获取所有学生的学习进度数据
    const students = await Child.find({}, "learningProgress").lean();

    // 计算平均学习进度
    let totalProgress = 0;
    let validStudentCount = 0;
    students.forEach((student) => {
      if (student.learningProgress.totalLessons > 0) {
        const progress = (student.learningProgress.completedLessons / student.learningProgress.totalLessons) * 100;
        totalProgress += progress;
        validStudentCount++;
      }
    });
    const averageProgress = validStudentCount > 0 ? Math.round(totalProgress / validStudentCount) : 0;

    // 计算总获得星星数
    const totalStarsResult = await Child.aggregate([
      {
        $group: {
          _id: null,
          totalStars: { $sum: "$learningProgress.totalStars" },
        },
      },
    ]);
    const totalStars = totalStarsResult.length > 0 ? totalStarsResult[0].totalStars : 0;

    // 获取按年级分组的学生数
    const studentsByGrade = await Class.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: "$grade",
          count: { $sum: { $size: "$students" } },
        },
      },
      {
        $project: {
          _id: 0,
          grade: "$_id",
          count: 1,
        },
      },
      {
        $sort: { grade: 1 },
      },
    ]);

    // 获取最近7天的星星趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const starsOverTime = await CheckIn.aggregate([
      {
        $match: {
          status: "graded",
          "evaluation.gradedAt": { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$evaluation.gradedAt",
            },
          },
          stars: { $sum: "$evaluation.stars" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          stars: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    // 补充缺失的日期（确保有7天的数据）
    const filledStarsData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateString = date.toISOString().split("T")[0];

      const existingData = starsOverTime.find((item) => item.date === dateString);
      filledStarsData.push({
        date: dateString,
        stars: existingData ? existingData.stars : 0,
      });
    }

    // 计算今日打卡数
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCheckIns = await CheckIn.countDocuments({
      "timestamps.submittedAt": {
        $gte: todayStart,
        $lte: todayEnd,
      },
    });

    // 计算本周新增学生数
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 本周周日
    weekStart.setHours(0, 0, 0, 0);

    const weeklyNewStudents = await Child.countDocuments({
      createdAt: { $gte: weekStart },
    });

    return NextResponse.json({
      totalClasses,
      totalStudents,
      totalTeachers,
      activeStudents,
      avgProgress: averageProgress, // 使用前端期望的字段名
      totalStars,
      todayCheckIns,
      weeklyNewStudents,
      studentsByGrade,
      starsOverTime: filledStarsData,
    });
  } catch (error: unknown) {
    console.error("Error fetching dashboard stats:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
