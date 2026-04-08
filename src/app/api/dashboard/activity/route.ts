import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/dashboard/activity - 获取过去7天的活动数据
export async function GET(request: NextRequest) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 获取过去7天的注册数据
    const { data: cmsUsers } = await supabaseAdmin
      .from('users')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    const { data: wechatUsers } = await supabaseAdmin
      .from('wechat_users')
      .select('created_at, last_login_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    // 按日期分组统计
    const dateMap = new Map<string, { logins: number; registrations: number }>();

    // 初始化7天的数据
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { logins: 0, registrations: 0 });
    }

    // 统计注册
    cmsUsers?.forEach((user) => {
      const dateStr = new Date(user.created_at).toISOString().split('T')[0];
      const data = dateMap.get(dateStr);
      if (data) data.registrations++;
    });

    wechatUsers?.forEach((user) => {
      const dateStr = new Date(user.created_at).toISOString().split('T')[0];
      const data = dateMap.get(dateStr);
      if (data) data.registrations++;

      // 统计登录（如果有last_login_at）
      if (user.last_login_at) {
        const loginDateStr = new Date(user.last_login_at).toISOString().split('T')[0];
        const loginData = dateMap.get(loginDateStr);
        if (loginData) loginData.logins++;
      }
    });

    const result = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      logins: data.logins,
      registrations: data.registrations,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching activity data:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity data" },
      { status: 500 }
    );
  }
}
