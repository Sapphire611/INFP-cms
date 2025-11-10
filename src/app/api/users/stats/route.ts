import { NextRequest, NextResponse } from "next/server";

import User from "@/models/user";

// GET /api/users/stats - 获取用户统计数据
export async function GET(request: NextRequest) {
  try {
    // 获取当前日期
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 初始化统计数据
    const stats = { total: 0, monthly: 0, weekly: 0, daily: 0 };

    // 计算总用户数
    stats.total = await User.countDocuments();

    // 计算本月新增用户
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    stats.monthly = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

    // 计算本周新增用户
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    stats.weekly = await User.countDocuments({ createdAt: { $gte: startOfWeek } });

    // 计算今日新增用户
    const startOfDay = new Date(currentYear, currentMonth, now.getDate());
    stats.daily = await User.countDocuments({ createdAt: { $gte: startOfDay } });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 });
  }
}
