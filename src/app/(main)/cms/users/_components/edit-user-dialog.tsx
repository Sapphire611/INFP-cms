"use client";

import * as React from "react";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";

import { UserWithCallback } from "./types";

const userFormSchema = z.object({
  username: z.string().min(2, "用户名至少 2 位"),
  name: z.string().min(1, "姓名为必填项"),
  email: z.string().email("邮箱格式不正确"),
  phone: z.string().optional(),
  userType: z.enum(["admin", "user"]),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "如需修改密码，至少 6 位",
    }),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface Role {
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
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [rolesLoading, setRolesLoading] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user.username,
      name: user.profileName || "",
      email: user.email,
      phone: user.profilePhone || "",
      userType: user.userType,
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
      userType: user.userType,
      password: undefined,
    });

    const loadRoles = async () => {
      setRolesLoading(true);
      try {
        const [allRolesRes, userRolesRes] = await Promise.all([
          fetch("/api/roles"),
          fetch(`/api/users/${user.id}/roles`),
        ]);
        if (allRolesRes.ok) {
          const { roles: allRoles } = await allRolesRes.json();
          setRoles(allRoles);
        }
        if (userRolesRes.ok) {
          const { roles: userRoles } = await userRolesRes.json();
          setSelectedRoleIds(new Set(userRoles.map((r: Role) => r.id)));
        }
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, [open, user]);

  const toggleRole = (id: string) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      const submitData: any = {
        username: data.username,
        email: data.email,
        userType: data.userType,
        profile: { name: data.name, phone: data.phone },
      };
      if (data.password && data.password.trim() !== "") {
        submitData.password = data.password;
      }

      const [userRes, rolesRes] = await Promise.all([
        fetch(`/api/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submitData),
        }),
        fetch(`/api/users/${user.id}/roles`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleIds: Array.from(selectedRoleIds) }),
        }),
      ]);

      if (userRes.ok && rolesRes.ok) {
        toast.success("更新用户成功");
        onUserUpdated?.();
        onOpenChange(false);
      } else {
        const error = await (userRes.ok ? rolesRes : userRes).json();
        toast.error(error.error ?? "更新用户失败");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("更新用户失败");
    }
  };

  const watchedUserType = form.watch("userType");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>更新用户信息。若不修改密码，请留空。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户名</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="userType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户类型</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="选择用户类型" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">管理员</SelectItem>
                      <SelectItem value="user">普通用户</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <FormControl><Input {...field} /></FormControl>
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
                  <FormControl><Input type="email" {...field} /></FormControl>
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
                  <FormControl><Input {...field} /></FormControl>
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
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role assignment — only for non-admin users */}
            {watchedUserType === "user" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <FormLabel>分配角色</FormLabel>
                  {rolesLoading ? (
                    <p className="text-muted-foreground text-sm">加载角色中...</p>
                  ) : roles.length === 0 ? (
                    <p className="text-muted-foreground text-sm">暂无可用角色，请先在「权限管理」中创建角色</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {roles.map((role) => (
                        <div key={role.id} className="flex items-center gap-2 rounded-md border p-2">
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={selectedRoleIds.has(role.id)}
                            onCheckedChange={() => toggleRole(role.id)}
                          />
                          <label htmlFor={`role-${role.id}`} className="cursor-pointer text-sm">
                            {role.name}
                            {role.description && (
                              <span className="text-muted-foreground block text-xs">{role.description}</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

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
