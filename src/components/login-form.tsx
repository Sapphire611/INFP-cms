"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const FormSchema = z.object({
  email: z.string().email({ message: "请输入有效的邮箱地址。" }),
  password: z.string().min(6, { message: "密码至少需要6个字符。" }),
  remember: z.boolean().optional(),
});

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("登录成功！");
        // 设置认证 cookies
        document.cookie = `auth-token=${result.token}; path=/; max-age=86400; SameSite=Strict`;
        document.cookie = `user-info=${JSON.stringify(result.user)}; path=/; max-age=86400; SameSite=Strict`;
        // 跳转到仪表板
        router.push("/dashboard/default");
      } else {
        toast.error(result.error ?? "登录失败，请检查邮箱和密码");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("登录时发生错误，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱地址</FormLabel>
              <FormControl>
                <Input id="email" type="email" placeholder="您的邮箱地址" autoComplete="email" {...field} />
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
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center">
              <FormControl>
                <Checkbox
                  id="login-remember"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="size-4"
                />
              </FormControl>
              <FormLabel htmlFor="login-remember" className="text-muted-foreground ml-1 text-sm font-medium">
                30天内记住我
              </FormLabel>
            </FormItem>
          )}
        />
        <div className="space-y-3">
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full text-sm font-medium"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "登录中..." : "登录"}
          </Button>
          <Button
            className="h-10 w-full text-sm font-medium"
            type="button"
            variant="outline"
            onClick={() => router.push("/register")}
          >
            创建账户
          </Button>
        </div>
      </form>
    </Form>
  );
}
