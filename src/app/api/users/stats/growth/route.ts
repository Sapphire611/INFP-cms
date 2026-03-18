import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

    // Use Supabase to get user data for the past 90 days
    const { data: usersData, error } = await supabaseAdmin
      .from('users')
      .select('created_at')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .lte('created_at', today.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group data by date
    const dateCountMap = new Map<string, number>();
    usersData?.forEach((user) => {
      const dateStr = new Date(user.created_at).toISOString().split('T')[0];
      dateCountMap.set(dateStr, (dateCountMap.get(dateStr) || 0) + 1);
    });

    // Create array of all dates in the past 90 days
    const dates = [];
    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }

    // Map aggregation results to complete date array
    const result = dates.map((date) => {
      const count = dateCountMap.get(date) || 0;
      return {
        date,
        user: count,
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
