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
import { Switch } from "@/components/ui/switch";
import { WechatUserResponse } from "@/types/wechatUser";

const wechatUserFormSchema = z.object({
  name: z.string().min(1, "姓名为必填项"),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
  isActive: z.boolean(),
});

type WechatUserFormData = z.infer<typeof wechatUserFormSchema>;

interface EditWechatUserDialogProps {
  wechatUser: WechatUserResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWechatUserUpdated?: () => void;
}

export function EditWechatUserDialog({
  wechatUser,
  open,
  onOpenChange,
  onWechatUserUpdated,
}: EditWechatUserDialogProps) {
  const form = useForm<WechatUserFormData>({
    resolver: zodResolver(wechatUserFormSchema),
    defaultValues: {
      name: wechatUser.profileName || "",
      phone: wechatUser.profilePhone || "",
      idNumber: wechatUser.profileIdNumber || "",
      isActive: wechatUser.isActive,
    },
  });

  // 当 wechatUser 改变时重置表单
  React.useEffect(() => {
    form.reset({
      name: wechatUser.profileName || "",
      phone: wechatUser.profilePhone || "",
      idNumber: wechatUser.profileIdNumber || "",
      isActive: wechatUser.isActive,
    });
  }, [wechatUser, form]);

  const onSubmit = async (data: WechatUserFormData) => {
    try {
      const requestData = {
        profile: {
          name: data.name,
          phone: data.phone,
          idNumber: data.idNumber,
        },
        isActive: data.isActive,
      };

      const response = await fetch(`/api/wechat-users/${wechatUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        toast.success("更新微信用户成功");
        onWechatUserUpdated?.();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.error ?? "更新微信用户失败");
      }
    } catch (error) {
      console.error("Error updating wechat user:", error);
      toast.error("更新微信用户失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑微信用户</DialogTitle>
          <DialogDescription>更新微信用户信息</DialogDescription>
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
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">账户状态</FormLabel>
                    <DialogDescription>禁用后微信用户将无法通过微信小程序登录</DialogDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* 账户信息摘要 */}
            <div className="bg-muted rounded-lg p-4">
              <div className="space-y-2 text-sm">
                {wechatUser.openid && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">微信状态：</span>
                    <span className="font-medium text-green-600">已绑定</span>
                  </div>
                )}
                {wechatUser.lastLoginAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">最后登录：</span>
                    <span className="font-medium">{new Date(wechatUser.lastLoginAt).toLocaleString("zh-CN")}</span>
                  </div>
                )}
              </div>
            </div>

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
