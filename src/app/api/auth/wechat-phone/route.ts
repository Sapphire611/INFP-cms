import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

interface WechatPhoneRequest {
  code: string; // 从 getPhoneNumber 获取的 code
}

interface JWTPayload {
  id: string;
  type: string;
  openid?: string;
}

interface AccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface PhoneNumberResponse {
  errcode?: number;
  errmsg?: string;
  phone_info?: {
    phoneNumber: string;
    purePhoneNumber: string;
    countryCode: string;
    watermark?: {
      timestamp: number;
      appid: string;
    };
  };
}

/**
 * 获取微信 Access Token
 */
async function getAccessToken(): Promise<string> {
  const WECHAT_APPID = process.env.WECHAT_APPID;
  const WECHAT_SECRET = process.env.WECHAT_SECRET;

  if (!WECHAT_APPID || !WECHAT_SECRET) {
    throw new Error("微信配置错误");
  }

  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}`,
  );

  const data: AccessTokenResponse = await response.json();

  if (data.errcode) {
    throw new Error(`获取 Access Token 失败: ${data.errmsg}`);
  }

  if (!data.access_token) {
    throw new Error("获取 Access Token 失败");
  }

  return data.access_token;
}

/**
 * POST /api/auth/wechat-phone - 获取微信绑定的手机号
 *
 * 流程：
 * 1. 接收前端传来的 code（通过 button open-type="getPhoneNumber" 获取）
 * 2. 获取微信 Access Token
 * 3. 使用 Access Token 和 code 调用微信接口获取手机号
 * 4. 返回解密后的手机号
 *
 * 注意：
 * - 需要用户主动点击授权按钮
 * - code 只能使用一次
 * - 需要配置微信小程序的 APPID 和 APPSECRET
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录状态（可选，根据业务需求）
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = verify(token, process.env.JWT_SECRET ?? "") as JWTPayload;
        if (decoded.type !== "wechatUser") {
          return NextResponse.json({ code: 403, msg: "无权访问此接口", data: null }, { status: 403 });
        }
      } catch (error) {
        // Token 无效，继续执行（某些场景下可能不需要登录）
        console.warn("Token verification failed:", error);
      }
    }

    // 获取请求体
    const body: WechatPhoneRequest = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ code: 400, msg: "缺少授权码", data: null }, { status: 400 });
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();

    // 调用微信接口获取手机号
    const response = await fetch(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      },
    );

    const data: PhoneNumberResponse = await response.json();

    if (data.errcode && data.errcode !== 0) {
      console.error("WeChat phone API error:", data);
      return NextResponse.json({ code: 500, msg: `获取手机号失败: ${data.errmsg}`, data: null }, { status: 500 });
    }

    if (!data.phone_info?.phoneNumber) {
      return NextResponse.json({ code: 500, msg: "获取手机号失败", data: null }, { status: 500 });
    }

    // 返回手机号信息
    return NextResponse.json({
      code: 10000,
      msg: "获取成功",
      data: {
        phoneNumber: data.phone_info.phoneNumber,
        purePhoneNumber: data.phone_info.purePhoneNumber,
        countryCode: data.phone_info.countryCode,
      },
    });
  } catch (error: unknown) {
    console.error("WeChat phone error:", error);
    const message = error instanceof Error ? error.message : "获取手机号失败，请稍后重试";
    return NextResponse.json({ code: 500, msg: message, data: null }, { status: 500 });
  }
}
