import { NextRequest, NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import { connectDB } from "@/lib/mongoose";
import WechatUser from "@/models/wechatUser";

interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  avatar?: string;
}

interface JWTPayload {
  id: string;
  type: string;
  openid?: string;
}

/**
 * PATCH /api/wechat-user/profile - 微信用户更新自己的个人资料
 */
export async function PATCH(request: NextRequest) {
  try {
    // 确保数据库连接
    await connectDB();

    // 从 Authorization header 获取 token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ code: 401, msg: "未授权访问", data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // 验证 token
    let decoded: JWTPayload;
    try {
      decoded = verify(token, process.env.JWT_SECRET ?? "") as JWTPayload;
    } catch (error) {
      return NextResponse.json({ code: 401, msg: "登录已过期，请重新登录", data: null }, { status: 401 });
    }

    // 检查用户类型
    if (decoded.type !== "wechatUser") {
      return NextResponse.json({ code: 403, msg: "无权访问此接口", data: null }, { status: 403 });
    }

    // 获取请求体
    const body: UpdateProfileRequest = await request.json();

    // 验证请求数据
    if (!body.name && !body.phone && !body.avatar) {
      return NextResponse.json({ code: 400, msg: "请提供要更新的信息", data: null }, { status: 400 });
    }

    // 验证姓名
    if (body.name !== undefined && body.name.trim().length === 0) {
      return NextResponse.json({ code: 400, msg: "姓名不能为空", data: null }, { status: 400 });
    }

    // 验证手机号（必填）
    if (body.phone !== undefined) {
      if (!body.phone || body.phone.trim().length === 0) {
        return NextResponse.json({ code: 400, msg: "手机号不能为空", data: null }, { status: 400 });
      }

      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(body.phone)) {
        return NextResponse.json({ code: 400, msg: "手机号格式不正确", data: null }, { status: 400 });
      }
    }

    // 查找微信用户
    const wechatUser = await WechatUser.findById(decoded.id);
    if (!wechatUser) {
      return NextResponse.json({ code: 404, msg: "用户不存在", data: null }, { status: 404 });
    }

    // 更新信息
    if (body.name) {
      wechatUser.profile.name = body.name.trim();
    }
    if (body.phone !== undefined) {
      wechatUser.profile.phone = body.phone;
    }
    if (body.avatar !== undefined) {
      wechatUser.profile.avatar = body.avatar;
    }

    // 保存更新
    await wechatUser.save();

    // 返回更新后的用户信息
    return NextResponse.json({
      code: 10000,
      msg: "更新成功",
      data: {
        wechatUser: {
          id: wechatUser._id,
          name: wechatUser.profile.name,
          phone: wechatUser.profile.phone,
          avatar: wechatUser.profile.avatar || wechatUser.wechatInfo?.avatarUrl,
          isActive: wechatUser.isActive,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Update profile error:", error);
    const message = error instanceof Error ? error.message : "更新失败，请稍后重试";
    return NextResponse.json({ code: 500, msg: message, data: null }, { status: 500 });
  }
}

/**
 * GET /api/wechat-user/profile - 获取当前登录微信用户的个人资料
 */
export async function GET(request: NextRequest) {
  try {
    // 确保数据库连接
    await connectDB();

    // 从 Authorization header 获取 token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ code: 401, msg: "未授权访问", data: null }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // 验证 token
    let decoded: JWTPayload;
    try {
      decoded = verify(token, process.env.JWT_SECRET ?? "") as JWTPayload;
    } catch (error) {
      return NextResponse.json({ code: 401, msg: "登录已过期，请重新登录", data: null }, { status: 401 });
    }

    // 检查用户类型
    if (decoded.type !== "wechatUser") {
      return NextResponse.json({ code: 403, msg: "无权访问此接口", data: null }, { status: 403 });
    }

    // 查找微信用户
    const wechatUser = await WechatUser.findById(decoded.id).lean();

    if (!wechatUser) {
      return NextResponse.json({ code: 404, msg: "用户不存在", data: null }, { status: 404 });
    }

    // 返回用户信息
    return NextResponse.json({
      code: 10000,
      msg: "获取成功",
      data: {
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
    console.error("Get profile error:", error);
    const message = error instanceof Error ? error.message : "获取失败，请稍后重试";
    return NextResponse.json({ code: 500, msg: message, data: null }, { status: 500 });
  }
}
