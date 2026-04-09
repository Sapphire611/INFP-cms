# RBAC（基于角色的访问控制）实现说明

## 概述

INFP-CMS 已集成完整的 RBAC 系统，通过角色和权限控制用户对 CMS 功能的访问。

## 核心概念

### 1. 用户类型
- **admin**：超级管理员，绕过所有权限检查
- **user**：普通用户，受 RBAC 权限控制
- **wechat_users**：微信用户，无法登录 CMS

### 2. 权限
权限以 `模块:操作` 的格式定义：
- **模块**：`dashboard`、`users`、`wechat_users`、`chat`、`threejs`
- **操作**：`view`、`create`、`update`、`delete`

示例：`users:view`、`dashboard:view`、`users:create`

### 3. 角色
角色是权限的命名集合。默认角色：
- **super_admin**：拥有所有权限
- **editor**：可查看、创建、更新（无删除权限）
- **viewer**：仅可查看
- **user_manager**：对用户和微信用户模块拥有完整权限

### 4. 用户-角色分配
用户可分配多个角色，其有效权限为所有角色权限的并集。

## 数据库结构

### 数据表说明

这 6 张表/视图分两类：**实体表**（存真实数据）、**关联表**（存关系）和**视图**（只读查询）。

#### 实体表

| 表 | 作用 |
|---|---|
| `permissions` | 所有原子权限，格式 `module:action`，如 `users:view` |
| `roles` | 角色定义，如 `editor`、`viewer` |

#### 关联表（多对多）

| 表 | 作用 |
|---|---|
| `role_permissions` | 角色 ↔ 权限 的绑定关系 |
| `user_roles` | 用户 ↔ 角色 的绑定关系 |

#### 视图（只读，调试用）

| 视图 | 作用 |
|---|---|
| `role_permissions_view` | 展开每个角色拥有哪些权限，方便肉眼查看 |
| `user_permissions_view` | 展开每个用户最终拥有哪些权限，方便调试 |

##### `role_permissions_view` — 角色维度

```sql
roles
  LEFT JOIN role_permissions  -- 找到角色绑定的权限关系
  LEFT JOIN permissions        -- 展开权限的 module + action
```

查询结果示例：

| role_name | module | action | permission_description |
|---|---|---|---|
| editor | users | view | 查看用户列表 |
| editor | users | create | 创建新用户 |
| viewer | users | view | 查看用户列表 |

用途：快速确认某个角色到底有哪些权限。

##### `user_permissions_view` — 用户维度

```sql
users
  LEFT JOIN user_roles         -- 找到用户绑定的角色
  LEFT JOIN roles              -- 展开角色名
  LEFT JOIN role_permissions   -- 找到角色绑定的权限关系
  LEFT JOIN permissions        -- 展开权限的 module + action
```

查询结果示例：

| username | role_name | module | action |
|---|---|---|---|
| alice | editor | users | view |
| alice | editor | users | create |
| alice | viewer | dashboard | view |

用途：调试某个用户最终拥有哪些权限，一条 SQL 看全。

> 两个视图均使用 `LEFT JOIN`，没有角色/权限的用户或角色也会出现在结果中（对应字段为 NULL），不会被过滤掉。

### 数据流向

```
permissions          roles
    │                  │
    └──── role_permissions ────┘
                 │
                 ▼
              user_roles  ←── users
                 │
                 ▼
         用户的有效权限
       （所有角色权限的并集）
```

**完整查询链路**（以"用户能否访问 `/cms/users`"为例）：

```
1. users            → 找到该用户的 id
2. user_roles       → 查出该用户绑定了哪些 role_id
3. role_permissions → 查出这些角色绑定了哪些 permission_id
4. permissions      → 查出权限的 module + action
5. 代码判断         → 是否包含 users:view
```

对应 `permissionService.ts` 中的 `getUserPermissions()` 通过一个嵌套 select 一次性完成上述链路。

### 初始化
在 Supabase SQL 编辑器中执行以下脚本：
```bash
supabase/rbac-setup.sql
```

## API 接口

### 角色管理
```
GET    /api/roles           # 获取所有角色
POST   /api/roles           # 创建新角色
GET    /api/roles/[id]      # 获取角色及其权限
PATCH  /api/roles/[id]      # 更新角色（名称、描述、权限列表）
DELETE /api/roles/[id]      # 删除角色
```

### 权限
```
GET    /api/permissions     # 获取所有可用权限
```

### 用户-角色分配
```
GET    /api/users/[id]/roles    # 获取用户已分配的角色
PUT    /api/users/[id]/roles    # 替换用户角色（请求体：{ roleIds: [...] }）
```

