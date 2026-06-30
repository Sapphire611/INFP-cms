/**
 * AI SDK client configured for DeepSeek API
 * Uses OpenAI-compatible provider with DeepSeek's base URL
 */

import { createOpenAI } from "@ai-sdk/openai";

export const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
});

export const CHAT_MODEL = "deepseek-chat" as const;
