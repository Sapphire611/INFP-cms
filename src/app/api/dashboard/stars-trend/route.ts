import { NextRequest, NextResponse } from "next/server";

interface StarsDataPoint {
  date: string;
  stars: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");

    // 计算日期范围
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // 生成日期数组
    const dateArray: Date[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateArray.push(new Date(d));
    }

    // 返回空数据（原为学生星星趋势，已移除相关功能）
    const chartData: StarsDataPoint[] = dateArray.map((date) => {
      return {
        date: date.toISOString().split("T")[0],
        stars: 0,
      };
    });

    // TODO: 实际实现应该查询CheckIn数据
    /*
    const CheckIn = require("@/models/checkin").default;

    const starsData = await CheckIn.aggregate([
      {
        $match: {
          "timestamps.submittedAt": {
            $gte: startDate,
            $lte: endDate,
          },
          status: "graded",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamps.submittedAt",
            },
          },
          totalStars: { $sum: "$evaluation.stars" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // 填充缺失日期的数据
    const starsMap = new Map(
      starsData.map((item: any) => [item._id, item.totalStars])
    );

    const chartData: StarsDataPoint[] = dateArray.map((date) => {
      const dateStr = date.toISOString().split("T")[0];
      return {
        date: dateStr,
        stars: starsMap.get(dateStr) || 0,
      };
    });
    */

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("Error fetching stars trend:", error);
    return NextResponse.json(
      { error: "Failed to fetch stars trend" },
      { status: 500 }
    );
  }
}
