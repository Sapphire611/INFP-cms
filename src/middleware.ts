import { NextRequest, NextResponse } from "next/server";

import { authMiddleware } from "./middleware/auth-middleware";

/**
 * Next.js 中间件
 *
 * 注意：
 * - Middleware 运行在 Edge Runtime，不支持 Node.js 的完整 API（如 mongoose）
 * - 数据库连接在服务启动时自动建立（见 src/lib/mongoose.ts）
 * - API 路由会自动使用已建立的持久连接
 */
export async function middleware(req: NextRequest) {
  // 数据库连接由 src/lib/mongoose.ts 在服务启动时自动建立并保持
  // Edge Runtime 环境限制，无法在 middleware 中检查连接状态
  // 如果连接失败，API 路由会返回相应错误

  // 进行身份验证
  const authResponse = authMiddleware(req);
  if (authResponse) {
    return authResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/login", "/register", "/api/:path*"],
};
