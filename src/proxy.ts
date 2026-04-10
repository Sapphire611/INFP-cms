import { NextRequest, NextResponse } from "next/server";

import { authMiddleware } from "./middleware/auth-middleware";

/**
 * Next.js Proxy
 *
 * 注意：
 * - Proxy 运行在 Edge Runtime，不支持 Node.js 的完整 API
 * - 数据库连接通过 Prisma client 自动管理（见 src/lib/prisma.ts）
 * - API 路由会自动使用 Prisma client 进行数据库操作
 */
export async function proxy(req: NextRequest) {
  // 数据库连接由 Prisma client 在服务启动时自动建立并保持
  // Prisma 自动管理连接池和持久连接
  // API 路由直接使用 Prisma client，无需手动连接

  // 进行身份验证
  const authResponse = authMiddleware(req);
  if (authResponse) {
    return authResponse;
  }

  return NextResponse.next();
}

export const config = {
  match: ["/cms/:path*", "/auth/:path*", "/login", "/register", "/api/:path*"],
};
