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
  listProviders,
  findProviderById,
  getActiveProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  setActiveProvider,
  resolveApiConfig,
} from "@/services/aiProviderService";

const row = {
  id: "p1",
  name: "DeepSeek 主力",
  provider: "deepseek",
  base_url: "https://api.deepseek.com/v1",
  api_key: "sk-1234567890abcd9d23",
  api_secret: null,
  models: ["deepseek-v4-flash", "deepseek-v4-pro"],
  default_model: "deepseek-v4-flash",
  is_active: true,
  created_at: "2026-09-11T00:00:00.000Z",
  updated_at: "2026-09-11T00:00:00.000Z",
};

const glmRow = {
  ...row,
  id: "p2",
  name: "智谱 GLM",
  provider: "glm",
  base_url: "https://open.bigmodel.cn/api/paas/v4",
  api_key: "abc",
  api_secret: "def",
  models: ["glm-4.6"],
  default_model: "glm-4.6",
};

function setupFrom(data: any, error: any = null) {
  const builder = mockQueryBuilder();
  if (error instanceof Error) mockReject(builder, error);
  else mockResolve(builder, data, error);
  mockClient.from.mockReturnValue(builder);
}

function setupFromSequence(results: Array<{ data: any; error?: any }>) {
  mockClient.from.mockReset();
  for (const r of results) {
    const builder = mockQueryBuilder();
    if (r.error instanceof Error) mockReject(builder, r.error);
    else mockResolve(builder, r.data, r.error ?? null);
    mockClient.from.mockReturnValueOnce(builder);
  }
}

describe("listProviders", () => {
  it("maps snake_case columns to camelCase", async () => {
    setupFrom([row]);

    const providers = await listProviders();

    expect(providers).toHaveLength(1);
    expect(providers[0]).toMatchObject({
      id: "p1",
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "sk-1234567890abcd9d23",
      defaultModel: "deepseek-v4-flash",
      isActive: true,
    });
  });

  it("defaults models to an empty array", async () => {
    setupFrom([{ ...row, models: null }]);
    const providers = await listProviders();
    expect(providers[0].models).toEqual([]);
  });

  it("throws on error", async () => {
    setupFrom(null, new Error("DB down"));
    await expect(listProviders()).rejects.toThrow("DB down");
  });
});

describe("findProviderById", () => {
  it("returns the provider", async () => {
    setupFrom(row);
    const provider = await findProviderById("p1");
    expect(provider?.name).toBe("DeepSeek 主力");
  });

  it("returns null when the row does not exist (PGRST116)", async () => {
    setupFrom(null, { code: "PGRST116", message: "no rows" });
    expect(await findProviderById("missing")).toBeNull();
  });

  it("throws on other errors", async () => {
    setupFrom(null, new Error("DB down"));
    await expect(findProviderById("p1")).rejects.toThrow("DB down");
  });
});

describe("getActiveProvider", () => {
  it("returns the first active row", async () => {
    setupFrom([row]);
    expect((await getActiveProvider())?.id).toBe("p1");
  });

  it("returns null when nothing is active", async () => {
    setupFrom([]);
    expect(await getActiveProvider()).toBeNull();
  });
});

describe("createProvider", () => {
  const input = {
    name: "DeepSeek 主力",
    provider: "deepseek" as const,
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-1234567890abcd9d23",
    defaultModel: "deepseek-v4-flash",
  };

  it("activates the first provider automatically", async () => {
    setupFromSequence([
      { data: row }, // insert
      { data: [] }, // getActiveProvider → 空
      { data: null }, // 关掉其它
      { data: { ...row, is_active: true } }, // 启用自己
    ]);

    const created = await createProvider(input);

    expect(created.isActive).toBe(true);
    expect(mockClient.from).toHaveBeenCalledTimes(4);
  });

  it("does not steal the active flag when another provider is already active", async () => {
    setupFromSequence([{ data: { ...row, is_active: false } }, { data: [row] }]);

    const created = await createProvider(input);

    expect(created.isActive).toBe(false);
    expect(mockClient.from).toHaveBeenCalledTimes(2);
  });
});

