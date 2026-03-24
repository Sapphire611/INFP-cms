import { NextRequest, NextResponse } from "next/server";
import { getUserStats } from "@/services/userService";
import { getWechatUserStats as getWechatStats } from "@/services/wechatUserService";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/dashboard/stats - 获取Dashboard统计数据
export async function GET(request: NextRequest) {
  try {
    // 获取基本统计数据 using Supabase services
    const [userStats, wechatUserStats] = await Promise.all([
      getUserStats(),
      getWechatStats(),
    ]);

    const totalUsers = userStats.totalUsers;
    const totalWechatUsers = wechatUserStats.totalWechatUsers;
    const activeWechatUsers = wechatUserStats.activeWechatUsers;

    // 计算本周新增用户数（以星期一为一周的开始）
    const weekStart = new Date();
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // 调整到星期一
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    // 获取本周新增用户 using Supabase
    const [weeklyUsersResult, weeklyWechatResult] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
      supabaseAdmin.from('wechat_users').select('*', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString())
    ]);

    const weeklyNewUsers = weeklyUsersResult.count || 0;
    const weeklyNewWechatUsers = weeklyWechatResult.count || 0;

    // 获取最近7天的用户注册趋势 using Supabase
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let usersOverTime: Array<{ date: string; count: number }> = [];
    try {
      // 使用 Supabase 获取最近7天的微信用户
      const { data: recentWechatUsers } = await supabaseAdmin
        .from('wechat_users')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // 按日期分组统计
      const dateCountMap = new Map<string, number>();
      recentWechatUsers?.forEach((user) => {
        const dateStr = new Date(user.created_at).toISOString().split('T')[0];
        dateCountMap.set(dateStr, (dateCountMap.get(dateStr) || 0) + 1);
      });

      // 转换为需要的格式
      usersOverTime = Array.from(dateCountMap.entries()).map(([date, count]) => ({
        date,
        count,
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
        (item) => item.date === dateString
      );
      filledUsersData.push({
        date: dateString,
        count: existingData ? existingData.count : 0,
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
