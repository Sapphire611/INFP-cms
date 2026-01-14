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

const wechatUserFormSchema = z.object({
  name: z.string().min(1, "姓名为必填项"),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
});

type WechatUserFormData = z.infer<typeof wechatUserFormSchema>;

interface AddWechatUserDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onWechatUserAdded?: () => void;
}

export function AddWechatUserDialog({ open, onOpenChange, onWechatUserAdded }: AddWechatUserDialogProps) {
  const form = useForm<WechatUserFormData>({
    resolver: zodResolver(wechatUserFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      idNumber: "",
    },
  });

  const onSubmit = async (data: WechatUserFormData) => {
    try {
      const requestData = {
        profile: {
          name: data.name,
          phone: data.phone,
          idNumber: data.idNumber,
        },
        children: [],
      };

      const response = await fetch("/api/wechat-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        toast.success("创建微信用户成功");
        onWechatUserAdded?.();
        onOpenChange?.(false);
        form.reset();
      } else {
        const error = await response.json();
        toast.error(error.error ?? "创建微信用户失败");
      }
    } catch (error) {
      console.error("Error creating wechat user:", error);
      toast.error("创建微信用户失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增微信用户</DialogTitle>
          <DialogDescription>
            创建新的微信用户账户。微信用户不能登录CMS，仅通过微信小程序访问。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>姓名 *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="请输入微信用户姓名" />
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
                    <Input {...field} placeholder="请输入联系电话" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="idNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>身份证号</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="选填，用于实名认证" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                取消
              </Button>
              <Button type="submit">创建</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
