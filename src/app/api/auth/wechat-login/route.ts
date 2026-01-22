import { NextRequest, NextResponse } from "next/server";

import { sign } from "jsonwebtoken";

import { connectDB } from "@/lib/mongoose";
import WechatUser from "@/models/wechatUser";

interface WechatLoginRequest {
  code: string; // 微信登录临时code
  nickname?: string;
  avatarUrl?: string;
}

/**
 * 微信用户小程序登录API
 *
 * POST /api/auth/wechat-login
 *
 * 流程：
 * 1. 接收微信小程序的 code
 * 2. 使用 code 调用微信接口获取 openid
 * 3. 根据 openid 查找或创建微信用户账户
 * 4. 返回 JWT token
 *
 * 注意：
 * - 微信用户不能登录CMS，只能通过微信小程序访问
 * - 需要配置微信小程序的 APPID 和 APPSECRET
 */
export async function POST(request: NextRequest) {
  try {
    // Ensure database connection is established
    await connectDB();

    const body: WechatLoginRequest = await request.json();
    const { code, nickname, avatarUrl } = body;

    if (!code) {
      return NextResponse.json({ code: 400, msg: "缺少登录凭证", data: null }, { status: 400 });
    }

    // 调用微信接口获取 openid
    const WECHAT_APPID = process.env.WECHAT_APPID;
    const WECHAT_SECRET = process.env.WECHAT_SECRET;

    if (!WECHAT_APPID || !WECHAT_SECRET) {
      console.error("Missing WECHAT_APPID or WECHAT_SECRET in environment variables");
      return NextResponse.json({ code: 500, msg: "微信配置错误", data: null }, { status: 500 });
    }

    const wxResponse = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`,
    );

    const wxData = await wxResponse.json();

    if (wxData.errcode) {
      console.error("WeChat API error:", wxData);
      return NextResponse.json({ code: 500, msg: `微信登录失败: ${wxData.errmsg}`, data: null }, { status: 500 });
    }

    const { openid } = wxData;
    // session_key 和 unionid 可用于后续的会话管理和多平台账号关联
    // const { session_key, unionid } = wxData;

    if (!openid) {
      return NextResponse.json({ code: 500, msg: "获取微信用户信息失败", data: null }, { status: 500 });
    }

    // 查找现有微信用户或创建新微信用户
    let wechatUser = await WechatUser.findOne({ openid });

    if (!wechatUser) {
      // 首次登录，创建微信用户账户
      wechatUser = new WechatUser({
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
      await wechatUser.save();
    } else {
      // 更新微信信息和最后登录时间
      if (nickname || avatarUrl) {
        wechatUser.wechatInfo = {
          nickname: nickname || wechatUser.wechatInfo?.nickname,
          avatarUrl: avatarUrl || wechatUser.wechatInfo?.avatarUrl,
        };
      }
      wechatUser.lastLoginAt = new Date();
      await wechatUser.save();
    }

    // 检查账户是否激活
    if (!wechatUser.isActive) {
      return NextResponse.json({ code: 403, msg: "账户已被禁用，请联系管理员", data: null }, { status: 403 });
    }

    // 创建 JWT token
    const token = sign(
      {
        id: wechatUser._id,
        type: "wechatUser",
        openid: wechatUser.openid,
      },
      process.env.JWT_SECRET ?? "",
      {
        expiresIn: "7d", // 微信用户token有效期7天
      },
    );

    // 返回 token 和微信用户信息
    return NextResponse.json({
      code: 10000,
      msg: "登录成功",
      data: {
        token,
        wechatUser: {
          id: wechatUser._id,
          name: wechatUser.profile?.name,
          phone: wechatUser.profile?.phone,
          avatar: wechatUser.profile?.avatar || wechatUser.wechatInfo?.avatarUrl,
          isActive: wechatUser.isActive,
        },
      },
    });
  } catch (error: unknown) {
    console.error("WeChat login error:", error);
    const message = error instanceof Error ? error.message : "登录失败，请稍后重试";
    return NextResponse.json({ code: 500, msg: message, data: null }, { status: 500 });
  }
}
