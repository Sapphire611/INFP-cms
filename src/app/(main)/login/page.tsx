import Link from "next/link";
import { Mail, Lock, ArrowRight } from "lucide-react";

export default function UserLoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            INFP Notebook
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo & Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">欢迎回来</h1>
            <p className="text-muted-foreground">
              登录你的账户，继续使用 INFP Notebook
            </p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            {/* Email Login */}
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  邮箱地址
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <button
                type="button"
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                登录
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">或者</span>
              </div>
            </div>

            {/* WeChat Login (Coming Soon) */}
            <button
              type="button"
              disabled
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.564.564 0 0 1 .384-.15c.146 0 .288.058.397.163.959.693 2.105 1.087 3.308 1.087.163 0 .32-.014.482-.025a5.7 5.7 0 0 1-.086.58c-.138.825-.069 1.563.207 2.117.144.277.425.517.824.517.146 0 .288-.058.397-.163l1.903-1.114a.564.564 0 0 1 .384-.15c.146 0 .288.058.397.163.765.552 1.657.871 2.592.871.176 0 .348-.02.522-.037a6.686 6.686 0 0 1-.022.314c-.051.515.022.982.207 1.323.144.277.425.517.824.517.146 0 .288-.058.397-.163l1.448-.847a.512.512 0 0 1 .384-.15c.146 0 .288.058.397.163.636.459 1.372.716 2.129.716.176 0 .348-.02.522-.037.163 0 .32-.014.482-.025a5.7 5.7 0 0 1-.086.58c-.138.825-.069 1.563.207 2.117.144.277.425.517.824.517.146 0 .288-.058.397-.163l1.903-1.114a.564.564 0 0 1 .384-.15c.146 0 .288.058.397.163.959.693 2.105 1.087 3.308 1.087.863 0 1.681-.177 2.435-.493a.48.48 0 0 0 .213-.665l-.39-1.48c-.019-.07-.048-.141-.048-.213 0-.163.13-.295.29-.295.07 0 .14.02.194.054l1.903 1.114a.326.326 0 0 0 .167.054c.163 0 .29-.132.29-.295 0-.072-.029-.143-.048-.213l-.39-1.48a.59.59 0 0 1 .213-.665c1.832-1.347 3.002-3.338 3.002-5.55 0-4.054-3.891-7.342-8.691-7.342z" />
              </svg>
              微信登录（即将支持）
            </button>
          </div>

          {/* Register Link */}
          <div className="text-center text-sm text-muted-foreground">
            还没有账户？{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              立即注册
            </Link>
          </div>

          {/* Admin Login Link */}
          <div className="text-center text-xs text-muted-foreground">
            管理员？{" "}
            <Link href="/cms/login" className="hover:underline">
              点击这里登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
