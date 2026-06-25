import { mockQueryBuilder, mockResolve, mockReject } from "@/__tests__/helpers/supabase-mock";

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
  findWechatUsers,
  findWechatUserById,
  createWechatUser,
  updateWechatUser,
  deleteWechatUser,
  findByOpenid,
  findByUnionid,
  findByEmail,
  getWechatUserStats,
  getWechatUserGrowthStats,
} from "@/services/wechatUserService";

const mockDbWechatUser = {
  id: "w1",
  profile_name: "WeChat User",
  profile_phone: "13800000000",
  profile_avatar: null,
  profile_id_number: null,
  openid: "openid123",
  unionid: "unionid456",
  wechat_nickname: "wx_nick",
  wechat_avatar_url: null,
  mbti: "INFP",
  is_active: true,
  last_login_at: "2024-06-01T00:00:00.000Z",
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

describe("findWechatUsers", () => {
  it("returns paginated wechat user list", async () => {
    setupFrom([mockDbWechatUser], null, 1);

    const result = await findWechatUsers({}, { page: 1, pageSize: 10 });
    expect(result.wechatUsers).toHaveLength(1);
    expect(result.wechatUsers[0].profileName).toBe("WeChat User");
    expect(result.wechatUsers[0].openid).toBe("openid123");
    expect(result.pagination.total).toBe(1);
  });

  it("transforms snake_case to camelCase", async () => {
    setupFrom([mockDbWechatUser], null, 1);

    const result = await findWechatUsers();
    const user = result.wechatUsers[0];
    expect(user.profilePhone).toBe("13800000000");
    expect(user.wechatNickname).toBe("wx_nick");
    expect(user.lastLoginAt).toBeInstanceOf(Date);
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  it("returns empty list when no wechat users", async () => {
    setupFrom([], null, 0);
    const result = await findWechatUsers();
    expect(result.wechatUsers).toHaveLength(0);
  });

  it("throws on error", async () => {
    setupFrom(null, new Error("DB error"));
    await expect(findWechatUsers()).rejects.toThrow("DB error");
  });
});

describe("findWechatUserById", () => {
  it("returns user when found", async () => {
    setupFrom(mockDbWechatUser);
    const user = await findWechatUserById("w1");
    expect(user).not.toBeNull();
    expect(user!.mbti).toBe("INFP");
  });

  it("returns null when not found", async () => {
    setupFrom(null, { code: "PGRST116" });
    const user = await findWechatUserById("nonexistent");
    expect(user).toBeNull();
  });

  it("throws on unexpected error", async () => {
    setupFrom(null, new Error("Unexpected"));
    await expect(findWechatUserById("w1")).rejects.toThrow("Unexpected");
  });
});

describe("createWechatUser", () => {
  it("creates wechat user", async () => {
    setupFrom(mockDbWechatUser);
    const user = await createWechatUser({
      profileName: "WeChat User",
      openid: "openid123",
      wechatNickname: "wx_nick",
    });
    expect(user.profileName).toBe("WeChat User");
  });

  it("defaults isActive to true", async () => {
    setupFrom(mockDbWechatUser);
    const user = await createWechatUser({ profileName: "Test" });
    expect(user.isActive).toBe(true);
  });
});

describe("updateWechatUser", () => {
  it("updates only provided fields", async () => {
    setupFrom({ ...mockDbWechatUser, profile_name: "Updated Name" });
    const user = await updateWechatUser("w1", { profileName: "Updated Name" });
    expect(user.profileName).toBe("Updated Name");
  });
});

describe("deleteWechatUser", () => {
  it("deletes and returns user", async () => {
    setupFrom(mockDbWechatUser);
    const user = await deleteWechatUser("w1");
    expect(user.id).toBe("w1");
  });
});

describe("findByOpenid", () => {
  it("returns user when found", async () => {
    setupFrom(mockDbWechatUser);
    const user = await findByOpenid("openid123");
    expect(user).not.toBeNull();
  });

  it("returns null when not found", async () => {
    setupFrom(null, { code: "PGRST116" });
    const user = await findByOpenid("unknown");
    expect(user).toBeNull();
  });
});

describe("findByUnionid", () => {
  it("returns user when found", async () => {
    setupFrom(mockDbWechatUser);
    const user = await findByUnionid("unionid456");
    expect(user).not.toBeNull();
  });

  it("returns null when not found", async () => {
    setupFrom(null, { code: "PGRST116" });
    const user = await findByUnionid("unknown");
    expect(user).toBeNull();
  });
});

describe("findByEmail", () => {
  it("returns user when email found", async () => {
    const userWithEmail = { ...mockDbWechatUser, email: "test@example.com" };
    setupFrom(userWithEmail);
    const user = await findByEmail("test@example.com");
    expect(user).not.toBeNull();
    expect(user!.email).toBe("test@example.com");
  });

  it("returns null when email not found", async () => {
    setupFrom(null, { code: "PGRST116" });
    const user = await findByEmail("unknown@example.com");
    expect(user).toBeNull();
  });

  it("throws on unexpected error", async () => {
    setupFrom(null, new Error("DB error"));
    await expect(findByEmail("test@example.com")).rejects.toThrow("DB error");
  });
});

describe("getWechatUserStats", () => {
  it("returns correct aggregate counts", async () => {
    setupFromSequence([
      { data: null, count: 200 },
      { data: null, count: 40 },
      { data: null, count: 35 },
    ]);

    const stats = await getWechatUserStats();
    expect(stats.totalWechatUsers).toBe(200);
    expect(stats.activeWechatUsers).toBe(40);
    expect(stats.wechatLoginCount).toBe(35);
    expect(stats.inactiveWechatUsers).toBe(160);
  });
});

describe("getWechatUserGrowthStats", () => {
  it("returns growth data", async () => {
    setupFromSequence([
      { data: null, count: 200 },
      { data: null, count: 30 },
    ]);

    const stats = await getWechatUserGrowthStats();
    expect(stats.total).toBe(200);
    expect(stats.growth).toBe(30);
    expect(stats.growthRate).toBe("15.00");
  });
});
