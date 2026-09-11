/**
 * 模型平台服务 —— CMS「模型管理」的 CRUD + 聊天运行时的模型解析。
 *
 * 单活约束：全局最多一个平台 is_active = true（DB 有 partial unique index 兜底）。
 * 聊天时按 agent 声明的模型去当前平台里找，找不到就用平台的 default_model。
 */

import { getEnvApiConfig } from "@/lib/ai-config";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildAuthToken, type AiProvider, type ProviderKind } from "@/types/ai-provider";

const TABLE = "ai_providers";

const COLUMNS =
  "id, name, provider, base_url, api_key, api_secret, models, default_model, is_active, created_at, updated_at";

export interface ProviderInput {
  name: string;
  provider: ProviderKind;
  baseUrl: string;
  apiKey: string;
  apiSecret?: string | null;
  models?: string[];
  defaultModel: string;
}

/** 解析结果：造一个模型客户端所需的全部信息 */
export interface ResolvedApiConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  source: "db" | "env";
  /** 来自 CMS 配置时的平台备注名，便于日志排查 */
  providerName?: string;
}

function transform(row: any): AiProvider {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    baseUrl: row.base_url,
    apiKey: row.api_key,
    apiSecret: row.api_secret,
    models: row.models ?? [],
    defaultModel: row.default_model,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProviders(): Promise<AiProvider[]> {
  const { data, error } = await supabaseAdmin.from(TABLE).select(COLUMNS).order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map(transform);
}

export async function findProviderById(id: string): Promise<AiProvider | null> {
  const { data, error } = await supabaseAdmin.from(TABLE).select(COLUMNS).eq("id", id).single();

  // PGRST116 = 没有匹配行
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data ? transform(data) : null;
}

export async function getActiveProvider(): Promise<AiProvider | null> {
  const { data, error } = await supabaseAdmin.from(TABLE).select(COLUMNS).eq("is_active", true).limit(1);

  if (error) throw error;

  const row = data?.[0];
  return row ? transform(row) : null;
}

async function touch(id: string, patch: Record<string, unknown>): Promise<AiProvider> {
  const { data, error } = await supabaseAdmin.from(TABLE).update(patch).eq("id", id).select(COLUMNS).single();

  if (error) throw error;
  return transform(data);
}

/** 把某个平台设为「当前使用」，其余全部取消 */
export async function setActiveProvider(id: string): Promise<AiProvider> {
  const { error } = await supabaseAdmin.from(TABLE).update({ is_active: false }).neq("id", id);

  if (error) throw error;

  return touch(id, { is_active: true });
}

export async function createProvider(input: ProviderInput): Promise<AiProvider> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({
      id: crypto.randomUUID(),
      name: input.name,
      provider: input.provider,
      base_url: input.baseUrl,
      api_key: input.apiKey,
      api_secret: input.apiSecret || null,
      models: input.models ?? [],
      default_model: input.defaultModel,
      is_active: false,
    })
    .select(COLUMNS)
    .single();

  if (error) throw error;

  const created = transform(data);

  // 第一个平台自动启用，省得用户再点一次
  const active = await getActiveProvider();
  if (!active) return setActiveProvider(created.id);

  return created;
}

/**
 * 部分更新。
 * apiKey 传空字符串/undefined = 不修改（前端拿不到明文，只能这样表达「保持原样」）；
 * apiSecret 传 "" = 清空，undefined = 不修改。
 */
export async function updateProvider(id: string, input: Partial<ProviderInput>): Promise<AiProvider> {
  const patch: Record<string, unknown> = {};

  if (input.name !== undefined) patch.name = input.name;
  if (input.provider !== undefined) patch.provider = input.provider;
  if (input.baseUrl !== undefined) patch.base_url = input.baseUrl;
  if (input.apiKey) patch.api_key = input.apiKey;
  if (input.apiSecret !== undefined) patch.api_secret = input.apiSecret || null;
  if (input.models !== undefined) patch.models = input.models;
  if (input.defaultModel !== undefined) patch.default_model = input.defaultModel;

  return touch(id, patch);
}

export async function deleteProvider(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq("id", id);

  if (error) throw error;
}

/**
 * 聊天运行时用：解析出当前该用哪个平台的哪把 key 和哪个模型。
 * DB 查询失败不阻塞聊天 —— 记日志后回退到环境变量。
 */
export async function resolveApiConfig(preferredModel?: string): Promise<ResolvedApiConfig> {
  let active: AiProvider | null = null;

  try {
    active = await getActiveProvider();
  } catch (err) {
    console.error("读取模型平台配置失败，回退到环境变量:", err);
  }

  if (active) {
    const model = preferredModel && active.models.includes(preferredModel) ? preferredModel : active.defaultModel;

    return {
      apiKey: buildAuthToken(active.apiKey, active.apiSecret),
      baseURL: active.baseUrl,
      model,
      source: "db",
      providerName: active.name,
    };
  }

  return { ...getEnvApiConfig(preferredModel), source: "env" };
}
