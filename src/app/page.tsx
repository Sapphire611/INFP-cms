import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import {
  ArrowRight,
  Bot,
  Sparkles,
  Zap,
  MessageSquare,
  Cpu,
} from "lucide-react";
import type { JWTPayload } from "@/lib/jwt";

async function getAuthPayload(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    if (!token) return null;
    return verify(token, process.env.JWT_SECRET ?? "") as JWTPayload;
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const payload = await getAuthPayload();

  if (payload) {
    redirect("/chat");
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background ambient */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-500/5 blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-purple-500/5 blur-[80px]" />
      </div>

      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-sm">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
        >
          Sapphire Studio
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/cms/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            管理员
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            登录
          </Link>
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground/50 cursor-not-allowed transition-all"
          >
            免费注册
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative max-w-4xl mx-auto px-6 pt-28 pb-20 text-center">
        {/* Floating chip */}
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          基于 DeepSeek AI 大模型
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
            你的{" "}
          </span>
          <span className="bg-gradient-to-r from-primary via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            AI 智能工作站
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          不只是聊天——深度理解上下文，自动总结对话，多轮连续推理。
          一个真正懂你的 AI 助手，随时待命。
        </p>

        <div className="mt-10 flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-105"
          >
            开始使用
            <ArrowRight className="h-5 w-5" />
          </Link>
          <button
            disabled
            className="inline-flex items-center gap-2 rounded-xl border bg-muted px-8 py-4 text-base font-semibold text-muted-foreground/50 cursor-not-allowed transition-all"
          >
            创建账户
          </button>
        </div>

        {/* Floating icon decorations */}
        <div className="absolute top-16 left-8 opacity-20 animate-bounce duration-[4s]">
          <Cpu className="h-8 w-8 text-primary" />
        </div>
        <div className="absolute top-24 right-12 opacity-20 animate-bounce duration-[5s] delay-1000">
          <Sparkles className="h-6 w-6 text-indigo-500" />
        </div>
        <div className="absolute bottom-0 left-[15%] opacity-15 animate-pulse duration-[6s]">
          <Bot className="h-10 w-10 text-purple-500" />
        </div>
      </section>

      {/* Features */}
      <section className="relative max-w-5xl mx-auto px-6 pb-32 grid gap-5 md:grid-cols-3">
        {[
          {
            icon: Bot,
            title: "多模型对话",
            desc: "DeepSeek 大模型驱动，支持长上下文理解，复杂问题深度推理。",
            gradient: "from-blue-500/10 to-blue-500/5",
            iconColor: "text-blue-500",
          },
          {
            icon: MessageSquare,
            title: "智能记忆",
            desc: "对话自动摘要归档，支持随时回溯历史聊天记录，上下文永不丢失。",
            gradient: "from-indigo-500/10 to-indigo-500/5",
            iconColor: "text-indigo-500",
          },
          {
            icon: Zap,
            title: "Agent 扩展",
            desc: "模块化 Agent 架构，未来可接入人格分析、写作辅助、代码助手等更多能力。",
            gradient: "from-purple-500/10 to-purple-500/5",
            iconColor: "text-purple-500",
          },
        ].map(({ icon: Icon, title, desc, gradient, iconColor }) => (
          <div
            key={title}
            className="group relative rounded-2xl border bg-card p-8 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300"
          >
            <div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />
            <div className="relative z-10">
              <div className="mb-5 inline-flex rounded-xl bg-muted p-3 group-hover:scale-110 transition-transform duration-300">
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="relative border-t bg-muted/20">
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Sapphire Studio
            </span>
            <span>— AI 智能工作站</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Sapphire Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
