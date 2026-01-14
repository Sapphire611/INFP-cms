import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/user";
import WechatUser from "@/models/wechatUser";

// GET /api/dashboard/stats - 获取Dashboard统计数据
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // 获取基本统计数据
    const [totalUsers, totalWechatUsers, activeWechatUsers] = await Promise.all([
      User.countDocuments(),
      WechatUser.countDocuments(),
      WechatUser.countDocuments({ isActive: true }),
    ]);

    // 计算本周新增微信用户数
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 本周周日
    weekStart.setHours(0, 0, 0, 0);

    const weeklyNewWechatUsers = await WechatUser.countDocuments({
      createdAt: { $gte: weekStart },
    });

    // 获取最近7天的用户注册趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const usersOverTime = await WechatUser.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1,
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    // 补充缺失的日期（确保有7天的数据）
    const filledUsersData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateString = date.toISOString().split("T")[0];

      const existingData = usersOverTime.find((item) => item.date === dateString);
      filledUsersData.push({
        date: dateString,
        count: existingData ? existingData.count : 0,
      });
    }

    return NextResponse.json({
      totalUsers,
      totalWechatUsers,
      activeWechatUsers,
      weeklyNewWechatUsers,
      usersOverTime: filledUsersData,
      // 保留前端可能期望的字段，返回默认值
      totalClasses: 0,
      totalStudents: 0,
      totalTeachers: totalUsers,
      activeStudents: 0,
      avgProgress: 0,
      totalStars: 0,
      todayCheckIns: 0,
      weeklyNewStudents: 0,
      studentsByGrade: [],
      starsOverTime: [],
    });
  } catch (error: unknown) {
    console.error("Error fetching dashboard stats:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
