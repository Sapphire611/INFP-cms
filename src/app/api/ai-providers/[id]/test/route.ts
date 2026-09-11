/**
 * POST /api/ai-providers/[id]/test — 用该平台的凭证发一条最小请求，验证 Key 是否可用
 *
 * 始终返回 200 + { ok, message }，让前端直接把原因显示出来（而不是当成接口报错）。
 * 排障优先：message 里带上实际请求的 URL、状态码、content-type 和响应体片段。
 */

import { NextRequest, NextResponse } from "next/server";

import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { requireAuth } from "@/lib/jwt";
import { findProviderById } from "@/services/aiProviderService";
import { buildAuthToken, maskSecret } from "@/types/ai-provider";

/** 各平台正确的 Base URL，404 时提示用 */
const EXPECTED_BASE_URL: Record<string, string> = {
  deepseek: "https://api.deepseek.com/v1",
  glm: "https://open.bigmodel.cn/api/paas/v4",
};

function errorText(raw: string): string {
  const text = raw.trim();
  if (!text) return "(空响应体)";
  try {
    const parsed = JSON.parse(text);
    return parsed?.error?.message ?? parsed?.message ?? text.slice(0, 300);
  } catch {
    return text.slice(0, 300);
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.userType !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const provider = await findProviderById(id);
    if (!provider) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const url = `${provider.baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const token = buildAuthToken(provider.apiKey, provider.apiSecret);

    console.log(
      `[ai-providers/test] provider=${provider.id} kind=${provider.provider} model=${provider.defaultModel} key=${maskSecret(token)} → POST ${url}`
    );

    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            model: provider.defaultModel,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 4,
            stream: false,
          }),
        },
        15_000
      );

      const raw = await res.text();
      const contentType = res.headers.get("content-type") ?? "未知";
      const requestId =
        res.headers.get("x-request-id") ?? res.headers.get("x-ds-trace-id");

      console.log(
        `[ai-providers/test] ← ${res.status} ${res.statusText} (${contentType})${requestId ? ` req=${requestId}` : ""} body=${raw.slice(0, 500)}`
      );

      if (res.ok) {
        return NextResponse.json({
          ok: true,
          message: `连接正常，模型 ${provider.defaultModel} 可用\nPOST ${url} → ${res.status}`,
        });
      }

      // 404 基本都是 Base URL 写错了，直接把正确值摆出来
      const expected = EXPECTED_BASE_URL[provider.provider];
      const hint =
        res.status === 404 && expected && expected !== provider.baseUrl.replace(/\/+$/, "")
          ? `\n提示：${provider.provider} 的 Base URL 应为 ${expected}，当前是 ${provider.baseUrl}`
          : res.status === 401
            ? `\n提示：401 = 凭证无效或已失效，去平台控制台确认 Key，或重新生成后填到这里`
            : "";

      return NextResponse.json({
        ok: false,
        message: [
          `POST ${url}`,
          `→ ${res.status} ${res.statusText} (content-type: ${contentType})${requestId ? ` [${requestId}]` : ""}`,
          `响应体: ${errorText(raw)}`,
        ].join("\n") + hint,
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      const detail = isTimeout
        ? "请求超时（15s）—— Base URL 是否可从本机访问？"
        : err instanceof Error
          ? `${err.message} (${(err as NodeJS.ErrnoException).code ?? "no code"})`
          : "请求失败";

      console.error(`[ai-providers/test] ✗ POST ${url} →`, err);

      return NextResponse.json({
        ok: false,
        message: `POST ${url}\n→ 连接失败: ${detail}`,
      });
    }
  } catch (error: unknown) {
    console.error("Error in POST /api/ai-providers/[id]/test:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
