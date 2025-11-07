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

const parentFormSchema = z.object({
  name: z.string().min(1, "姓名为必填项"),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
});

type ParentFormData = z.infer<typeof parentFormSchema>;

interface AddParentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onParentAdded?: () => void;
}

export function AddParentDialog({ open, onOpenChange, onParentAdded }: AddParentDialogProps) {
  const form = useForm<ParentFormData>({
    resolver: zodResolver(parentFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      idNumber: "",
    },
  });

  const onSubmit = async (data: ParentFormData) => {
    try {
      const requestData = {
        profile: {
          name: data.name,
          phone: data.phone,
          idNumber: data.idNumber,
        },
        children: [],
      };

      const response = await fetch("/api/parents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        toast.success("创建家长成功");
        onParentAdded?.();
        onOpenChange?.(false);
        form.reset();
      } else {
        const error = await response.json();
        toast.error(error.error ?? "创建家长失败");
      }
    } catch (error) {
      console.error("Error creating parent:", error);
      toast.error("创建家长失败");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增家长</DialogTitle>
          <DialogDescription>
            创建新的家长账户。家长不能登录CMS，仅通过微信小程序访问。
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
                    <Input {...field} placeholder="请输入家长姓名" />
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
