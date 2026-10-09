"use client";

import * as React from "react";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import { isAssignableRole } from "@/types/permission";

import { UserWithCallback } from "./types";

const userFormSchema = z.object({
  username: z.string().min(2, "用户名至少 2 位"),
  name: z.string().min(1, "姓名为必填项"),
  email: z.string().email("邮箱格式不正确"),
  phone: z.string().optional(),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "如需修改密码，至少 6 位",
    }),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
  /** 带用户管理写权限 —— 只有超管能授 */
  isSensitive?: boolean;
}

interface EditUserDialogProps {
  user: UserWithCallback;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
}

export function EditUserDialog({ user, open, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  // 超级管理员（user_type='admin'）不进角色体系，界面上也不给他分配角色
  const isSuperAdminUser = user.userType === "admin";

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  // 用户当前挂着、但界面上不允许分配的角色（超级管理员）—— 只读展示，避免保存时被静默抹掉
  const [lockedRole, setLockedRole] = useState<RoleOption | null>(null);
  const [rolesLoading, setRolesLoading] = useState(false);
  const { isSuperAdmin } = usePermissions();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user.username,
      name: user.profileName || "",
      email: user.email,
      phone: user.profilePhone || "",
      password: undefined,
    },
  });

  // Reset form and load roles when dialog opens
  useEffect(() => {
    if (!open) return;

    form.reset({
      username: user.username,
      name: user.profileName || "",
      email: user.email,
      phone: user.profilePhone || "",
      password: undefined,
    });

    if (isSuperAdminUser) return;

    const loadRoles = async () => {
      setRolesLoading(true);
      try {
        const [allRolesRes, userRolesRes] = await Promise.all([
          fetch("/api/roles"),
          fetch(`/api/users/${user.id}/roles`),
        ]);

        const allRoles: RoleOption[] = allRolesRes.ok ? ((await allRolesRes.json()).roles ?? []) : [];
        const currentRoleId: string = userRolesRes.ok ? (((await userRolesRes.json()).roles ?? [])[0]?.id ?? "") : "";

        // 不在可授予列表里的：超级管理员角色（只能改库分配）、
        // 以及敏感角色（带用户管理权限，只有超管能授）—— 后者非超管根本也编辑不到
        const grantable = (r: RoleOption) => isAssignableRole(r.id) && (isSuperAdmin || !r.isSensitive);
        const currentRole = allRoles.find((r) => r.id === currentRoleId);
        const locked =
          currentRoleId && !(currentRole ? grantable(currentRole) : isAssignableRole(currentRoleId))
            ? (currentRole ?? { id: currentRoleId, name: currentRoleId, description: null })
            : null;

        setRoles(allRoles.filter(grantable));
        setLockedRole(locked);
        setSelectedRoleId(locked ? locked.id : allRoles.some((r) => r.id === currentRoleId) ? currentRoleId : "");
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, [open, user, isSuperAdmin]);

  const onSubmit = async (data: UserFormData) => {
    if (!isSuperAdminUser && !selectedRoleId) {
      toast.error("请为用户选择角色");
      return;
    }

    try {
      const submitData: any = {
        username: data.username,
        email: data.email,
        profile: { name: data.name, phone: data.phone },
      };
      if (data.password && data.password.trim() !== "") {
        submitData.password = data.password;
      }

      const userRes = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const rolesRes = isSuperAdminUser
        ? null
        : await fetch(`/api/users/${user.id}/roles`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roleIds: [selectedRoleId] }),
          });

      if (userRes.ok && (!rolesRes || rolesRes.ok)) {
        toast.success("更新用户成功");
        onUserUpdated?.();
        onOpenChange(false);
      } else {
        const error = await (userRes.ok && rolesRes ? rolesRes : userRes).json();
        toast.error(error.error ?? "更新用户失败");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("更新用户失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>更新用户信息。若不修改密码，请留空。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isSuperAdminUser ? (
              <FormItem>
                <FormLabel>角色</FormLabel>
                <FormControl>
                  <Input value="超级管理员" disabled readOnly />
                </FormControl>
                <p className="text-muted-foreground text-xs">系统唯一，不可通过界面分配</p>
              </FormItem>
            ) : (
              <FormItem>
                <FormLabel>角色</FormLabel>
                <Select
                  onValueChange={setSelectedRoleId}
                  value={selectedRoleId}
                  disabled={rolesLoading || (!lockedRole && roles.length === 0)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={rolesLoading ? "加载中..." : "选择角色"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {lockedRole && (
                      <SelectItem value={lockedRole.id} disabled>
                        {lockedRole.name}（{isSuperAdmin ? "仅可后台分配" : "仅超管可分配"}）
                      </SelectItem>
                    )}
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!rolesLoading && roles.length === 0 && !lockedRole && (
                  <p className="text-muted-foreground text-sm">暂无可用角色，请先在「权限管理」中创建角色</p>
                )}
                <FormMessage />
              </FormItem>
            )}

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户名</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>联系电话</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密码（留空则不修改）</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit">更新</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
