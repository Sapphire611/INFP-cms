import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/users/stats - 获取用户统计数据
export async function GET(request: NextRequest) {
  try {
    // 获取当前日期
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 初始化统计数据
    const stats = { total: 0, monthly: 0, weekly: 0, daily: 0 };

    // 计算总用户数 using Supabase
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });
    stats.total = totalUsers || 0;

    // 计算本月新增用户
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count: monthlyUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());
    stats.monthly = monthlyUsers || 0;

    // 计算本周新增用户（以星期一为一周的开始）
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // 调整到星期一
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const { count: weeklyUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfWeek.toISOString());
    stats.weekly = weeklyUsers || 0;

    // 计算今日新增用户
    const startOfDay = new Date(currentYear, currentMonth, now.getDate());
    startOfDay.setHours(0, 0, 0, 0);
    const { count: dailyUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());
    stats.daily = dailyUsers || 0;

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json({ error: "Failed to fetch user stats" }, { status: 500 });
  }
}
