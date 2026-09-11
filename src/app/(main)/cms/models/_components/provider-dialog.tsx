"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROVIDER_PRESETS, formatModels, type AiProvider, type ProviderKind } from "@/types/ai-provider";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: AiProvider | null;
  onSaved: () => void;
}

const KINDS: ProviderKind[] = ["deepseek", "glm"];

export function ProviderDialog({ open, onOpenChange, provider, onSaved }: Props) {
  const isEdit = !!provider;
  const [kind, setKind] = useState<ProviderKind>("deepseek");
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [models, setModels] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setApiKey("");
    setApiSecret("");

    if (provider) {
      setKind(provider.provider);
      setName(provider.name);
      setBaseUrl(provider.baseUrl);
      setModels(formatModels(provider.models));
      setDefaultModel(provider.defaultModel);
      return;
    }

    const preset = PROVIDER_PRESETS.deepseek;
    setKind("deepseek");
    setName("");
    setBaseUrl(preset.baseUrl);
    setModels(formatModels(preset.models));
    setDefaultModel(preset.models[0] ?? "");
  }, [open, provider]);

  const handleKindChange = (next: ProviderKind) => {
    setKind(next);
    const preset = PROVIDER_PRESETS[next];
    setBaseUrl(preset.baseUrl);
    setModels(formatModels(preset.models));
    setDefaultModel(preset.models[0] ?? "");
  };

  const handleSave = async () => {
    setError("");

    if (!name.trim() || !baseUrl.trim() || !defaultModel.trim()) {
      setError("名称、Base URL、默认模型都不能为空");
      return;
    }
    if (!isEdit && !apiKey.trim()) {
      setError("新增平台必须填写 API Key");
      return;
    }

    const payload: Record<string, unknown> = {
      name: name.trim(),
      provider: kind,
      baseUrl: baseUrl.trim(),
      models,
      defaultModel: defaultModel.trim(),
    };
    // 留空 = 保持库里原有的密钥不变
    if (apiKey.trim()) payload.apiKey = apiKey.trim();
    if (apiSecret.trim()) payload.apiSecret = apiSecret.trim();

    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/ai-providers/${provider.id}` : "/api/ai-providers", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `保存失败（${res.status}）`);
        return;
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const preset = PROVIDER_PRESETS[kind];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑平台" : "新增平台"}</DialogTitle>
          <DialogDescription>
            {preset.hint ?? "配置模型平台的接入凭证，聊天时会使用「当前使用」的平台"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider-kind">平台</Label>
            <Select value={kind} onValueChange={(v) => handleKindChange(v as ProviderKind)}>
              <SelectTrigger id="provider-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {PROVIDER_PRESETS[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider-name">名称</Label>
            <Input
              id="provider-name"
              placeholder="e.g. DeepSeek 主力"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider-base-url">Base URL</Label>
            <Input
              id="provider-base-url"
              className="font-mono text-xs"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider-key">
              API Key {isEdit && <span className="text-muted-foreground">（留空不修改）</span>}
            </Label>
            <Input
              id="provider-key"
              type="password"
              autoComplete="off"
              className="font-mono text-xs"
              placeholder={isEdit ? "•••••• 已保存" : preset.keyPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider-secret">
              Secret <span className="text-muted-foreground">（可选{isEdit ? "，留空不修改" : ""}）</span>
            </Label>
            <Input
              id="provider-secret"
              type="password"
              autoComplete="off"
              className="font-mono text-xs"
              placeholder={preset.secretPlaceholder ?? "没有可留空"}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider-models">可用模型（逗号分隔）</Label>
            <Input
              id="provider-models"
              className="font-mono text-xs"
              value={models}
              onChange={(e) => setModels(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="provider-default-model">默认模型</Label>
            <Input
              id="provider-default-model"
              className="font-mono text-xs"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Agent 指定的模型不在「可用模型」里时，用默认模型兜底</p>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
