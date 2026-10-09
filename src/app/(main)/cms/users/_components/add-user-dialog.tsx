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
import { isAssignableRole } from "@/types/permission";

/** 「权限管理」里配置的角色 —— 新用户的权限就是从这里来 */
interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

const userFormSchema = z.object({
  username: z.string().min(2, "用户名至少 2 位"),
  name: z.string().min(1, "姓名为必填项"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少 6 位"),
  phone: z.string().optional(),
  roleId: z.string().min(1, "请选择角色"),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface AddUserDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUserAdded?: (page: number, pageSize: number) => Promise<void>;
}

export function AddUserDialog({ open, onOpenChange, onUserAdded }: AddUserDialogProps) {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      password: "",
      phone: "",
      roleId: "",
    },
  });

  // 角色列表来自「权限管理」；超级管理员角色不由界面分配
  useEffect(() => {
    if (!open) return;

    setRolesLoading(true);
    fetch("/api/roles")
      .then((res) => (res.ok ? res.json() : { roles: [] }))
      .then((data) => setRoles((data.roles ?? []).filter((r: RoleOption) => isAssignableRole(r.id))))
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));
  }, [open]);

  const onSubmit = async (data: UserFormData) => {
    try {
      // 构建请求数据
      const requestData = {
        username: data.username,
        email: data.email,
        password: data.password,
        roleId: data.roleId,
        profile: {
          name: data.name,
          phone: data.phone,
        },
      };

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        toast.success("创建用户成功");
        // 创建成功后刷新第一页数据
        await onUserAdded?.(1, 10);
        onOpenChange?.(false);
        form.reset();
      } else {
        const error = await response.json();
        toast.error(error.error ?? "创建用户失败");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("创建用户失败");
    }
  };

  const selectedRole = roles.find((r) => r.id === form.watch("roleId"));
  const noRoles = !rolesLoading && roles.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增用户</DialogTitle>
          <DialogDescription>请填写以下信息以创建新用户。权限由所选角色决定。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={noRoles}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={rolesLoading ? "加载中..." : "选择角色"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {noRoles && (
                    <p className="text-muted-foreground text-sm">暂无可用角色，请先在「权限管理」中创建角色</p>
                  )}
                  {selectedRole?.description && (
                    <p className="text-muted-foreground text-xs">{selectedRole.description}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户名</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="用于登录的用户名" />
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
                    <Input {...field} placeholder="真实姓名" />
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
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
                  <FormLabel>联系电话（可选）</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                取消
              </Button>
              <Button type="submit" disabled={noRoles}>
                创建
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
