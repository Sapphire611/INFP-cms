import { LoginForm } from "../../../components/login-form";

export default function Login() {
  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      {/* Left side - Brand/Image section */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 lg:flex lg:h-full lg:w-1/2">
        {/* Background decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/5 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex w-full flex-col items-center justify-center px-12 py-16 text-white">
          <div className="max-w-xl space-y-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">Sapphire Studio</h1>
              <p className="text-lg text-white/80">内容管理平台</p>
            </div>
            <p className="leading-relaxed text-white/70">
              简洁高效的内容管理系统，为您提供用户管理、数据统计等核心功能。
            </p>

            {/* Feature highlights */}
            <div className="space-y-4 pt-8">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">用户管理</h3>
                  <p className="text-sm text-white/70">轻松管理后台用户和微信用户信息</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">微信集成</h3>
                  <p className="text-sm text-white/70">支持微信小程序用户登录和管理</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">数据安全</h3>
                  <p className="text-sm text-white/70">企业级安全保障，保护用户隐私</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex h-full w-full items-center justify-center bg-white p-6 lg:w-1/2 lg:p-12 dark:bg-slate-950">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and title for mobile */}
          <div className="mb-8 space-y-2 text-center lg:hidden">
            <h2 className="text-2xl font-bold tracking-tight">Sapphire Studio</h2>
            <p className="text-muted-foreground text-sm">内容管理平台</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">欢迎回来</h1>
              <p className="text-muted-foreground">请输入您的账号信息以登录系统</p>
            </div>

            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <LoginForm />
            </div>

            <div className="text-muted-foreground text-center text-sm">
              <p>后台管理系统</p>
              <p className="mt-1">微信用户请使用微信小程序访问</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
