/**
 * GET  /api/ai-providers — 平台列表（密钥打码后返回）
 * POST /api/ai-providers — 新增平台
 *
 * 仅管理员可用：这里存的是 API 密钥。
 */

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/jwt";
import { listProviders, createProvider } from "@/services/aiProviderService";
import { isProviderKind, maskProvider, normalizeModels } from "@/types/ai-provider";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.userType !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const providers = await listProviders();
    return NextResponse.json({ providers: providers.map(maskProvider) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.userType !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, provider, baseUrl, apiKey, apiSecret, defaultModel } = body ?? {};

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!isProviderKind(provider)) {
      return NextResponse.json({ error: "provider must be 'deepseek' or 'glm'" }, { status: 400 });
    }
    if (!baseUrl || !apiKey || !defaultModel) {
      return NextResponse.json({ error: "baseUrl, apiKey and defaultModel are required" }, { status: 400 });
    }

    const created = await createProvider({
      name: name.trim(),
      provider,
      baseUrl: String(baseUrl).trim(),
      apiKey: String(apiKey).trim(),
      apiSecret: apiSecret ? String(apiSecret).trim() : null,
      models: normalizeModels(body.models),
      defaultModel: String(defaultModel).trim(),
    });

    return NextResponse.json({ provider: maskProvider(created) }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error in POST /api/ai-providers:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
