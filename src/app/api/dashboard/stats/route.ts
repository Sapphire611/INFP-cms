import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/stats - 获取Dashboard统计数据
export async function GET(request: NextRequest) {
  try {
    // 获取基本统计数据
    const [totalUsers, totalWechatUsers, activeWechatUsers] = await Promise.all([
      prisma.user.count(),
      prisma.wechatUser.count(),
      prisma.wechatUser.count({ where: { isActive: true } }),
    ]);

    // 计算本周新增微信用户数
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 本周周日
    weekStart.setHours(0, 0, 0, 0);

    const weeklyNewWechatUsers = await prisma.wechatUser.count({
      where: {
        createdAt: { gte: weekStart },
      },
    });

    // 获取最近7天的用户注册趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const usersOverTime = await prisma.$queryRaw<
      Array<{ date: string; count: bigint }>
    >`
      SELECT
        DATE(createdAt) as date,
        COUNT(*) as count
      FROM wechat_users
      WHERE createdAt >= ${sevenDaysAgo}
      GROUP BY DATE(createdAt)
      ORDER BY DATE(createdAt) ASC
    `;

    // 补充缺失的日期（确保有7天的数据）
    const filledUsersData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateString = date.toISOString().split("T")[0];

      const existingData = usersOverTime.find(
        (item) => (item.date as string).split("T")[0] === dateString
      );
      filledUsersData.push({
        date: dateString,
        count: existingData ? Number(existingData.count) : 0,
      });
    }

    return NextResponse.json({
      totalUsers,
      totalWechatUsers,
      activeWechatUsers,
      weeklyNewWechatUsers,
      usersOverTime: filledUsersData,
    });
  } catch (error: unknown) {
    console.error("Error fetching dashboard stats:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
