import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/dashboard/recent-activity - 获取最近的用户活动
export async function GET(request: NextRequest) {
  try {
    // 获取最近10个注册的后台用户
    const { data: recentCmsUsers } = await supabaseAdmin
      .from('users')
      .select('id, username, profile_name, profile_avatar, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 获取最近10个注册的微信用户
    const { data: recentWechatUsers } = await supabaseAdmin
      .from('wechat_users')
      .select('id, profile_name, wechat_nickname, profile_avatar, wechat_avatar_url, created_at, last_login_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // 合并并格式化数据
    const activities = [
      ...(recentCmsUsers?.map(user => ({
        id: user.id,
        name: user.profile_name || user.username,
        avatar: user.profile_avatar,
        type: 'cms' as const,
        action: 'register' as const,
        timestamp: user.created_at,
      })) || []),
      ...(recentWechatUsers?.map(user => ({
        id: user.id,
        name: user.profile_name || user.wechat_nickname || '微信用户',
        avatar: user.profile_avatar || user.wechat_avatar_url,
        type: 'wechat' as const,
        action: 'register' as const,
        timestamp: user.created_at,
      })) || []),
    ];

    // 按时间排序并取前10条
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(activities.slice(0, 10));
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent activity" },
      { status: 500 }
    );
  }
}
