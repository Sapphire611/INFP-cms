import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// GET /api/users/stats - 获取用户统计数据
export async function GET() {
  try {
    // 获取总用户数
    const totalUsers = await prisma.user.count();

    // 获取今天的新增用户数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await prisma.user.count({
      where: {
        createdAt: {
          gte: today,
        },
      },
    });

    // 获取7天前的新增用户数（用于计算7天内新增）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const newUsersLast7Days = await prisma.user.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // 获取昨天的新增用户数（用于计算趋势）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const newUsersYesterday = await prisma.user.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today,
        },
      },
    });

    // 计算趋势百分比
    const trendPercentage = newUsersYesterday > 0 
      ? parseFloat(((newUsersToday - newUsersYesterday) / newUsersYesterday * 100).toFixed(1))
      : newUsersToday > 0 ? 100 : 0;

    return NextResponse.json({
      totalUsers,
      newUsersToday,
      newUsersLast7Days,
      trendPercentage,
      trendDirection: newUsersToday >= newUsersYesterday ? 'up' : 'down'
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 });
  }
} 