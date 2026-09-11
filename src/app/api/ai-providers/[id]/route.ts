/**
 * PATCH  /api/ai-providers/[id] — 修改平台配置，或用 { isActive: true } 切换为当前使用
 * DELETE /api/ai-providers/[id] — 删除平台
 *
 * 仅管理员可用：这里存的是 API 密钥。
 */

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/jwt";
import { updateProvider, deleteProvider, setActiveProvider, findProviderById } from "@/services/aiProviderService";
import { isProviderKind, maskProvider, normalizeModels } from "@/types/ai-provider";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth.userType !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body?.isActive === true) {
      const activated = await setActiveProvider(id);
      return NextResponse.json({ provider: maskProvider(activated) });
    }

    if (body.provider !== undefined && !isProviderKind(body.provider)) {
      return NextResponse.json({ error: "provider must be 'deepseek' or 'glm'" }, { status: 400 });
    }

    const updated = await updateProvider(id, {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      provider: isProviderKind(body.provider) ? body.provider : undefined,
      baseUrl: typeof body.baseUrl === "string" ? body.baseUrl.trim() : undefined,
      // 空串 = 保持原密钥不变（前端只拿得到打码值）
      apiKey: typeof body.apiKey === "string" && body.apiKey ? body.apiKey.trim() : undefined,
      apiSecret: body.apiSecret === undefined ? undefined : body.apiSecret ? String(body.apiSecret).trim() : "",
      models: normalizeModels(body.models),
      defaultModel: typeof body.defaultModel === "string" ? body.defaultModel.trim() : undefined,
    });

    return NextResponse.json({ provider: maskProvider(updated) });
  } catch (error: unknown) {
    console.error("Error in PATCH /api/ai-providers/[id]:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    await deleteProvider(id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/ai-providers/[id]:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
