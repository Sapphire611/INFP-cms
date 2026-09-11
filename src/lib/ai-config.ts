/**
 * 环境变量兜底配置 —— 只在 CMS「模型管理」里没有配置任何平台时使用。
 *
 * 刻意不依赖 @ai-sdk/* ：模型解析逻辑（aiProviderService）只读配置，不需要拉进整个 SDK。
 */

import { PROVIDER_PRESETS } from "@/types/ai-provider";

/** 环境变量兜底时使用的模型 */
export const CHAT_MODEL = "deepseek-v4-flash" as const;

export function getEnvApiConfig(model?: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("未配置任何模型平台：请到 CMS「模型管理」添加并启用一个平台，或设置 DEEPSEEK_API_KEY 环境变量。");
  }
  return {
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || PROVIDER_PRESETS.deepseek.baseUrl,
    model: model || CHAT_MODEL,
  };
}