describe("updateProvider", () => {
  it("only patches the provided fields", async () => {
    const builder = mockQueryBuilder();
    mockResolve(builder, { ...row, name: "新名字" });
    mockClient.from.mockReturnValue(builder);

    await updateProvider("p1", { name: "新名字" });

    expect(builder.update).toHaveBeenCalledWith({ name: "新名字" });
  });

  it("keeps the stored key when apiKey is empty", async () => {
    const builder = mockQueryBuilder();
    mockResolve(builder, row);
    mockClient.from.mockReturnValue(builder);

    await updateProvider("p1", { name: "x", apiKey: "" });

    const patch = builder.update.mock.calls[0][0];
    expect(patch).not.toHaveProperty("api_key");
  });

  it("writes the key when a new one is supplied", async () => {
    const builder = mockQueryBuilder();
    mockResolve(builder, row);
    mockClient.from.mockReturnValue(builder);

    await updateProvider("p1", { apiKey: "sk-new" });

    expect(builder.update).toHaveBeenCalledWith({ api_key: "sk-new" });
  });

  it("clears the secret when an empty string is passed explicitly", async () => {
    const builder = mockQueryBuilder();
    mockResolve(builder, row);
    mockClient.from.mockReturnValue(builder);

    await updateProvider("p1", { apiSecret: "" });

    expect(builder.update).toHaveBeenCalledWith({ api_secret: null });
  });

  it("leaves the secret alone when it is omitted", async () => {
    const builder = mockQueryBuilder();
    mockResolve(builder, row);
    mockClient.from.mockReturnValue(builder);

    await updateProvider("p1", { name: "x" });

    expect(builder.update.mock.calls[0][0]).not.toHaveProperty("api_secret");
  });
});

describe("setActiveProvider", () => {
  it("deactivates the others before activating the target", async () => {
    setupFromSequence([
      { data: null }, // update ... neq(id, X) → is_active = false
      { data: { ...row, is_active: true } }, // update id = X → is_active = true
    ]);

    const activated = await setActiveProvider("p1");

    expect(activated.isActive).toBe(true);
  });
});

describe("deleteProvider", () => {
  it("resolves on success", async () => {
    setupFrom(null);
    await expect(deleteProvider("p1")).resolves.not.toThrow();
  });

  it("throws on error", async () => {
    setupFrom(null, new Error("Delete failed"));
    await expect(deleteProvider("p1")).rejects.toThrow("Delete failed");
  });
});

describe("resolveApiConfig", () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;
  const originalBase = process.env.DEEPSEEK_BASE_URL;

  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = "env-key";
    process.env.DEEPSEEK_BASE_URL = "https://env.example/v1";
  });

  afterAll(() => {
    process.env.DEEPSEEK_API_KEY = originalKey;
    process.env.DEEPSEEK_BASE_URL = originalBase;
  });

  it("uses the active provider and its default model", async () => {
    setupFrom([glmRow]);

    const config = await resolveApiConfig();

    expect(config).toMatchObject({
      apiKey: "abc.def", // GLM: key + secret
      baseURL: "https://open.bigmodel.cn/api/paas/v4",
      model: "glm-4.6",
      source: "db",
      providerName: "智谱 GLM",
    });
  });

  it("keeps the requested model when the provider serves it", async () => {
    setupFrom([row]);

    const config = await resolveApiConfig("deepseek-v4-pro");

    expect(config.model).toBe("deepseek-v4-pro");
  });

  it("falls back to the provider default model for unknown models", async () => {
    setupFrom([row]);

    const config = await resolveApiConfig("glm-4.6");

    expect(config.model).toBe("deepseek-v4-flash");
  });

  it("falls back to env vars when no provider is active", async () => {
    setupFrom([]);

    const config = await resolveApiConfig("deepseek-v4-pro");

    expect(config).toMatchObject({
      apiKey: "env-key",
      baseURL: "https://env.example/v1",
      model: "deepseek-v4-pro",
      source: "env",
    });
  });

  it("falls back to env vars when the query fails", async () => {
    setupFrom(null, new Error("DB down"));

    const config = await resolveApiConfig();

    expect(config.source).toBe("env");
    expect(config.apiKey).toBe("env-key");
  });

  it("throws a clear error when nothing is configured at all", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    setupFrom([]);

    await expect(resolveApiConfig()).rejects.toThrow("未配置任何模型平台");
  });
});
