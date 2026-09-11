"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, KeyRound, Loader2, Pencil, Plus, Trash2, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROVIDER_PRESETS, type AiProvider } from "@/types/ai-provider";

import { ProviderDialog } from "./_components/provider-dialog";

interface TestResult {
  id: string;
  ok: boolean;
  message: string;
}

export default function ModelsPage() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AiProvider | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-providers");
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      if (res.ok) {
        const { providers: data } = await res.json();
        setProviders(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (provider: AiProvider) => {
    setEditing(provider);
    setDialogOpen(true);
  };

  const handleActivate = async (id: string) => {
    await fetch(`/api/ai-providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    setTestResult(null);
    fetchProviders();
  };

  const handleDelete = async (provider: AiProvider) => {
    if (!confirm(`确定删除「${provider.name}」吗？聊天将无法再使用该平台。`)) return;
    await fetch(`/api/ai-providers/${provider.id}`, { method: "DELETE" });
    setTestResult(null);
    fetchProviders();
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/ai-providers/${id}/test`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setTestResult({
        id,
        ok: !!data.ok,
        message: data.message ?? data.error ?? `请求失败（${res.status}）`,
      });
    } catch (err) {
      setTestResult({
        id,
        ok: false,
        message: err instanceof Error ? err.message : "请求失败",
      });
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">模型管理</h1>
        </div>
        <div className="flex h-64 items-center justify-center">
          <span className="text-muted-foreground">正在加载...</span>
        </div>
      </div>
    );
  }

  const hasActive = providers.some((p) => p.isActive);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">模型管理</h1>
          <p className="text-muted-foreground">配置各平台的 API Key，/chat 使用「当前使用」的平台</p>
        </div>
        {!forbidden && (
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            新增平台
          </Button>
        )}
      </div>

      {!hasActive && providers.length > 0 && (
        <div className="text-muted-foreground rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          没有启用中的平台，/chat 暂时回退到环境变量 DEEPSEEK_API_KEY。
        </div>
      )}

      {providers.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed">
          <KeyRound className="text-muted-foreground h-12 w-12" />
          <p className="text-muted-foreground">
            {forbidden ? "当前角色无权限访问该模块" : "暂无平台，点击「新增平台」开始配置"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => {
            const preset = PROVIDER_PRESETS[provider.provider];
            return (
              <Card key={provider.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <KeyRound className="text-primary h-5 w-5" />
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <Badge variant="outline">{preset?.label ?? provider.provider}</Badge>
                      {provider.isActive && <Badge>当前使用</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(provider)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-8 w-8"
                        onClick={() => handleDelete(provider)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="font-mono text-xs">{provider.baseUrl}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className="text-muted-foreground text-xs">API Key</span>
                    <span className="font-mono">{provider.apiKey || "（未设置）"}</span>
                    {provider.apiSecret && (
                      <span className="text-muted-foreground font-mono text-xs">Secret {provider.apiSecret}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground min-w-[72px] text-xs">可用模型</span>
                    {provider.models.length === 0 ? (
                      <span className="text-muted-foreground text-xs">未配置</span>
                    ) : (
                      provider.models.map((model) => (
                        <Badge
                          key={model}
                          variant={model === provider.defaultModel ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {model}
                        </Badge>
                      ))
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(provider.id)}
                      disabled={testingId === provider.id}
                    >
                      {testingId === provider.id ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="mr-2 h-3.5 w-3.5" />
                      )}
                      测试连接
                    </Button>
                    {!provider.isActive && (
                      <Button variant="outline" size="sm" onClick={() => handleActivate(provider.id)}>
                        <Check className="mr-2 h-3.5 w-3.5" />
                        设为当前使用
                      </Button>
                    )}
                    {testResult?.id === provider.id && (
                      <p
                        className={`w-full font-mono text-xs whitespace-pre-wrap break-all ${
                          testResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                        }`}
                      >
                        {testResult.message}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProviderDialog open={dialogOpen} onOpenChange={setDialogOpen} provider={editing} onSaved={fetchProviders} />
    </div>
  );
}
