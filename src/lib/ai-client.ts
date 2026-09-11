/**
 * AI SDK client factory.
 *
 * 平台凭证不再只来自环境变量 —— 聊天运行时由
 * aiProviderService.resolveApiConfig() 解析：CMS「模型管理」里启用的平台优先，
 * 一个都没配时回退到 DEEPSEEK_* 环境变量（见 ai-config.ts）。
 *
 * 这个文件只负责「拿凭证造客户端」，不碰数据库。
 */

import { createOpenAI } from "@ai-sdk/openai";

export function createModelClient(apiKey: string, baseURL: string) {
  return createOpenAI({ apiKey, baseURL });
}
