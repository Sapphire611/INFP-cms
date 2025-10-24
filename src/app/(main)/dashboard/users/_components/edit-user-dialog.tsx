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

const userFormSchema = z.object({
  name: z.string().min(1, "姓名为必填项"),
  email: z.string().email("邮箱格式不正确"),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "如需修改密码，至少 6 位",
    }),
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
      name: user.name,
      email: user.email,
      password: undefined,
    },
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      // 准备提交数据，只有当密码不为空时才包含密码字段
      const submitData = {
        name: data.name,
        email: data.email,
        ...(data.password && data.password.trim() !== "" && { password: data.password }),
      };

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
        form.reset();
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>更新用户信息。若不修改密码，请留空。</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
