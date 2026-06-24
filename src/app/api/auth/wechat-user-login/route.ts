import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { findByEmail, updateLastLogin } from "@/services/wechatUserService";
import bcrypt from "bcryptjs";

interface EmailLoginRequest {
  email: string;
  password: string;
}

/**
 * 微信用户邮箱登录API
 *
 * POST /api/auth/wechat-user-login
 *
 * 请求体：
 * - email: 用户邮箱
 * - password: 登录密码
 *
 * 返回：
 * - 成功：{ code: 10000, msg: "登录成功", data: { token, user } }
 * - 失败：{ code: 401, msg: "邮箱或密码错误", data: null }
 */
export async function POST(request: NextRequest) {
  try {
    const body: EmailLoginRequest = await request.json();
    const { email, password } = body;

    // 参数验证
    if (!email || !password) {
      return NextResponse.json(
        { code: 400, msg: "邮箱和密码不能为空", data: null },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { code: 401, msg: "邮箱或密码错误", data: null },
        { status: 401 }
      );
    }

    // 检查账户是否激活
    if (!user.isActive) {
      return NextResponse.json(
        { code: 403, msg: "账户已被禁用，请联系管理员", data: null },
        { status: 403 }
      );
    }

    // 验证密码
    if (!user.password) {
      return NextResponse.json(
        { code: 401, msg: "该账户未设置密码，请使用微信登录或联系管理员", data: null },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { code: 401, msg: "邮箱或密码错误", data: null },
        { status: 401 }
      );
    }

    // 更新最后登录时间
    await updateLastLogin(user.id);

    // 创建 JWT token
    const token = sign(
      {
        id: user.id,
        type: "wechatUser",
        email: user.email,
      },
      process.env.JWT_SECRET ?? "",
      { expiresIn: "7d" }
    );

    // 返回结果
    return NextResponse.json({
      code: 10000,
      msg: "登录成功",
      data: {
        token,
        user: {
          id: user.id,
          name: user.profileName,
          email: user.email,
          phone: user.profilePhone,
          avatar: user.profileAvatar || user.wechatAvatarUrl,
          mbti: user.mbti,
        },
      },
    });
  } catch (error: unknown) {
    console.error("Email login error:", error);
    const message = error instanceof Error ? error.message : "登录失败，请稍后重试";
    return NextResponse.json(
      { code: 500, msg: message, data: null },
      { status: 500 }
    );
  }
}
