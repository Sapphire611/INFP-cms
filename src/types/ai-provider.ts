/**
 * 模型平台配置类型 —— CMS「模型管理」与聊天运行时共用。
 *
 * 注意：aiKey / apiSecret 在服务端是明文，返回给前端前必须用 maskProvider() 打码。
 */

export type ProviderKind = "deepseek" | "glm";

export interface AiProvider {
  id: string;
  /** 备注名，例如「DeepSeek 主力」 */
  name: string;
  provider: ProviderKind;
  baseUrl: string;
  apiKey: string;
  /** GLM 平台的 Secret，DeepSeek 没有则为 null */
  apiSecret: string | null;
  /** 该平台可用的模型列表 */
  models: string[];
  /** 聊天时优先使用的模型 */
  defaultModel: string;
  /** 是否为当前聊天使用的平台（全局只能有一个） */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderPreset {
  label: string;
  baseUrl: string;
  models: string[];
  keyPlaceholder: string;
  secretPlaceholder?: string;
  hint?: string;
}

export const PROVIDER_PRESETS: Record<ProviderKind, ProviderPreset> = {
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-v4-flash", "deepseek-v4-pro"],
    keyPlaceholder: "sk-xxxxxxxx",
    hint: "在 platform.deepseek.com 创建 API Key",
  },
  glm: {
    label: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4.6", "glm-4.5", "glm-4-flash"],
    keyPlaceholder: "API Key",
    secretPlaceholder: "Secret（Key 已含 .Secret 时可留空）",
    hint: "在 open.bigmodel.cn 创建 API Key，格式为 {id}.{secret}",
  },
};

/** 只保留末 4 位，和 DeepSeek 报错里的 ****9d23 一致 */
export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  return value.length <= 4 ? "****" : `****${value.slice(-4)}`;
}

/** 打码后的平台配置，用于接口返回 / 前端展示 */
export function maskProvider(p: AiProvider): AiProvider {
  return {
    ...p,
    apiKey: maskSecret(p.apiKey),
    apiSecret: p.apiSecret ? maskSecret(p.apiSecret) : null,
  };
}

/**
 * GLM 的凭证是 `{apiKey}.{secret}`；只填了 apiKey 时说明用户直接把整串贴进来了。
 */
export function buildAuthToken(apiKey: string, apiSecret?: string | null): string {
  return apiSecret ? `${apiKey}.${apiSecret}` : apiKey;
}

/** 「glm-4.6, glm-4.5」→ ["glm-4.6", "glm-4.5"]，中英文逗号/空格都能切 */
export function parseModels(input: string | string[]): string[] {
  const parts = Array.isArray(input) ? input : input.split(/[,，\s]+/);
  return Array.from(new Set(parts.map((s) => String(s).trim()).filter(Boolean)));
}

/** 接口入参可能是数组也可能是逗号串，统一成数组；非法输入返回 undefined（= 不修改） */
export function normalizeModels(value: unknown): string[] | undefined {
  if (typeof value === "string") return parseModels(value);
  if (Array.isArray(value)) return parseModels(value);
  return undefined;
}

export function formatModels(models: string[]): string {
  return models.join(", ");
}

export function isProviderKind(value: unknown): value is ProviderKind {
  return value === "deepseek" || value === "glm";
}
