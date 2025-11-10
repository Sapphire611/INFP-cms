import { NextRequest, NextResponse } from "next/server";

import { sign } from "jsonwebtoken";

import Parent from "@/models/parent";

interface WechatLoginRequest {
  code: string; // 微信登录临时code
  nickname?: string;
  avatarUrl?: string;
}

/**
 * 家长微信小程序登录API
 *
 * POST /api/auth/wechat-login
 *
 * 流程：
 * 1. 接收微信小程序的 code
 * 2. 使用 code 调用微信接口获取 openid
 * 3. 根据 openid 查找或创建家长账户
 * 4. 返回 JWT token
 *
 * 注意：
 * - 家长不能登录CMS，只能通过微信小程序访问
 * - 需要配置微信小程序的 APPID 和 APPSECRET
 */
export async function POST(request: NextRequest) {
  try {
    const body: WechatLoginRequest = await request.json();
    const { code, nickname, avatarUrl } = body;

    if (!code) {
      return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
    }

    // TODO: 调用微信接口获取 openid
    // 这里需要配置微信小程序的 APPID 和 APPSECRET
    // const wxResponse = await fetch(
    //   `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${APPSECRET}&js_code=${code}&grant_type=authorization_code`
    // );
    // const wxData = await wxResponse.json();
    // const { openid, session_key, unionid } = wxData;

    // 临时处理：使用 code 作为 openid（实际应该调用微信接口）
    const openid = `wx_${code}`;

    if (!openid) {
      return NextResponse.json({ error: "Failed to get openid from WeChat" }, { status: 500 });
    }

    // 查找现有家长或创建新家长
    let parent = await Parent.findOne({ openid });

    if (!parent) {
      // 首次登录，创建家长账户
      parent = new Parent({
        profile: {
          name: nickname || "微信用户",
        },
        openid,
        wechatInfo: {
          nickname,
          avatarUrl,
        },
        children: [],
        isActive: true,
      });
      await parent.save();
    } else {
      // 更新微信信息和最后登录时间
      if (nickname || avatarUrl) {
        parent.wechatInfo = {
          nickname: nickname || parent.wechatInfo?.nickname,
          avatarUrl: avatarUrl || parent.wechatInfo?.avatarUrl,
        };
      }
      parent.lastLoginAt = new Date();
      await parent.save();
    }

    // 检查账户是否激活
    if (!parent.isActive) {
      return NextResponse.json(
        { error: "Account is disabled. Please contact administrator." },
        { status: 403 }
      );
    }

    // 创建 JWT token
    const token = sign(
      {
        id: parent._id,
        type: "parent",
        openid: parent.openid,
      },
      process.env.JWT_SECRET ?? "",
      {
        expiresIn: "7d", // 家长token有效期7天
      }
    );

    // 返回 token 和家长信息
    return NextResponse.json({
      ok: true,
      success: true,
      token,
      parent: {
        id: parent._id,
        name: parent.profile?.name,
        phone: parent.profile?.phone,
        avatar: parent.profile?.avatar || parent.wechatInfo?.avatarUrl,
        children: parent.children,
        isActive: parent.isActive,
      },
    });
  } catch (error: unknown) {
    console.error("WeChat login error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
