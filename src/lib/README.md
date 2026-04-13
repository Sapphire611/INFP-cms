# Lib 工具库说明

本目录包含项目核心工具函数和配置。

## 总结

1. ✅ supabase-admin.ts - 17 处使用（服务层、API、脚本）    
                                                                       
2. ✅ supabase-server.ts - 2 处使用（登录/登出 API）
   
3. ✅ supabase-client.ts - 3 处使用（认证流程）
   
4. ✅ auth.ts - 2 处使用（用户服务、登录 API）
   
5. ✅ jwt.ts - 10 处使用（中间件、API 路由保护）
   
6. ✅ crypto.ts - 8 处使用（密码哈希、表单、脚本）
   
7. ✅ utils.ts - 52 处使用（所有 UI 组件）
   
8. ✅ theme-utils.ts - 3 处使用（主题切换、布局控制）
   
9.  ✅ layout-utils.ts - 2 处使用（布局控制组件）
   
## 📋 文件列表

### ✅ `supabase-admin.ts`
**作用**: Supabase 管理员客户端（绕过 RLS）

**功能**:
- 创建具有 Service Role 权限的 Supabase 客户端
- 绕过行级安全策略（Row Level Security）
- **仅用于服务端**：API 路由、Server Actions、后台任务

**使用位置**:
- `src/lib/auth.ts` - 用户认证和密码验证
- `src/services/userService.ts` - 用户管理服务
- `src/services/wechatUserService.ts` - 微信用户服务
- `src/services/permissionService.ts` - 权限管理服务
- `src/services/conversationService.ts` - 对话管理服务
- `src/services/summaryService.ts` - 摘要服务
- `src/app/api/dashboard/*` - Dashboard 统计 API
- `src/app/api/users/stats/*` - 用户统计 API
- `src/scripts/*` - 数据库脚本

**⚠️ 安全警告**: 
- 永远不要在客户端使用
- 永远不要暴露 `SUPABASE_SERVICE_ROLE_KEY`

---

### ✅ `supabase-server.ts`
**作用**: Supabase 服务端客户端（支持 RLS）

**功能**:
- 创建用于 Server Components 和 Route Handlers 的 Supabase 客户端
- 自动处理 cookie 管理和用户认证
- 遵守行级安全策略

**使用位置**:
- `src/app/api/auth/login/route.ts` - 登录 API
- `src/app/api/auth/logout/route.ts` - 登出 API

---

### ✅ `supabase-client.ts`
**作用**: Supabase 浏览器客户端

**功能**:
- 创建用于客户端组件的 Supabase 客户端
- 自动处理 localStorage 和会话管理
- 用于客户端数据操作

**使用位置**:
- `src/app/api/auth/login/route.ts` - 登录流程
- `src/app/api/auth/logout/route.ts` - 登出流程
- `src/lib/supabase-admin.ts` - 作为基础导入

---

### ✅ `auth.ts`
**作用**: 认证核心工具

**功能**:
- `hashPassword()` - 使用 bcrypt 哈希密码（强度 10）
- `comparePassword()` - 验证密码
- `validateCredentials()` - 验证用户凭证（支持新旧格式自动升级）
- `createSupabaseUser()` - 创建 Supabase Auth 用户
- `signInSupabase()` - Supabase Auth 登录

**密码格式**:
- **新格式**: SHA-256 + bcrypt（客户端先 SHA-256，服务端再 bcrypt）
- **旧格式**: 仅 bcrypt（自动升级到新格式）

**使用位置**:
- `src/services/userService.ts` - 用户创建和密码管理
- `src/app/api/auth/login/route.ts` - 登录验证

---

### ✅ `jwt.ts`
**作用**: JWT 令牌验证工具

**功能**:
- `verifyAuth()` - 从 cookie 验证 JWT 令牌
- `getUserId()` - 获取当前用户 ID
- `requireAuth()` - API 路由保护中间件助手

**JWT Payload 结构**:
```typescript
{
  id: string,
  email: string,
  userType: "admin" | "user",
  permissions: string[],  // ["users:create", "roles:view", ...]
  iat: number,
  exp: number
}
```

**使用位置**:
- `src/middleware/auth-middleware.ts` - 路由保护中间件
- `src/app/api/users/*` - 用户管理 API
- `src/app/api/roles/*` - 角色管理 API
- `src/app/api/permissions/*` - 权限管理 API
- `src/app/api/chat/*` - 聊天相关 API

