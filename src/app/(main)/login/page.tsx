import { LoginForm } from "../../../components/login-form";

export default function Login() {
  return (
    <div className="flex h-dvh">
      <div className="flex w-full items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-8 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-500/10" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-500/10" />
        </div>

        <div className="relative w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="text-2xl font-medium tracking-tight text-slate-900 dark:text-white">Login</div>
            <div className="text-muted-foreground mx-auto max-w-xl">
              Welcome back. Enter your email and password, let&apos;s hope you remember them this time.
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/70">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
