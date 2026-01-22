import { NextRequest, NextResponse } from "next/server";

import { verify } from "jsonwebtoken";

import { connectDB } from "@/lib/mongoose";
import WechatUser from "@/models/wechatUser";

interface WechatBindRequest {
  wechatUserId: string; // 微信用户ID
  code: string; // 微信登录临时code
  nickname?: string;
  avatarUrl?: string;
}

/**
 * 微信用户绑定API
 *
 * POST /api/auth/wechat-bind
 *
 * 用于将现有微信用户账户与微信openid绑定
 *
 * 使用场景：
 * 1. 管理员先在CMS中创建微信用户账户
 * 2. 微信用户首次使用微信小程序时，通过手机号或其他方式验证身份
 * 3. 验证通过后，调用此API绑定微信openid
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body: WechatBindRequest = await request.json();
    const { wechatUserId, code, nickname, avatarUrl } = body;

    if (!wechatUserId || !code) {
      return NextResponse.json({ error: "Missing wechatUserId or code parameter" }, { status: 400 });
    }

    // 查找微信用户
    const wechatUser = await WechatUser.findById(wechatUserId);
    if (!wechatUser) {
      return NextResponse.json({ error: "Wechat user not found" }, { status: 404 });
    }

    // 检查是否已绑定微信
    if (wechatUser.openid) {
      return NextResponse.json({ error: "Wechat user already bound to WeChat" }, { status: 409 });
    }

    // TODO: 调用微信接口获取 openid
    // const wxResponse = await fetch(
    //   `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${APPSECRET}&js_code=${code}&grant_type=authorization_code`
    // );
    // const wxData = await wxResponse.json();
    // const { openid, unionid } = wxData;

    // 临时处理：使用 code 作为 openid
    const openid = `wx_${code}`;

    if (!openid) {
      return NextResponse.json({ error: "Failed to get openid from WeChat" }, { status: 500 });
    }

    // 检查 openid 是否已被其他微信用户使用
    const existingWechatUser = await WechatUser.findOne({ openid });
    if (existingWechatUser) {
      return NextResponse.json(
        { error: "This WeChat account is already bound to another wechat user" },
        { status: 409 },
      );
    }

    // 绑定微信
    wechatUser.openid = openid;
    if (nickname || avatarUrl) {
      wechatUser.wechatInfo = {
        nickname,
        avatarUrl,
      };
    }
    wechatUser.lastLoginAt = new Date();
    await wechatUser.save();

    return NextResponse.json({
      ok: true,
      success: true,
      message: "WeChat bound successfully",
      wechatUser: {
        id: wechatUser._id,
        name: wechatUser.profile?.name,
        phone: wechatUser.profile?.phone,
        openid: wechatUser.openid,
        wechatInfo: wechatUser.wechatInfo,
      },
    });
  } catch (error: unknown) {
    console.error("WeChat bind error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 解绑微信
 *
 * DELETE /api/auth/wechat-bind
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const url = new URL(request.url);
    const wechatUserId = url.searchParams.get("wechatUserId");

    if (!wechatUserId) {
      return NextResponse.json({ error: "Missing wechatUserId parameter" }, { status: 400 });
    }

    // 查找微信用户
    const wechatUser = await WechatUser.findById(wechatUserId);
    if (!wechatUser) {
      return NextResponse.json({ error: "Wechat user not found" }, { status: 404 });
    }

    // 解绑微信
    wechatUser.openid = undefined;
    wechatUser.wechatInfo = undefined;
    await wechatUser.save();

    return NextResponse.json({
      ok: true,
      success: true,
      message: "WeChat unbound successfully",
    });
  } catch (error: unknown) {
    console.error("WeChat unbind error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
