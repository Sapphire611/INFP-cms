'use client';

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import { hashPasswordWithSHA256 } from "@/lib/crypto";

export default function UserLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("邮箱和密码不能为空");
      return;
    }

    setLoading(true);

    try {
      const hashedPassword = await hashPasswordWithSHA256(password);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: hashedPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess("登录成功！正在跳转...");

        const maxAge = data.maxAge ?? 86400;
        document.cookie = `auth-token=${data.token}; path=/; max-age=${maxAge}; SameSite=Strict`;
        document.cookie = `user-info=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=${maxAge}; SameSite=Strict`;

        setTimeout(() => {
          window.location.href = "/chat";
        }, 800);
      } else {
        setError(data.error || "登录失败，请检查邮箱和密码");
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Background ambient */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="border-b px-6 py-4 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent"
          >
            Sapphire Studio
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo & Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              AI 智能工作站
            </div>
            <h1 className="text-3xl font-bold">欢迎回来</h1>
            <p className="text-muted-foreground">
              登录你的账户，继续使用 Sapphire Studio
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 text-green-600 px-4 py-3 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {/* Login Form */}
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  邮箱地址
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 h-11"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 h-11"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? "登录中..." : "登录"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>

          {/* Links */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              还没有账户？{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                立即注册
              </Link>
            </p>
            <p className="text-xs">
              管理员？{" "}
              <Link href="/cms/login" className="hover:underline">
                点击这里登录
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
