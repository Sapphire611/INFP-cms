import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/dashboard/distribution - 获取用户类型分布数据
export async function GET(request: NextRequest) {
  try {
    // 获取后台用户统计 - 使用 count 而不是 data
    const { count: adminUsersCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'admin');

    const { count: regularUsersCount } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'user');

    // 获取微信用户统计
    const { count: activeWechatUsersCount } = await supabaseAdmin
      .from('wechat_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: inactiveWechatUsersCount } = await supabaseAdmin
      .from('wechat_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);

    return NextResponse.json({
      adminUsers: adminUsersCount || 0,
      regularUsers: regularUsersCount || 0,
      activeWechatUsers: activeWechatUsersCount || 0,
      inactiveWechatUsers: inactiveWechatUsersCount || 0,
    });
  } catch (error) {
    console.error("Error fetching distribution data:", error);
    return NextResponse.json(
      { error: "Failed to fetch distribution data" },
      { status: 500 }
    );
  }
}
