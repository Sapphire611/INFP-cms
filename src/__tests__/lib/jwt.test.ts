import { verifyAuth, getUserId, requireAuth } from "@/lib/jwt";
import { verify } from "jsonwebtoken";
import { cookies } from "next/headers";

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock-token"),
  verify: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
const mockVerify = verify as jest.MockedFunction<typeof verify>;

describe("verifyAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when no auth cookie exists", async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    } as any);

    const result = await verifyAuth();
    expect(result).toBeNull();
  });

  it("returns decoded payload when valid token exists", async () => {
    const payload = {
      id: "user-1",
      email: "test@test.com",
      userType: "admin",
      permissions: [],
      iat: 1234567890,
      exp: 1234567890,
    };

    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "valid-token" }),
    } as any);

    mockVerify.mockReturnValue(payload as any);

    const result = await verifyAuth();
    expect(result).toEqual(payload);
  });

  it("returns null when token verification fails", async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "invalid-token" }),
    } as any);

    mockVerify.mockImplementation(() => {
      throw new Error("Token expired");
    });

    const result = await verifyAuth();
    expect(result).toBeNull();
  });

  it("returns null when JWT_SECRET is not set", async () => {
    delete (process.env as any).JWT_SECRET;

    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "some-token" }),
    } as any);

    const result = await verifyAuth();
    expect(result).toBeNull();

    process.env.JWT_SECRET = "test-jwt-secret-for-testing";
  });
});

describe("getUserId", () => {
  it("returns user ID from valid token", async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "valid-token" }),
    } as any);

    mockVerify.mockReturnValue({
      id: "user-1",
      email: "test@test.com",
      userType: "admin",
      permissions: [],
    } as any);

    const userId = await getUserId();
    expect(userId).toBe("user-1");
  });

  it("returns null when not authenticated", async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    } as any);

    const userId = await getUserId();
    expect(userId).toBeNull();
  });
});

describe("requireAuth", () => {
  it("returns payload when authenticated", async () => {
    const payload = {
      id: "user-1",
      email: "test@test.com",
      userType: "admin",
      permissions: [],
    };

    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: "valid-token" }),
    } as any);

    mockVerify.mockReturnValue(payload as any);

    const result = await requireAuth();
    expect(result).toEqual(payload);
  });

  it("throws Unauthorized when not authenticated", async () => {
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
    } as any);

    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });
});