---

### ✅ `crypto.ts`
**作用**: 客户端密码哈希工具

**功能**:
- `hashPasswordWithSHA256()` - 使用 SHA-256 + 固定盐哈希密码
- `isValidSHA256Hash()` - 验证是否为有效的 SHA-256 哈希

**使用场景**:
- 客户端在传输前对密码进行预哈希
- 提供额外的安全层，防止明文密码传输

**使用位置**:
- `src/lib/auth.ts` - 密码格式验证和自动升级
- `src/components/login-form.tsx` - 登录表单
- `src/components/register-form.tsx` - 注册表单
- `src/scripts/manage-user-passwords.ts` - 密码管理脚本
- `src/scripts/generate-password-hash.ts` - 密码哈希生成
- `src/scripts/set-password.ts` - 密码设置脚本

---

### ✅ `utils.ts`
**作用**: 通用工具函数

**功能**:
- `cn()` - Tailwind CSS 类名合并工具（clsx + tailwind-merge）
- `getInitials()` - 从字符串提取首字母（用于头像）
- `formatCurrency()` - 货币格式化

**使用位置**:
- **广泛使用**：所有 UI 组件（52 个文件）
- `src/components/ui/*` - Shadcn UI 组件
- `src/components/sidebar/*` - 侧边栏组件
- `src/app/(main)/cms/layout.tsx` - CMS 布局
- `src/app/(main)/demo/layout.tsx` - Demo 布局

---

### ✅ `theme-utils.ts`
**作用**: 主题切换工具

**功能**:
- `updateThemeMode()` - 切换明暗主题（light/dark）
- `updateThemePreset()` - 切换主题预设

**特性**:
- 禁用过渡动画避免闪烁
- 使用 `requestAnimationFrame` 优化性能

**使用位置**:
- `src/components/sidebar/theme-switcher.tsx` - 主题切换器
- `src/components/sidebar/layout-controls.tsx` - 布局控制

---

### ✅ `layout-utils.ts`
**作用**: 布局控制工具

**功能**:
- `updateContentLayout()` - 切换内容布局（centered/full-width）

**使用位置**:
- `src/components/sidebar/layout-controls.tsx` - 布局控制组件

---

## 🎯 使用建议

### 数据库操作
```typescript
// ❌ 错误：直接使用 Supabase 客户端
import { supabaseAdmin } from '@/lib/supabase-admin'
const { data } = await supabaseAdmin.from('users').select('*')

// ✅ 正确：使用 Service 层
import { getAllUsers } from '@/services/userService'
const users = await getAllUsers()
```

### 认证流程
```typescript
// 1. 客户端：SHA-256 预哈希
import { hashPasswordWithSHA256 } from '@/lib/crypto'
const hashedPassword = await hashPasswordWithSHA256(password)

// 2. 服务端：验证凭证
import { validateCredentials } from '@/lib/auth'
const user = await validateCredentials(email, hashedPassword)

// 3. 服务端：验证 JWT
import { requireAuth } from '@/lib/jwt'
const payload = await requireAuth()
```

### UI 开发
```typescript
// 类名合并
import { cn } from '@/lib/utils'
<div className={cn("base-class", isActive && "active-class")} />

// 头像首字母
import { getInitials } from '@/lib/utils'
<Avatar>{getInitials("John Doe")}</Avatar>  // "JD"
```

## 📝 架构说明

### Supabase 客户端层级
1. **supabase-admin** - 管理员权限，绕过 RLS（仅服务端）
2. **supabase-server** - 服务端客户端，遵守 RLS
3. **supabase-client** - 浏览器客户端，用户会话管理

### 认证架构
- **混合认证**: 自定义 JWT + Supabase Auth
- **密码安全**: SHA-256（客户端）+ bcrypt（服务端）
- **会话管理**: HttpOnly Cookie + SameSite=Strict

### 权限控制
- **JWT Payload** 包含用户权限列表
- **中间件** 验证 JWT 并保护路由
- **API 层** 使用 `requireAuth()` 验证请求

## ⚠️ 安全注意事项

1. **永远不要在客户端使用 `supabase-admin`**
2. **永远不要暴露 `SUPABASE_SERVICE_ROLE_KEY`**
3. **密码必须在客户端先 SHA-256 哈希再传输**
4. **使用 Service 层而不是直接操作数据库**
5. **API 路由必须使用 `requireAuth()` 保护**
