import { NextResponse, type NextRequest } from "next/server";
import { verify } from "jsonwebtoken";
import { ROUTE_PERMISSIONS } from "@/types/permission";
import type { JWTPayload } from "@/lib/jwt";

function decodeToken(token: string): JWTPayload | null {
  try {
    return verify(token, process.env.JWT_SECRET ?? "") as JWTPayload;
  } catch {
    return null;
  }
}

export function authMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authToken = req.cookies.get("auth-token")?.value;
  const userInfo = req.cookies.get("user-info");

  const isLoggedIn = !!(authToken && userInfo);

  // Redirect unauthenticated users away from protected routes
  if (!isLoggedIn && pathname.startsWith("/cms")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect authenticated users away from auth pages
  if (isLoggedIn && (pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth"))) {
    return NextResponse.redirect(new URL("/cms/dashboard", req.url));
  }

  // Check route-level permissions for authenticated users
  if (isLoggedIn && authToken) {
    const payload = decodeToken(authToken);

    if (!payload) {
      // Invalid/expired token — clear and redirect
      const res = NextResponse.redirect(new URL("/login", req.url));
      res.cookies.delete("auth-token");
      res.cookies.delete("user-info");
      return res;
    }

    // admin bypasses all permission checks
    if (payload.userType !== "admin") {
      const requiredPermission = ROUTE_PERMISSIONS[pathname];
      if (requiredPermission && !payload.permissions?.includes(requiredPermission)) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }
  }

  return NextResponse.next();
}
