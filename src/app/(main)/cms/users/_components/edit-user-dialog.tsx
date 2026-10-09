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

  // 角色只读：只有超管能改（超管自己的账号也只看，它不走角色体系）。
  // 普通管理员的弹窗里，角色是个禁用的输入框 —— 免得下拉里挑个「查看者」就把人降级了。
  const canAssignRole = isSuperAdmin && !isSuperAdminUser;

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

        // 超级管理员角色不在可分配列表里（只能改库分配）；用户当前挂着它就只读展示，
        // 免得保存时被静默抹掉
        const currentRole = allRoles.find((r) => r.id === currentRoleId);
        const locked =
          currentRoleId && !isAssignableRole(currentRoleId)
            ? (currentRole ?? { id: currentRoleId, name: currentRoleId, description: null })
            : null;

        setRoles(allRoles.filter((r) => isAssignableRole(r.id)));
        setLockedRole(locked);
        setSelectedRoleId(locked ? locked.id : allRoles.some((r) => r.id === currentRoleId) ? currentRoleId : "");
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, [open, user, isSuperAdmin]);

  const onSubmit = async (data: UserFormData) => {
    if (canAssignRole && !selectedRoleId) {
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

      // 角色只读时压根不发这个请求 —— 接口也只收超管
      const rolesRes = canAssignRole
        ? await fetch(`/api/users/${user.id}/roles`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roleIds: [selectedRoleId] }),
          })
        : null;

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

  // 只读展示用：当前角色名可能在可分配列表里，也可能落在 lockedRole（超管角色，改库才有）上
  const selectedRoleName = roles.find((r) => r.id === selectedRoleId)?.name ?? lockedRole?.name ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>更新用户信息。若不修改密码，请留空。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!canAssignRole ? (
              <FormItem>
                <FormLabel>角色</FormLabel>
                <FormControl>
                  <Input value={isSuperAdminUser ? "超级管理员" : selectedRoleName} disabled readOnly />
                </FormControl>
                <p className="text-muted-foreground text-xs">
                  {isSuperAdminUser ? "系统唯一，不可通过界面分配" : "角色只有超级管理员能改"}
                </p>
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
                        {lockedRole.name}（仅可后台分配）
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
