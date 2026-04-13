"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  allPermissions: Permission[];
  onSaved: () => void;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: "数据概览",
  users: "用户管理",
  wechat_users: "微信用户",
  chat: "AI对话",
  threejs: "Three.js Demo",
};

const ACTION_LABELS: Record<string, string> = {
  view: "使用",
  create: "新增",
  update: "修改",
  delete: "删除",
};

const ACTION_ORDER = ["view", "create", "update", "delete"];

// Modules that only support "use" (view), no CRUD
const VIEW_ONLY_MODULES = new Set(["chat", "threejs"]);

export function RoleDialog({ open, onOpenChange, role, allPermissions, onSaved }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "");
      setDescription(role?.description ?? "");
      setSelectedIds(new Set(role?.permissions?.map((p) => p.id) ?? []));
    }
  }, [open, role]);

  // Group all permissions by module, sorted by action order
  const grouped = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  for (const mod of Object.keys(grouped)) {
    // Filter out non-view actions for view-only modules
    if (VIEW_ONLY_MODULES.has(mod)) {
      grouped[mod] = grouped[mod].filter((p) => p.action === "view");
    }
    grouped[mod].sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action));
  }

  const togglePermission = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleModule = (module: string) => {
    const modulePerms = grouped[module] ?? [];
    const allSelected = modulePerms.every((p) => selectedIds.has(p.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        modulePerms.forEach((p) => next.delete(p.id));
      } else {
        modulePerms.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body = { name: name.trim(), description: description.trim(), permissionIds: Array.from(selectedIds) };
      if (role) {
        await fetch(`/api/roles/${role.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{role ? "编辑角色" : "新增角色"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name">角色名称</Label>
            <Input
              id="role-name"
              placeholder="e.g. editor"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-desc">描述（可选）</Label>
            <Textarea
              id="role-desc"
              placeholder="描述该角色的用途..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label>功能权限</Label>
            {Object.entries(grouped).map(([module, perms]) => {
              const allSelected = perms.every((p) => selectedIds.has(p.id));
              const someSelected = perms.some((p) => selectedIds.has(p.id));
              return (
                <div key={module} className="rounded-md border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Checkbox
                      id={`module-${module}`}
                      checked={allSelected}
                      data-state={someSelected && !allSelected ? "indeterminate" : undefined}
                      onCheckedChange={() => toggleModule(module)}
                    />
                    <label
                      htmlFor={`module-${module}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {MODULE_LABELS[module] ?? module}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-6 sm:grid-cols-4">
                    {perms.map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5">
                        <Checkbox
                          id={`perm-${p.id}`}
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => togglePermission(p.id)}
                        />
                        <label
                          htmlFor={`perm-${p.id}`}
                          className="text-muted-foreground cursor-pointer text-xs"
                        >
                          {ACTION_LABELS[p.action] ?? p.action}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
