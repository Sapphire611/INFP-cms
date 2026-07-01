/**
 * AI SDK client configured for DeepSeek API
 * Uses OpenAI-compatible provider with DeepSeek's base URL
 *
 * Lazy-loaded to avoid crashing on module import when DEEPSEEK_API_KEY is not set.
 * Throws a clear error at call time if the key is missing.
 */

import { createOpenAI } from "@ai-sdk/openai";

let _deepseek: ReturnType<typeof createOpenAI> | null = null;

function getDeepSeekClient() {
  if (!_deepseek) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error(
        "DEEPSEEK_API_KEY is not set. Please add it to your environment variables (Vercel dashboard or .env)."
      );
    }
    _deepseek = createOpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    });
  }
  return _deepseek;
}

// Proxy that lazily initializes and delegates all property access
export const deepseek = new Proxy({} as ReturnType<typeof createOpenAI>, {
  get(_target, prop) {
    const client = getDeepSeekClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export const CHAT_MODEL = "deepseek-v4-flash" as const;
