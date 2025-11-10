import { NextRequest, NextResponse } from "next/server";

import { verify } from "jsonwebtoken";

import Parent from "@/models/parent";

interface WechatBindRequest {
  parentId: string; // 家长ID
  code: string; // 微信登录临时code
  nickname?: string;
  avatarUrl?: string;
}

/**
 * 家长微信绑定API
 *
 * POST /api/auth/wechat-bind
 *
 * 用于将现有家长账户与微信openid绑定
 *
 * 使用场景：
 * 1. 管理员先在CMS中创建家长账户
 * 2. 家长首次使用微信小程序时，通过手机号或其他方式验证身份
 * 3. 验证通过后，调用此API绑定微信openid
 */
export async function POST(request: NextRequest) {
  try {
    const body: WechatBindRequest = await request.json();
    const { parentId, code, nickname, avatarUrl } = body;

    if (!parentId || !code) {
      return NextResponse.json(
        { error: "Missing parentId or code parameter" },
        { status: 400 }
      );
    }

    // 查找家长
    const parent = await Parent.findById(parentId);
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    // 检查是否已绑定微信
    if (parent.openid) {
      return NextResponse.json(
        { error: "Parent already bound to WeChat" },
        { status: 409 }
      );
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
      return NextResponse.json(
        { error: "Failed to get openid from WeChat" },
        { status: 500 }
      );
    }

    // 检查 openid 是否已被其他家长使用
    const existingParent = await Parent.findOne({ openid });
    if (existingParent) {
      return NextResponse.json(
        { error: "This WeChat account is already bound to another parent" },
        { status: 409 }
      );
    }

    // 绑定微信
    parent.openid = openid;
    if (nickname || avatarUrl) {
      parent.wechatInfo = {
        nickname,
        avatarUrl,
      };
    }
    parent.lastLoginAt = new Date();
    await parent.save();

    return NextResponse.json({
      ok: true,
      success: true,
      message: "WeChat bound successfully",
      parent: {
        id: parent._id,
        name: parent.profile?.name,
        phone: parent.profile?.phone,
        openid: parent.openid,
        wechatInfo: parent.wechatInfo,
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
    const url = new URL(request.url);
    const parentId = url.searchParams.get("parentId");

    if (!parentId) {
      return NextResponse.json({ error: "Missing parentId parameter" }, { status: 400 });
    }

    // 查找家长
    const parent = await Parent.findById(parentId);
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    // 解绑微信
    parent.openid = undefined;
    parent.wechatInfo = undefined;
    await parent.save();

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
