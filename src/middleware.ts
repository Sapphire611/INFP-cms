import { NextRequest, NextResponse } from "next/server";

import { authMiddleware } from "./middleware/auth-middleware";

export async function middleware(req: NextRequest) {
  // 然后进行身份验证
  const authResponse = authMiddleware(req);
  if (authResponse) {
    return authResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/login", "/register", "/api/:path*"],
};
