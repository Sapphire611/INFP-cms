import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/dashboard/growth - 获取用户增长趋势数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // 根据period确定天数
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 获取后台用户数据
    const { data: cmsUsers } = await supabaseAdmin
      .from('users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // 获取微信用户数据
    const { data: wechatUsers } = await supabaseAdmin
      .from('wechat_users')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // 按日期分组统计
    const dateMap = new Map<string, { cms: number; wechat: number }>();

    // 初始化所有日期
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap.set(dateStr, { cms: 0, wechat: 0 });
    }

    // 统计后台用户
    cmsUsers?.forEach((user) => {
      const dateStr = new Date(user.created_at).toISOString().split('T')[0];
      const data = dateMap.get(dateStr);
      if (data) data.cms++;
    });

    // 统计微信用户
    wechatUsers?.forEach((user) => {
      const dateStr = new Date(user.created_at).toISOString().split('T')[0];
      const data = dateMap.get(dateStr);
      if (data) data.wechat++;
    });

    const result = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      cms: data.cms,
      wechat: data.wechat,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching growth data:", error);
    return NextResponse.json(
      { error: "Failed to fetch growth data" },
      { status: 500 }
    );
  }
}
