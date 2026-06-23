import Link from "next/link";
import { ArrowRight, Sparkles, Brain, Users, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <span className="text-xl font-bold tracking-tight">MBTI.ai</span>
        <nav className="flex items-center gap-4">
          <Link href="/mbti/types" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            类型百科
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            登录
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            免费注册
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight leading-tight">
          AI 驱动的深度人格分析
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          基于 MBTI 理论，结合 DeepSeek AI 大模型，为你生成专属的个性报告——
          不止于 4 个字母，而是真正理解你的思维模式、优势与成长方向。
        </p>
        <Link
          href="/mbti/test"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
        >
          开始免费测试
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-8">
          <Brain className="h-8 w-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">AI 深度解读</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            不只是告诉你类型，而是从认知功能、情感模式、发展建议多个维度进行深度分析。
          </p>
        </div>

        <div className="rounded-xl border bg-card p-8">
          <Users className="h-8 w-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">16 型人格百科</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            完整的 MBTI 类型库——了解每种人格的优势、劣势、职业匹配与名人代表。
          </p>
        </div>

        <div className="rounded-xl border bg-card p-8">
          <Shield className="h-8 w-8 text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">隐私优先</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            你的测试数据与人格报告完全加密，绝不会被用于其他用途。
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-16 text-center">
        <p className="text-muted-foreground mb-4">准备好了吗？三分钟，认识真正的自己。</p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
        >
          免费开始
          <Sparkles className="h-5 w-5" />
        </Link>
      </section>
    </div>
  );
}
