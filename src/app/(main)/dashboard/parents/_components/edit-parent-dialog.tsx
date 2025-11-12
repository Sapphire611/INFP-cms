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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ParentResponse } from "@/types/parent";
import { ManageChildrenSection } from "./manage-children-section";

const parentFormSchema = z.object({
  name: z.string().min(1, "姓名为必填项"),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
  isActive: z.boolean(),
});

type ParentFormData = z.infer<typeof parentFormSchema>;

interface EditParentDialogProps {
  parent: ParentResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onParentUpdated?: () => void;
}

export function EditParentDialog({ parent, open, onOpenChange, onParentUpdated }: EditParentDialogProps) {
  const form = useForm<ParentFormData>({
    resolver: zodResolver(parentFormSchema),
    defaultValues: {
      name: parent.profile?.name || "",
      phone: parent.profile?.phone || "",
      idNumber: parent.profile?.idNumber || "",
      isActive: parent.isActive,
    },
  });

  // 当 parent 改变时重置表单
  React.useEffect(() => {
    form.reset({
      name: parent.profile?.name || "",
      phone: parent.profile?.phone || "",
      idNumber: parent.profile?.idNumber || "",
      isActive: parent.isActive,
    });
  }, [parent, form]);

  const onSubmit = async (data: ParentFormData) => {
    try {
      const requestData = {
        profile: {
          name: data.name,
          phone: data.phone,
          idNumber: data.idNumber,
        },
        isActive: data.isActive,
      };

      const response = await fetch(`/api/parents/${parent._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        toast.success("更新家长成功");
        onParentUpdated?.();
        onOpenChange(false);
      } else {
        const error = await response.json();
        toast.error(error.error ?? "更新家长失败");
      }
    } catch (error) {
      console.error("Error updating parent:", error);
      toast.error("更新家长失败");
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑家长</DialogTitle>
            <DialogDescription>更新家长信息</DialogDescription>
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
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">账户状态</FormLabel>
                    <DialogDescription>
                      禁用后家长将无法通过微信小程序登录
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* 账户信息摘要 */}
            <div className="rounded-lg bg-muted p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">关联学生数：</span>
                  {parent.children.length > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help font-medium underline decoration-dotted">
                          {parent.children.length}人
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <div className="font-semibold">关联学生：</div>
                          {parent.children.map((child: any) => (
                            <div key={child._id} className="text-sm">
                              • {child.name} ({child.studentId})
                              {child.class && ` - ${child.class.name}`}
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="font-medium">0人</span>
                  )}
                </div>
                {parent.openid && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">微信状态：</span>
                    <span className="font-medium text-green-600">已绑定</span>
                  </div>
                )}
                {parent.lastLoginAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">最后登录：</span>
                    <span className="font-medium">
                      {new Date(parent.lastLoginAt).toLocaleString("zh-CN")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 管理关联学生 */}
            <ManageChildrenSection
              parentId={parent._id}
              children={parent.children}
              onChildrenUpdated={onParentUpdated}
              onCloseParentDialog={() => onOpenChange(false)}
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
    </TooltipProvider>
  );
}
