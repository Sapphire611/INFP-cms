import { NextRequest, NextResponse } from "next/server";

import { withDBConnect } from "@/lib/mongoose";
import User from "@/models/user";

// GET /api/users/stats/growth - 获取过去30天用户增长数据
export const GET = withDBConnect(async function GET(request: NextRequest) {
  try {
    // 获取过去30天的日期范围
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 90);

    // 设置时间为当天开始，避免时间精度问题
    today.setHours(0, 0, 0, 0);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // 聚合查询，按天分组统计用户增长
    const growthData = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: thirtyDaysAgo,
            $lte: today,
          },
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
        $sort: {
          _id: 1,
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1,
        },
      },
    ]);

    // 创建一个包含过去90天所有日期的数组
    const dates = [];
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }

    // 将聚合结果映射到完整的日期数组中
    const result = dates.map((date) => {
      const found = growthData.find((item) => item.date === date);
      return {
        date,
        user: found ? found.count : 0,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching user growth data:", error);
    return NextResponse.json({ error: "Failed to fetch user growth data" }, { status: 500 });
  }
});
