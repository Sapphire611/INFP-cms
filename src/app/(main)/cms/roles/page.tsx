"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Shield, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleDialog } from "./_components/role-dialog";

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

const MODULE_LABELS: Record<string, string> = {
  dashboard: "数据概览",
  users: "用户管理",
  wechat_users: "微信用户",
  chat: "AI对话",
  threejs: "Three.js Demo",
};

const ACTION_LABELS: Record<string, string> = {
  view: "查看",
  create: "新增",
  update: "修改",
  delete: "删除",
};

const ACTION_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  view: "secondary",
  create: "default",
  update: "outline",
  delete: "destructive",
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/roles"),
        fetch("/api/permissions"),
      ]);
      if (rolesRes.ok) {
        const { roles: rolesData } = await rolesRes.json();
        // Fetch each role with permissions
        const rolesWithPerms = await Promise.all(
          rolesData.map(async (r: Role) => {
            const res = await fetch(`/api/roles/${r.id}`);
            if (res.ok) {
              const { role } = await res.json();
              return role;
            }
            return r;
          })
        );
        setRoles(rolesWithPerms);
      }
      if (permsRes.ok) {
        const { permissions } = await permsRes.json();
        setAllPermissions(permissions);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDelete = async (roleId: string) => {
    if (!confirm("确定要删除该角色吗？删除后已分配该角色的用户将失去对应权限。")) return;
    await fetch(`/api/roles/${roleId}`, { method: "DELETE" });
    fetchRoles();
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingRole(null);
    setDialogOpen(true);
  };

  // Group permissions by module for display
  const groupByModule = (permissions: Permission[]) => {
    return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});
  };

  if (loading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">权限管理</h1>
        </div>
        <div className="flex h-64 items-center justify-center">
          <span className="text-muted-foreground">正在加载...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">权限管理</h1>
          <p className="text-muted-foreground">管理角色与功能权限</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          新增角色
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed">
          <ShieldCheck className="text-muted-foreground h-12 w-12" />
          <p className="text-muted-foreground">暂无角色，点击「新增角色」开始配置</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => {
            const grouped = groupByModule(role.permissions ?? []);
            return (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="text-primary h-5 w-5" />
                      <CardTitle className="text-base">{role.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(role)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-8 w-8"
                        onClick={() => handleDelete(role.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {role.description && (
                    <CardDescription>{role.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {Object.keys(grouped).length === 0 ? (
                    <p className="text-muted-foreground text-sm">无权限</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {Object.entries(grouped).map(([module, perms]) => (
                        <div key={module} className="flex flex-wrap items-center gap-1.5">
                          <span className="text-muted-foreground min-w-[72px] text-xs">
                            {MODULE_LABELS[module] ?? module}
                          </span>
                          {perms.map((p) => (
                            <Badge
                              key={p.id}
                              variant={ACTION_VARIANT[p.action] ?? "secondary"}
                              className="text-xs"
                            >
                              {ACTION_LABELS[p.action] ?? p.action}
                            </Badge>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editingRole}
        allPermissions={allPermissions}
        onSaved={fetchRoles}
      />
    </div>
  );
}
