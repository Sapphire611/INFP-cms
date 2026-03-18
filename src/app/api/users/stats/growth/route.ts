import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/users/stats/growth - 获取过去90天用户增长数据
export async function GET(request: NextRequest) {
  try {
    // Get past 90 days date range
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    // Set time to start of day to avoid precision issues
    today.setHours(0, 0, 0, 0);
    ninetyDaysAgo.setHours(0, 0, 0, 0);

    // Use Prisma's query builder for better type safety
    const growthData = await prisma.$queryRaw<
      Array<{ date: string; count: bigint }>
    >`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as count
      FROM "users"
      WHERE "createdAt" >= ${ninetyDaysAgo} AND "createdAt" <= ${today}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `;

    // Create array of all dates in the past 90 days
    const dates = [];
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }

    // Map aggregation results to complete date array
    const result = dates.map((date) => {
      const found = growthData.find((item) => {
        // Handle both Date objects and string formats
        let itemDateStr: string;
        const dateValue = item.date as unknown; // Cast to unknown first
        if (dateValue instanceof Date) {
          // Format: Sun Feb 01 2026 08:00:00 GMT+0800 -> 2026-02-01
          const d = new Date(dateValue);
          itemDateStr = d.toISOString().split('T')[0];
        } else {
          itemDateStr = String(item.date).split('T')[0];
        }
        return itemDateStr === date;
      });
      return {
        date,
        user: found ? Number(found.count) : 0,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching user growth data:", error);
    return NextResponse.json(
      { error: "Failed to fetch user growth data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
