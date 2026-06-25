/**
 * @jest-environment node
 */

import { POST } from "../../../app/api/auth/wechat-user-login/route";
import { findByEmail, updateLastLogin } from "../../../services/wechatUserService";
import bcrypt from "bcryptjs";
import { sign } from "jsonwebtoken";

// Mock modules
jest.mock("../../../services/wechatUserService");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("../../../lib/supabase-admin", () => ({
  supabaseAdmin: {},
}));

describe("POST /api/auth/wechat-user-login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  it("should login successfully with valid credentials", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      password: "hashed_password",
      isActive: true,
      profileName: "Test User",
      profilePhone: null,
      profileAvatar: null,
      openid: null,
      unionid: null,
      wechatNickname: null,
      wechatAvatarUrl: null,
      mbti: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (sign as jest.Mock).mockReturnValue("mock-jwt-token");
    (updateLastLogin as jest.Mock).mockResolvedValue(mockUser);

    const request = new Request("http://localhost/api/auth/wechat-user-login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.code).toBe(10000);
    expect(data.msg).toBe("登录成功");
    expect(data.data.token).toBe("mock-jwt-token");
    expect(data.data.user.email).toBe("test@example.com");
    expect(findByEmail).toHaveBeenCalledWith("test@example.com");
    expect(bcrypt.compare).toHaveBeenCalledWith("password123", "hashed_password");
    expect(updateLastLogin).toHaveBeenCalledWith("user-123");
  });

  it("should return 400 when email is missing", async () => {
    const request = new Request("http://localhost/api/auth/wechat-user-login", {
      method: "POST",
      body: JSON.stringify({
        password: "password123",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe(400);
    expect(data.msg).toBe("邮箱和密码不能为空");
  });

  it("should return 400 when password is missing", async () => {
    const request = new Request("http://localhost/api/auth/wechat-user-login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe(400);
    expect(data.msg).toBe("邮箱和密码不能为空");
  });

  it("should return 401 when user not found", async () => {
    (findByEmail as jest.Mock).mockResolvedValue(null);

    const request = new Request("http://localhost/api/auth/wechat-user-login", {
      method: "POST",
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe(401);
    expect(data.msg).toBe("邮箱或密码错误");
  });

  it("should return 403 when user is inactive", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      password: "hashed_password",
      isActive: false,
      profileName: "Test User",
      profilePhone: null,
      profileAvatar: null,
      openid: null,
      unionid: null,
      wechatNickname: null,
      wechatAvatarUrl: null,
      mbti: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (findByEmail as jest.Mock).mockResolvedValue(mockUser);

    const request = new Request("http://localhost/api/auth/wechat-user-login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.code).toBe(403);
    expect(data.msg).toBe("账户已被禁用，请联系管理员");
  });

  it("should return 401 when password is not set", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      password: null,
      isActive: true,
      profileName: "Test User",
      profilePhone: null,
      profileAvatar: null,
      openid: null,
      unionid: null,
      wechatNickname: null,
      wechatAvatarUrl: null,
      mbti: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (findByEmail as jest.Mock).mockResolvedValue(mockUser);

    const request = new Request("http://localhost/api/auth/wechat-user-login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe(401);
    expect(data.msg).toBe("该账户未设置密码，请使用微信登录或联系管理员");
  });

  it("should return 401 when password is incorrect", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      password: "hashed_password",
      isActive: true,
      profileName: "Test User",
      profilePhone: null,
      profileAvatar: null,
      openid: null,
      unionid: null,
      wechatNickname: null,
      wechatAvatarUrl: null,
      mbti: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (findByEmail as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const request = new Request("http://localhost/api/auth/wechat-user-login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "wrongpassword",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe(401);
    expect(data.msg).toBe("邮箱或密码错误");
  });

  it("should return 500 on internal error", async () => {
    (findByEmail as jest.Mock).mockRejectedValue(new Error("Database error"));

    const request = new Request("http://localhost/api/auth/wechat-user-login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe(500);
    expect(data.msg).toBe("Database error");
  });
});
