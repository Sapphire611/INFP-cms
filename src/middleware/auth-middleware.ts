import { NextResponse, type NextRequest } from "next/server";

export function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authToken = req.cookies.get("auth-token");
  const userInfo = req.cookies.get("user-info");

  // 检查是否已登录
  const isLoggedIn = authToken && userInfo ? true : false;

  // console.log({ authToken, userInfo, isLoggedIn });
  // 如果访问dashboard但未登录，重定向到登录页
  if (!isLoggedIn && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 如果已登录但访问登录页或注册页，重定向到dashboard
  if (isLoggedIn && (pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}
