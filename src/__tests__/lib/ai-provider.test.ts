import {
  buildAuthToken,
  formatModels,
  isProviderKind,
  maskProvider,
  maskSecret,
  normalizeModels,
  parseModels,
  PROVIDER_PRESETS,
  type AiProvider,
} from "@/types/ai-provider";

const provider: AiProvider = {
  id: "p1",
  name: "DeepSeek 主力",
  provider: "deepseek",
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "sk-1234567890abcd9d23",
  apiSecret: null,
  models: ["deepseek-v4-flash"],
  defaultModel: "deepseek-v4-flash",
  isActive: true,
  createdAt: "2026-09-11T00:00:00.000Z",
  updatedAt: "2026-09-11T00:00:00.000Z",
};

describe("maskSecret", () => {
  it("keeps the last 4 characters", () => {
    expect(maskSecret("sk-1234567890abcd9d23")).toBe("****9d23");
  });

  it("hides short secrets completely", () => {
    expect(maskSecret("abc")).toBe("****");
    expect(maskSecret("abcd")).toBe("****");
  });

  it("returns empty string for missing values", () => {
    expect(maskSecret(null)).toBe("");
    expect(maskSecret(undefined)).toBe("");
    expect(maskSecret("")).toBe("");
  });
});

describe("maskProvider", () => {
  it("masks apiKey and apiSecret", () => {
    const masked = maskProvider({ ...provider, apiSecret: "secret-wxyz" });
    expect(masked.apiKey).toBe("****9d23");
    expect(masked.apiSecret).toBe("****wxyz");
  });

  it("keeps a null secret null", () => {
    expect(maskProvider(provider).apiSecret).toBeNull();
  });

  it("does not mutate the input", () => {
    maskProvider(provider);
    expect(provider.apiKey).toBe("sk-1234567890abcd9d23");
  });
});

describe("buildAuthToken", () => {
  it("returns the raw key when there is no secret", () => {
    expect(buildAuthToken("abc.def")).toBe("abc.def");
    expect(buildAuthToken("abc", null)).toBe("abc");
    expect(buildAuthToken("abc", "")).toBe("abc");
  });

  it("joins key and secret with a dot", () => {
    expect(buildAuthToken("abc", "def")).toBe("abc.def");
  });
});

describe("parseModels", () => {
  it("splits on ascii and full-width commas and whitespace", () => {
    expect(parseModels("glm-4.6, glm-4.5，glm-4-flash")).toEqual(["glm-4.6", "glm-4.5", "glm-4-flash"]);
  });

  it("deduplicates and trims", () => {
    expect(parseModels([" a ", "a", "b"])).toEqual(["a", "b"]);
  });

  it("returns empty array for blank input", () => {
    expect(parseModels("   ")).toEqual([]);
    expect(parseModels("")).toEqual([]);
  });
});

describe("normalizeModels", () => {
  it("accepts strings and arrays", () => {
    expect(normalizeModels("a, b")).toEqual(["a", "b"]);
    expect(normalizeModels(["a", "b"])).toEqual(["a", "b"]);
  });

  it("returns undefined for unsupported input (= 不修改)", () => {
    expect(normalizeModels(undefined)).toBeUndefined();
    expect(normalizeModels(42)).toBeUndefined();
  });
});

describe("formatModels", () => {
  it("joins with a comma", () => {
    expect(formatModels(["a", "b"])).toBe("a, b");
  });
});

describe("isProviderKind", () => {
  it("accepts the two supported platforms", () => {
    expect(isProviderKind("deepseek")).toBe(true);
    expect(isProviderKind("glm")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isProviderKind("openai")).toBe(false);
    expect(isProviderKind(null)).toBe(false);
    expect(isProviderKind(undefined)).toBe(false);
  });
});

describe("PROVIDER_PRESETS", () => {
  it("ships a default model that is part of the model list", () => {
    for (const preset of Object.values(PROVIDER_PRESETS)) {
      expect(preset.models.length).toBeGreaterThan(0);
      expect(preset.models).toContain(preset.models[0]);
      expect(preset.baseUrl).toMatch(/^https:\/\//);
    }
  });
});
