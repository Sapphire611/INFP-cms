# Auth Middleware 修复记录

**日期**: 2026-04-10

## 问题描述

登录后跳转 `/cms/dashboard` 出现 307 无限重定向（"重定向次数过多"）；删除 cookie 后仍可操作；右上角用户头像不显示。

---

## 根本原因与修复

### Bug 1 — 缺少 middleware 入口文件（最严重）

`src/middleware/auth-middleware.ts` 写了但从未被 Next.js 调用，因为缺少 `src/middleware.ts`。整个认证体系完全失效。

该项目使用 `src/proxy.ts` 替代标准 `middleware.ts`（自定义 Next.js fork 约定）。`proxy.ts` 已存在且调用了 `authMiddleware`，只需修复 `match` 路径。

**修改** `src/proxy.ts` 的 `config.match`：
```ts
// 修改前
match: ["/dashboard/:path*", "/auth/:path*", "/login", "/register", "/api/:path*"]
// 修改后
match: ["/cms/:path*", "/auth/:path*", "/login", "/register", "/api/:path*"]
```

---

### Bug 2 — 路径检查与实际路由不匹配

`authMiddleware` 检查 `/dashboard` 前缀，但实际路由是 `/cms/dashboard`。
`next.config.mjs` 有 `/dashboard` → `/cms/dashboard` 的 307 重定向，两者叠加形成循环。

**修复** `src/middleware/auth-middleware.ts`：

| 位置 | 修改前 | 修改后 |
|------|--------|--------|
| 未登录保护 | `pathname.startsWith("/dashboard")` | `pathname.startsWith("/cms")` |
| 已登录跳转 | `redirect("/dashboard")` | `redirect("/cms/dashboard")` |
| 权限不足跳转 | `redirect("/dashboard")` | `redirect("/cms/dashboard")` |

---

### Bug 3 — user-info cookie 编码缺失导致头像消失

`login-form.tsx` 设置 cookie 时未 `encodeURIComponent`，但 `useAuth` 读取时调用了 `decodeURIComponent`。JSON 中的 `{`, `"`, `:`, `,` 等特殊字符导致 cookie 解析失败，`user` 为 null，`NavUser` 组件 `return null`（头像消失）。

**修复** `src/components/login-form.tsx`：
```ts
// 修改前
document.cookie = `user-info=${JSON.stringify(result.user)}; ...`;
// 修改后
document.cookie = `user-info=${encodeURIComponent(JSON.stringify(result.user))}; ...`;
```

**修复** `src/hooks/use-auth.ts`：
```ts
// 修改前（split("=")[1] 在 value 含 = 时会截断）
const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.split("=")[1]));
// 修改后
const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.split("=").slice(1).join("=")));
```

### Bug 4 — JWT payload 中 userType 为 undefined 导致权限检查死循环

`validateCredentials` 返回 Supabase 原始行，字段是 `user_type`（snake_case），但 `login/route.ts` 用 `user.userType` 读取 → `undefined`。JWT payload 里 `userType` 是 `undefined`，不等于 `"admin"`，触发权限检查，`/cms/dashboard` 需要 `dashboard:view`，用户没有 → redirect 到 `/cms/dashboard` → 死循环。

**修复** `src/lib/auth.ts` — `validateCredentials` 返回前做字段映射：
```ts
return {
  id: rawUser.id,
  email: rawUser.email,
  userType: rawUser.user_type as "admin" | "user",
  isActive: rawUser.is_active,
  profileName: rawUser.profile_name ?? undefined,
  username: rawUser.username,
};
```

**同步修复** `src/middleware/auth-middleware.ts` — 权限不足 redirect 改为 `/unauthorized`，防止同类循环：
```ts
// 修改前
return NextResponse.redirect(new URL("/cms/dashboard", req.url));
// 修改后
return NextResponse.redirect(new URL("/unauthorized", req.url));
```

---

### Bug 5 — 管理后台修改/创建密码后无法登录

`userService.ts` 的 `createUser` / `updateUser` 直接 `bcrypt(明文)`，但登录时客户端先 SHA-256 再发送，服务端验证的是 `bcrypt(SHA-256(明文))`，两者不匹配。

**修复** `src/services/userService.ts`：
```ts
// 修改前
updateData.password = await hashPassword(data.password);

// 修改后
const sha256 = await hashPasswordWithSHA256(data.password);
updateData.password = await hashPassword(sha256);
```

`createUser` 同理。密码存储格式统一为 `bcrypt(SHA-256(明文))`。

---



| 文件 | 变更 |
|------|------|
| `src/proxy.ts` | match 路径从 `/dashboard` 改为 `/cms` |
| `src/middleware/auth-middleware.ts` | 路径检查从 `/dashboard` 改为 `/cms`；权限不足跳转改为 `/unauthorized` |
| `src/components/login-form.tsx` | cookie 设置加 `encodeURIComponent` |
| `src/hooks/use-auth.ts` | cookie 解析修复 `split("=")` 问题 |
| `src/lib/auth.ts` | `validateCredentials` 返回前做 snake_case → camelCase 映射 |
| `src/app/api/auth/login/route.ts` | 修复 `user.userType` / `user.profileName` 字段读取 |
| `src/services/userService.ts` | 修改/创建密码时统一走 SHA-256 → bcrypt 流程 |

---

## 注意事项

- 路径检查统一用 `/cms` 前缀，与实际路由结构保持一致
- cookie 存储 JSON 对象时必须 `encodeURIComponent`，读取时对应 `decodeURIComponent`
- `validateCredentials` 返回的是 Supabase 原始 snake_case 字段，调用方不能直接用 camelCase 访问
- 密码存储格式：`bcrypt(SHA256(明文))`，管理后台修改密码必须走同样流程，否则登录失败
- 权限不足时 redirect 目标不能是受权限保护的页面，否则形成循环
