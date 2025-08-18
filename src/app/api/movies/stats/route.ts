import { NextRequest, NextResponse } from "next/server";

import { withDBConnect } from "@/lib/mongoose";
import Movie from "@/models/movies";

// GET /api/movies/stats - 获取电影统计数据
export const GET = withDBConnect(async function GET(request: NextRequest) {
  try {
    // 获取当前日期
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 初始化统计数据
    const stats = { total: 0, monthly: 0, weekly: 0, daily: 0, averageRuntime: 0 };

    // 计算总电影数
    stats.total = await Movie.countDocuments();

    // 计算本月新增电影
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    stats.monthly = await Movie.countDocuments({ createdAt: { $gte: startOfMonth } });

    // 计算本周新增电影
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    stats.weekly = await Movie.countDocuments({ createdAt: { $gte: startOfWeek } });

    // 计算今日新增电影
    const startOfDay = new Date(currentYear, currentMonth, now.getDate());
    stats.daily = await Movie.countDocuments({ createdAt: { $gte: startOfDay } });

    // 计算平均时长
    if (stats.total > 0) {
      const runtimeResult = await Movie.aggregate([
        {
          $group: {
            _id: null,
            avgRuntime: { $avg: "$runtime" },
          },
        },
      ]);

      if (runtimeResult && runtimeResult.length > 0) {
        stats.averageRuntime = Math.round(runtimeResult[0].avgRuntime);
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching movie stats:", error);
    return NextResponse.json({ error: "Failed to fetch movie stats" }, { status: 500 });
  }
});
