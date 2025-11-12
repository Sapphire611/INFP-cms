import { NextRequest, NextResponse } from "next/server";

import { sign } from "jsonwebtoken";

import { connectDB } from "@/lib/mongoose";
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
    // Ensure database connection is established
    await connectDB();

    const body: WechatLoginRequest = await request.json();
    const { code, nickname, avatarUrl } = body;

    if (!code) {
      return NextResponse.json(
        { code: 400, msg: "缺少登录凭证", data: null },
        { status: 400 }
      );
    }

    // 调用微信接口获取 openid
    const WECHAT_APPID = process.env.WECHAT_APPID;
    const WECHAT_SECRET = process.env.WECHAT_SECRET;

    if (!WECHAT_APPID || !WECHAT_SECRET) {
      console.error("Missing WECHAT_APPID or WECHAT_SECRET in environment variables");
      return NextResponse.json(
        { code: 500, msg: "微信配置错误", data: null },
        { status: 500 }
      );
    }

    const wxResponse = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
    );

    const wxData = await wxResponse.json();

    if (wxData.errcode) {
      console.error("WeChat API error:", wxData);
      return NextResponse.json(
        { code: 500, msg: `微信登录失败: ${wxData.errmsg}`, data: null },
        { status: 500 }
      );
    }

    const { openid } = wxData;
    // session_key 和 unionid 可用于后续的会话管理和多平台账号关联
    // const { session_key, unionid } = wxData;

    if (!openid) {
      return NextResponse.json(
        { code: 500, msg: "获取微信用户信息失败", data: null },
        { status: 500 }
      );
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
        { code: 403, msg: "账户已被禁用，请联系管理员", data: null },
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

    // 重新查询家长信息，填充 children 完整数据
    const populatedParent = await Parent.findById(parent._id)
      .populate({
        path: "children",
        select: "name studentId class gender avatar learningProgress",
        populate: {
          path: "class",
          select: "name grade classCode",
        },
      })
      .lean();

    // 返回 token 和家长信息
    return NextResponse.json({
      code: 10000,
      msg: "登录成功",
      data: {
        token,
        parent: {
          id: populatedParent?._id,
          name: populatedParent?.profile?.name,
          phone: populatedParent?.profile?.phone,
          avatar: populatedParent?.profile?.avatar || populatedParent?.wechatInfo?.avatarUrl,
          children: populatedParent?.children || [],
          isActive: populatedParent?.isActive,
        },
      },
    });
  } catch (error: unknown) {
    console.error("WeChat login error:", error);
    const message = error instanceof Error ? error.message : "登录失败，请稍后重试";
    return NextResponse.json(
      { code: 500, msg: message, data: null },
      { status: 500 }
    );
  }
}
