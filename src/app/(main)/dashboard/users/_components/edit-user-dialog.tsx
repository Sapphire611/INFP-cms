"use client";

import * as React from "react";

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

const userFormSchema = z.object({
  username: z.string().min(2, "用户名至少 2 位"),
  name: z.string().min(1, "姓名为必填项"),
  email: z.string().email("邮箱格式不正确"),
  phone: z.string().optional(),
  userType: z.enum(["admin", "teacher", "parent"]),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "如需修改密码，至少 6 位",
    }),
  teacherId: z.string().optional(),
  subjects: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

import { UserWithCallback } from "./types";

interface EditUserDialogProps {
  user: UserWithCallback;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: () => void;
}

export function EditUserDialog({ user, open, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: user.username,
      name: user.profile?.name || "",
      email: user.email,
      phone: user.profile?.phone || "",
      userType: user.userType,
      password: undefined,
      teacherId: user.teacherInfo?.teacherId || "",
      subjects: user.teacherInfo?.subjects?.join(", ") || "",
    },
  });

  const selectedUserType = form.watch("userType");

  const onSubmit = async (data: UserFormData) => {
    try {
      // 准备提交数据
      const submitData: any = {
        username: data.username,
        email: data.email,
        userType: data.userType,
        profile: {
          name: data.name,
          phone: data.phone,
        },
      };

      // 只有当密码不为空时才包含密码字段
      if (data.password && data.password.trim() !== "") {
        submitData.password = data.password;
      }

      // 如果是教师，添加教师信息
      if (data.userType === "teacher") {
        submitData.teacherInfo = {
          teacherId: data.teacherId,
          subjects: data.subjects ? data.subjects.split(",").map(s => s.trim()) : [],
        };
      }

      const response = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        toast.success("更新用户成功");
        onUserUpdated?.();
        onOpenChange(false);
      } else {
        const error = await response.json();
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
              name="userType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>用户类型</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择用户类型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">管理员</SelectItem>
                      <SelectItem value="teacher">教师</SelectItem>
                      <SelectItem value="parent">家长</SelectItem>
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

            {/* 教师专属字段 */}
            {selectedUserType === "teacher" && (
              <>
                <FormField
                  control={form.control}
                  name="teacherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>教师工号</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>教授科目</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="用逗号分隔，如：语文,数学,英语" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
