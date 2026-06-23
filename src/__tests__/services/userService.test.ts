import { mockQueryBuilder, mockResolve, mockReject } from "@/__tests__/helpers/supabase-mock";

// mockClient must be a mutable variable set inside jest.mock factory (hoisted)
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

import {
  findUsers,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  findByEmail,
  findByUsername,
  getUserStats,
  getUserGrowthStats,
} from "@/services/userService";

const mockDbUser = {
  id: "1",
  username: "testuser",
  email: "test@test.com",
  user_type: "admin",
  profile_name: "Test User",
  profile_phone: "1234567890",
  profile_avatar: null,
  is_active: true,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
};

function setupFrom(data: any, error: any = null, count: number | null = null) {
  const builder = mockQueryBuilder();
  if (error instanceof Error) mockReject(builder, error);
  else mockResolve(builder, data, error, count);
  mockClient.from.mockReturnValue(builder);
}

function setupFromSequence(results: Array<{ data: any; error?: any; count?: number | null }>) {
  mockClient.from.mockReset();
  for (const r of results) {
    const builder = mockQueryBuilder();
    if (r.error instanceof Error) mockReject(builder, r.error);
    else mockResolve(builder, r.data, r.error ?? null, r.count ?? null);
    mockClient.from.mockReturnValueOnce(builder);
  }
}

describe("findUsers", () => {
  it("returns paginated user list", async () => {
    setupFrom([mockDbUser], null, 1);

    const result = await findUsers({}, { page: 1, pageSize: 10 });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].username).toBe("testuser");
    expect(result.users[0].userType).toBe("admin");
    expect(result.pagination.total).toBe(1);
  });

  it("returns empty list when no users match", async () => {
    setupFrom([], null, 0);

    const result = await findUsers({}, { page: 1, pageSize: 10 });
    expect(result.users).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it("throws when Supabase returns error", async () => {
    setupFrom(null, new Error("DB error"));

    await expect(findUsers({}, { page: 1, pageSize: 10 })).rejects.toThrow("DB error");
  });

  it("calculates pagination correctly", async () => {
    setupFrom([], null, 55);

    const result = await findUsers({}, { page: 2, pageSize: 10 });
    expect(result.pagination.total).toBe(55);
    expect(result.pagination.totalPages).toBe(6);
  });
});

describe("findUserById", () => {
  it("returns transformed user", async () => {
    setupFrom(mockDbUser);

    const user = await findUserById("1");
    expect(user.username).toBe("testuser");
    expect(user.userType).toBe("admin");
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it("throws on error", async () => {
    setupFrom(null, new Error("Not found"));

    await expect(findUserById("999")).rejects.toThrow("Not found");
  });
});

describe("createUser", () => {
  it("creates user and returns transformed data", async () => {
    setupFrom(mockDbUser);

    const user = await createUser({
      username: "testuser",
      email: "test@test.com",
      password: "password123",
      userType: "admin",
    });

    expect(user.username).toBe("testuser");
    expect(user.userType).toBe("admin");
  });
});

describe("updateUser", () => {
  it("updates user and returns transformed data", async () => {
    setupFrom({ ...mockDbUser, username: "updateduser" });

    const user = await updateUser("1", { username: "updateduser" });
    expect(user.username).toBe("updateduser");
  });
});

describe("deleteUser", () => {
  it("deletes and returns user", async () => {
    setupFrom(mockDbUser);

    const user = await deleteUser("1");
    expect(user.id).toBe("1");
  });

  it("throws on error", async () => {
    setupFrom(null, new Error("Delete failed"));

    await expect(deleteUser("999")).rejects.toThrow("Delete failed");
  });
});

describe("findByEmail", () => {
  it("returns user when found", async () => {
    setupFrom(mockDbUser);

    const user = await findByEmail("test@test.com");
    expect(user).not.toBeNull();
    expect(user!.email).toBe("test@test.com");
  });

  it("returns null when not found (PGRST116)", async () => {
    setupFrom(null, { code: "PGRST116" });

    const user = await findByEmail("nonexistent@test.com");
    expect(user).toBeNull();
  });
});

describe("findByUsername", () => {
  it("returns user when found", async () => {
    setupFrom(mockDbUser);

    const user = await findByUsername("testuser");
    expect(user).not.toBeNull();
    expect(user!.username).toBe("testuser");
  });

  it("returns null when not found", async () => {
    setupFrom(null, { code: "PGRST116" });

    const user = await findByUsername("nobody");
    expect(user).toBeNull();
  });
});

describe("getUserStats", () => {
  it("returns correct aggregate counts", async () => {
    setupFromSequence([
      { data: null, count: 100 },
      { data: null, count: 80 },
      { data: null, count: 10 },
      { data: null, count: 90 },
    ]);

    const stats = await getUserStats();
    expect(stats.totalUsers).toBe(100);
    expect(stats.activeUsers).toBe(80);
    expect(stats.adminCount).toBe(10);
    expect(stats.userCount).toBe(90);
    expect(stats.inactiveUsers).toBe(20);
  });
});

describe("getUserGrowthStats", () => {
  it("returns growth data", async () => {
    setupFromSequence([
      { data: null, count: 200 },
      { data: null, count: 50 },
    ]);

    const stats = await getUserGrowthStats();
    expect(stats.total).toBe(200);
    expect(stats.growth).toBe(50);
    expect(stats.growthRate).toBe("25.00");
  });

  it("returns 0 growth rate when total is 0", async () => {
    setupFromSequence([
      { data: null, count: 0 },
      { data: null, count: 0 },
    ]);

    const stats = await getUserGrowthStats();
    expect(stats.growthRate).toBe("0.00");
  });
});
