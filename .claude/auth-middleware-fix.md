---
name: Auth Middleware Fix (2026-04-10)
description: 修复了无限重定向、路径检查错误、用户信息 cookie 解析失败三个严重 bug
type: project
---

## 问题背景

登录后跳转 /cms/dashboard 出现 307 无限重定向；删除 cookie 后仍可操作；右上角用户头像不显示。

## 根本原因与修复

### Bug 1 — 缺少 middleware 入口文件（最严重）

`src/middleware/auth-middleware.ts` 写了但从未被 Next.js 调用，因为缺少 `src/middleware.ts`。

**修复**：新建 `src/middleware.ts`，matcher 为 `["/cms/:path*", "/login", "/register", "/auth/:path*"]`。

### Bug 2 — 路径检查与实际路由不匹配

`authMiddleware` 检查 `/dashboard`，但实际路由是 `/cms/dashboard`。
`next.config.mjs` 有 `/dashboard` → `/cms/dashboard` 的 307 重定向，两者叠加形成循环。

**修复**：`auth-middleware.ts` 中所有路径从 `/dashboard` 改为 `/cms`，重定向目标改为 `/cms/dashboard`。

### Bug 3 — user-info cookie 编码缺失

`login-form.tsx` 设置 cookie 时未 `encodeURIComponent`，但 `useAuth` 读取时调用了 `decodeURIComponent`。JSON 中的特殊字符导致 cookie 解析失败，`user` 为 null，`NavUser` 组件返回 null（头像消失）。

**修复**：
- `login-form.tsx`：`encodeURIComponent(JSON.stringify(result.user))`
- `use-auth.ts`：`split("=").slice(1).join("=")` 替代 `split("=")[1]`

## 关键文件

- `src/middleware.ts` — 新建，Next.js middleware 入口
- `src/middleware/auth-middleware.ts` — 路径检查逻辑
- `src/components/login-form.tsx` — cookie 设置
- `src/hooks/use-auth.ts` — cookie 读取与解析

**Why:** 路由结构是 `/cms/*` 而非 `/dashboard/*`，middleware 入口文件是 Next.js 强制约定，缺失则整个认证体系失效。
**How to apply:** 未来新增受保护路由时，确保 matcher 包含对应前缀，路径检查统一用 `/cms`。
