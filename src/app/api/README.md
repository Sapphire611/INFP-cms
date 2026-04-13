# API Routes

INFP-CMS 后端 API 接口文档。

## 认证模块 (`/api/auth`)

### `POST /api/auth/login`
CMS 用户登录接口。
- 请求体：`{ email, password }`
- 返回：JWT token + 用户信息
- 调用方：`src/components/login-form.tsx`

### `POST /api/auth/logout`
用户登出接口。
- 清除 auth-token 和 user-info cookies
- 调用方：`src/hooks/use-auth.ts`

### `POST /api/auth/wechat-login`
微信用户登录接口（小程序端）。
- 请求体：`{ code }` - 微信授权码
- 返回：JWT token + 微信用户信息

### `POST /api/auth/wechat-bind`
微信用户绑定手机号接口。
- 请求体：`{ code, encryptedData, iv }`
- 返回：绑定结果

### `POST /api/auth/wechat-phone`
微信手机号快速登录接口。
- 请求体：`{ code }`
- 返回：JWT token + 用户信息

---

## 用户管理模块 (`/api/users`)

### `GET /api/users`
获取用户列表（分页、搜索、筛选）。
- 查询参数：`page`, `pageSize`, `search`, `userType`, `isActive`
- 返回：用户列表 + 分页信息
- 调用方：`src/app/(main)/cms/users/page.tsx`

### `POST /api/users`
创建新用户。
- 请求体：`{ email, password, name, userType }`
- 调用方：`src/components/register-form.tsx`, `src/app/(main)/cms/users/_components/add-user-dialog.tsx`

### `GET /api/users/[id]`
获取单个用户详情。

### `PATCH /api/users/[id]`
更新用户信息。
- 请求体：`{ name?, email?, userType?, isActive? }`
- 调用方：`src/app/(main)/cms/users/_components/edit-user-dialog.tsx`, `src/app/(main)/cms/users/_components/user-actions.tsx`

### `DELETE /api/users/[id]`
删除用户。
- 调用方：`src/app/(main)/cms/users/_components/user-actions.tsx`

### `GET /api/users/[id]/roles`
获取用户的角色列表。
- 调用方：`src/app/(main)/cms/users/_components/edit-user-dialog.tsx`

### `PUT /api/users/[id]/roles`
更新用户的角色分配。
- 请求体：`{ roleIds: string[] }`
- 调用方：`src/app/(main)/cms/users/_components/edit-user-dialog.tsx`

### `GET /api/users/stats`
获取用户统计数据。
- 返回：总数、活跃数、类型分布等
- 调用方：`src/app/(main)/demo/threejs/_components/request/get-user-stats.ts`

### `GET /api/users/stats/growth`
获取用户增长趋势数据。
- 返回：按日期统计的新增用户数
- 调用方：`src/app/(main)/demo/threejs/_components/chart-user-growth.tsx`

---

## 微信用户管理模块 (`/api/wechat-users`)

### `GET /api/wechat-users`
获取微信用户列表（分页、搜索）。
- 查询参数：`page`, `pageSize`, `search`
- 调用方：`src/app/(main)/cms/wechat-users/page.tsx`

### `POST /api/wechat-users`
创建微信用户（手动添加）。
- 请求体：`{ profileName, profilePhone, openid?, unionid? }`
- 调用方：`src/app/(main)/cms/wechat-users/_components/add-wechat-user-dialog.tsx`

### `GET /api/wechat-users/[id]`
获取单个微信用户详情。

### `PATCH /api/wechat-users/[id]`
更新微信用户信息。
- 请求体：`{ profileName?, profilePhone?, isActive? }`
- 调用方：`src/app/(main)/cms/wechat-users/_components/edit-wechat-user-dialog.tsx`

### `DELETE /api/wechat-users/[id]`
删除微信用户。
- 调用方：`src/app/(main)/cms/wechat-users/page.tsx`

---

## 角色权限模块 (`/api/roles`, `/api/permissions`)

### `GET /api/roles`
获取所有角色列表。
- 调用方：`src/app/(main)/cms/roles/page.tsx`, `src/app/(main)/cms/users/_components/edit-user-dialog.tsx`

### `POST /api/roles`
创建新角色。
- 请求体：`{ name, description, permissionIds }`
- 调用方：`src/app/(main)/cms/roles/_components/role-dialog.tsx`

### `GET /api/roles/[id]`
获取单个角色详情（含权限列表）。
- 调用方：`src/app/(main)/cms/roles/page.tsx`

### `PATCH /api/roles/[id]`
更新角色信息。
- 请求体：`{ name?, description?, permissionIds? }`
- 调用方：`src/app/(main)/cms/roles/_components/role-dialog.tsx`

### `DELETE /api/roles/[id]`
删除角色。
- 调用方：`src/app/(main)/cms/roles/page.tsx`

### `GET /api/permissions`
获取所有权限列表。
- 调用方：`src/app/(main)/cms/roles/page.tsx`

---

## 仪表盘统计模块 (`/api/dashboard`)

### `GET /api/dashboard/stats`
获取仪表盘核心统计数据。
- 返回：用户总数、微信用户总数、活跃用户数等
- 调用方：`src/app/(main)/cms/dashboard/_components/stats-cards.tsx`, `src/app/(main)/demo/threejs/_components/section-cards.tsx`

### `GET /api/dashboard/distribution`
获取用户类型分布数据。
- 返回：各类型用户数量统计
- 调用方：`src/app/(main)/cms/dashboard/_components/user-distribution-chart.tsx`

### `GET /api/dashboard/growth`
获取用户增长趋势数据。
- 查询参数：`period` (7d/30d/90d)
- 返回：按日期统计的增长数据
- 调用方：`src/app/(main)/cms/dashboard/_components/growth-trend-chart.tsx`

### `GET /api/dashboard/activity`
获取用户活动统计数据。
- 返回：按时间段统计的活跃用户数
- 调用方：`src/app/(main)/cms/dashboard/_components/activity-chart.tsx`

### `GET /api/dashboard/recent-activity`
获取最近活动记录。
- 返回：最近的用户操作日志
- 调用方：`src/app/(main)/cms/dashboard/_components/recent-activity.tsx`

---

## 聊天模块 (`/api/chat`)

### `POST /api/chat`
发送聊天消息（流式响应）。
- 请求体：`{ conversationId?, message }`
- 返回：Server-Sent Events (SSE) 流
- 调用方：`src/stores/chat/chat-store.ts`

### `GET /api/chat/conversations`
获取会话列表。
- 调用方：`src/stores/chat/chat-store.ts`

### `POST /api/chat/conversations`
创建新会话。
- 请求体：`{ title }`
- 调用方：`src/stores/chat/chat-store.ts`

### `DELETE /api/chat/conversations/[id]`
删除会话。
- 调用方：`src/stores/chat/chat-store.ts`

---

## 健康检查 (`/api/health`)

### `GET /api/health`
系统健康检查接口。
- 返回：`{ status: "ok" }`
- 用于监控和部署验证

---

## 认证与权限

- **CMS 用户**：通过 JWT token (cookie: `auth-token`) 认证
- **微信用户**：通过 Bearer token (Authorization header) 认证
- **权限控制**：基于 RBAC，中间件检查路由权限（见 `src/middleware/auth-middleware.ts`）
- **Admin 用户**：绕过所有权限检查

## 数据层

所有接口通过 Service 层操作数据库：
- `src/services/userService.ts` - CMS 用户操作
- `src/services/wechatUserService.ts` - 微信用户操作
- 使用 Supabase Client 进行数据库查询
