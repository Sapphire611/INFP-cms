import bcrypt from "bcryptjs";
import { mockQueryBuilder, mockResolve } from "@/__tests__/helpers/supabase-mock";

// eslint-disable-next-line no-var
var mockClient: any;

jest.mock("@supabase/supabase-js", () => {
  mockClient = {
    auth: {
      admin: { createUser: jest.fn() },
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(() => mockQueryBuilder()),
  };
  return { createClient: jest.fn(() => mockClient) };
});

import { hashPassword, comparePassword, validateCredentials } from "@/lib/auth";

function setupFrom(data: any, error: any = null) {
  const builder = mockQueryBuilder();
  if (error instanceof Error) {
    builder.then = (_: any, reject: any) => reject(error);
  } else {
    mockResolve(builder, data, error);
  }
  mockClient.from.mockReturnValue(builder);
}

describe("hashPassword", () => {
  it("returns a bcrypt-prefixed string", async () => {
    const hash = await hashPassword("mypassword");
    expect(typeof hash).toBe("string");
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it("produces different hashes for the same password", async () => {
    const a = await hashPassword("mypassword");
    const b = await hashPassword("mypassword");
    expect(a).not.toBe(b);
  });
});

describe("comparePassword", () => {
  it("returns true for matching password", async () => {
    const hash = await hashPassword("mypassword");
    const result = await comparePassword("mypassword", hash);
    expect(result).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("mypassword");
    const result = await comparePassword("wrongpassword", hash);
    expect(result).toBe(false);
  });
});

describe("validateCredentials", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when user not found", async () => {
    setupFrom(null, { code: "PGRST116" });

    const result = await validateCredentials("nonexistent@test.com", "password");
    expect(result).toBeNull();
  });

  it("returns null for inactive user", async () => {
    setupFrom({
      id: "1",
      email: "test@test.com",
      password: await bcrypt.hash("password", 10),
      user_type: "user",
      is_active: false,
      profile_name: "Test",
      username: "testuser",
    });

    const result = await validateCredentials("test@test.com", "password");
    expect(result).toBeNull();
  });

  it("returns user object for valid credentials", async () => {
    const hashedPassword = await hashPassword("password");
    setupFrom({
      id: "1",
      email: "test@test.com",
      password: hashedPassword,
      user_type: "admin",
      is_active: true,
      profile_name: "Test",
      username: "testuser",
    });

    const result = await validateCredentials("test@test.com", "password");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("1");
    expect(result!.email).toBe("test@test.com");
    expect(result!.userType).toBe("admin");
  });

  it("maps snake_case db columns to camelCase", async () => {
    const hashedPassword = await hashPassword("password");
    setupFrom({
      id: "1",
      email: "test@test.com",
      password: hashedPassword,
      user_type: "user",
      is_active: true,
      profile_name: "Profile Name",
      username: "testuser",
    });

    const result = await validateCredentials("test@test.com", "password");
    expect(result!.userType).toBe("user");
    expect(result!.isActive).toBe(true);
    expect(result!.profileName).toBe("Profile Name");
  });
});
