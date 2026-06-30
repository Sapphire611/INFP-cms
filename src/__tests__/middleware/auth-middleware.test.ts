/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "@/middleware/auth-middleware";

// Mock jsonwebtoken so we can control token verification
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

import { verify } from "jsonwebtoken";

const mockVerify = verify as jest.MockedFunction<typeof verify>;

function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
  const cookieMap = new Map(Object.entries(cookies));

  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    cookies: {
      get: (name: string) => {
        const value = cookieMap.get(name);
        return value ? { value } : undefined;
      },
    },
  } as unknown as NextRequest;
}

describe("authMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("unauthenticated users", () => {
    it("redirects from /cms paths to /login", () => {
      const req = createMockRequest("/cms/dashboard");
      const res = authMiddleware(req);

      expect(res).toBeInstanceOf(NextResponse);
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("http://localhost:3000/login");
    });

    it("allows access to /login", () => {
      const req = createMockRequest("/login");
      const res = authMiddleware(req);

      expect(res).toBeInstanceOf(NextResponse);
      // next() doesn't redirect, so it should be the "next" response
      expect(res.headers.get("Location")).toBeNull();
    });

    it("redirects from /chat to /login", () => {
      const req = createMockRequest("/chat");
      const res = authMiddleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("http://localhost:3000/login");
    });

    it("redirects from /chat/subpath to /login", () => {
      const req = createMockRequest("/chat/settings");
      const res = authMiddleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("http://localhost:3000/login");
    });
  });

  describe("authenticated users", () => {
    const authCookies = {
      "auth-token": "valid-token",
      "user-info": JSON.stringify({ name: "Test" }),
    };

    it("redirects from /login to /chat", () => {
      const req = createMockRequest("/login", authCookies);
      const res = authMiddleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("http://localhost:3000/chat");
    });

    it("redirects from /register to /chat", () => {
      mockVerify.mockReturnValue({
        id: "user-1",
        userType: "admin",
        permissions: [],
      });

      const req = createMockRequest("/register", authCookies);
      const res = authMiddleware(req);

      expect(res.headers.get("Location")).toBe("http://localhost:3000/chat");
    });

    it("allows access to /cms/dashboard", () => {
      mockVerify.mockReturnValue({
        id: "user-1",
        userType: "admin",
        permissions: [],
      });

      const req = createMockRequest("/cms/dashboard", authCookies);
      const res = authMiddleware(req);

      expect(res.headers.get("Location")).toBeNull();
    });

    it("clears invalid cookies and redirects to /login", () => {
      mockVerify.mockImplementation(() => {
        throw new Error("Token expired");
      });

      const req = createMockRequest("/cms/dashboard", authCookies);
      const res = authMiddleware(req);

      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe("http://localhost:3000/login");
      // Cookies should be deleted
      expect(res.cookies.get("auth-token")?.value).toBe("");
      expect(res.cookies.get("user-info")?.value).toBe("");
    });
  });

  describe("permission-based access", () => {
    it("admin bypasses all permission checks", () => {
      mockVerify.mockReturnValue({
        id: "admin-1",
        userType: "admin",
        permissions: [],
      });

      const req = createMockRequest("/cms/users", {
        "auth-token": "valid-token",
        "user-info": JSON.stringify({}),
      });

      const res = authMiddleware(req);
      expect(res.headers.get("Location")).toBeNull();
    });

    it("allows regular user to access /chat", () => {
      mockVerify.mockReturnValue({
        id: "user-3",
        userType: "user",
        permissions: [],
      });

      const req = createMockRequest("/chat", {
        "auth-token": "valid-token",
        "user-info": JSON.stringify({}),
      });

      const res = authMiddleware(req);
      expect(res.headers.get("Location")).toBeNull();
    });
  });
});
