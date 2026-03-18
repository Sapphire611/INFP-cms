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

    // 计算本周新增用户数（以星期一为一周的开始）
    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // 调整到星期一
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const [weeklyNewUsers, weeklyNewWechatUsers] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: weekStart },
        },
      }),
      prisma.wechatUser.count({
        where: {
          createdAt: { gte: weekStart },
        },
      }),
    ]);

    // 获取最近7天的用户注册趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 获取最近7天的用户注册趋势
    let usersOverTime: Array<{ date: string; count: bigint }> = [];
    try {
      // 使用 Prisma Client API 而不是 Raw SQL，避免列名问题
      const recentWechatUsers = await prisma.wechatUser.findMany({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // 按日期分组统计
      const dateCountMap = new Map<string, number>();
      recentWechatUsers.forEach((user) => {
        const dateStr = user.createdAt.toISOString().split('T')[0];
        dateCountMap.set(dateStr, (dateCountMap.get(dateStr) || 0) + 1);
      });

      // 转换为需要的格式
      usersOverTime = Array.from(dateCountMap.entries()).map(([date, count]) => ({
        date,
        count: BigInt(count),
      }));
    } catch (queryError) {
      console.error("Error fetching users over time:", queryError);
      usersOverTime = [];
    }

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
      weeklyNewUsers,
      weeklyNewWechatUsers,
      usersOverTime: filledUsersData,
    });
  } catch (error: unknown) {
    console.error("Error fetching dashboard stats:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