所有接口均需要 `admin` 用户类型。

## 代码结构

### 类型定义
`src/types/permission.ts`
- `PermissionModule`、`PermissionAction`、`PermissionKey`
- `Permission`、`Role`、`RoleWithPermissions`
- `ROUTE_PERMISSIONS` — 路由与所需权限的映射

### 服务层
`src/services/permissionService.ts`
- `getUserPermissions(userId)` — 获取用户所有权限
- `hasPermission(userId, userType, module, action)` — 检查特定权限
- `listRoles()`、`createRole()`、`updateRole()`、`deleteRole()`
- `getUserRoles(userId)`、`assignRolesToUser(userId, roleIds)`
- `getBatchUserRoles(userIds)` — 批量获取多个用户的角色
- `listPermissions()` — 获取所有可用权限

### 认证
`src/lib/jwt.ts`
- `JWTPayload` 新增 `permissions: string[]` 字段

`src/app/api/auth/login/route.ts`
- 登录时加载用户权限
- 将权限嵌入 JWT token

### 中间件
`src/middleware/auth-middleware.ts`
- 解析 JWT 并检查路由级权限
- `admin` 用户绕过所有检查
- 未授权用户重定向至 `/dashboard`

## 使用示例

### 1. 为用户分配角色
```typescript
// 为用户分配 "editor" 和 "viewer" 角色
await assignRolesToUser(userId, ['role_editor', 'role_viewer']);
```

### 2. 在 API 路由中检查权限
```typescript
import { requireAuth } from "@/lib/jwt";
import { hasPermission } from "@/services/permissionService";

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();

  const canDelete = await hasPermission(
    auth.id,
    auth.userType,
    'users',
    'delete'
  );

  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ... 执行删除操作
}
```

### 3. 创建自定义角色
```typescript
// 获取 users 模块的所有权限 ID
const allPermissions = await listPermissions();
const userPermissions = allPermissions
  .filter(p => p.module === 'users')
  .map(p => p.id);

// 创建 "用户管理员" 角色
await createRole(
  'user_admin',
  '仅可管理用户',
  userPermissions
);
```

### 4. 前端权限检查
登录响应中包含用户权限列表：
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});

const { user } = await response.json();
// user.permissions = ['dashboard:view', 'users:view', ...]

// 根据权限显示/隐藏 UI 元素
const canCreateUser = user.permissions.includes('users:create');
```

## 路由保护

中间件根据 `ROUTE_PERMISSIONS` 自动保护路由：

```typescript
// src/types/permission.ts
export const ROUTE_PERMISSIONS: Record<string, PermissionKey> = {
  '/cms/dashboard': 'dashboard:view',
  '/cms/users': 'users:view',
  '/cms/wechat-users': 'wechat_users:view',
  '/demo/chat': 'chat:view',
  '/demo/threejs': 'threejs:view',
};
```

添加新的受保护路由：
1. 在 `ROUTE_PERMISSIONS` 中添加路由
2. 确保数据库中存在对应权限
3. 中间件将自动执行权限检查

## 管理员绕过机制

`userType: "admin"` 的用户绕过所有权限检查：
- 中间件放行所有路由
- `hasPermission()` 始终返回 `true`
- 管理员无需分配角色或权限

## 迁移说明

### 现有用户
执行 RBAC 初始化 SQL 后：
1. 所有现有用户默认无角色
2. `admin` 用户继续正常使用（绕过 RBAC）
3. `user` 类型用户需分配角色才能访问 CMS 功能

### 初始角色分配
```sql
-- 为所有现有 'user' 类型用户分配 'viewer' 角色
INSERT INTO user_roles (user_id, role_id)
SELECT id, 'role_viewer'
FROM users
WHERE user_type = 'user'
ON CONFLICT DO NOTHING;
```

## 安全注意事项

1. **管理员权限较大**：绕过所有检查，请谨慎使用。
2. **JWT 包含权限信息**：权限缓存在 JWT 中，角色变更后用户需重新登录。
3. **服务角色密钥**：`permissionService` 使用 `supabaseAdmin` 绕过 RLS，请妥善保管服务角色密钥。
4. **API 路由保护**：所有 API 路由均应调用 `requireAuth()` 并检查权限。
5. **前端检查仅为 UX**：权限校验必须在后端执行。

## 待办事项

- [ ] 添加权限缓存（Redis）以减少数据库查询
- [ ] 添加角色/权限变更的审计日志
- [ ] 添加权限刷新接口（无需重新登录）
- [ ] 支持权限继承（角色层级）
- [ ] 支持资源级权限（如"仅可编辑自己的内容"）
