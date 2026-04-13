---
description: INFP-CMS 前端 RBAC 权限控制的实现方式和使用规范
---

# RBAC 权限控制技能

本项目前端 RBAC 权限控制的标准实现方式（在 `d13e27f` 提交引入，`ad47859` 修复稳定）。

## 核心机制

权限控制通过 `usePermissions` hook（`src/hooks/use-permissions.ts`）实现：

- 从 `user-info` cookie 读取用户信息（含 `userType` 和 `permissions` 数组）
- `admin` 类型直接返回 `true`，其他类型检查 `module:action` 格式的权限字符串
- 页面中用 `canCreate` / `canUpdate` / `canDelete` 变量控制按钮的条件渲染

## 标准用法

### 1. 按钮权限控制

```tsx
import { usePermissions } from "@/hooks/use-permissions";

function UserManagementPage() {
  const { hasPermission } = usePermissions();
  
  const canCreate = hasPermission("users", "create");
  const canUpdate = hasPermission("users", "update");
  const canDelete = hasPermission("users", "delete");

  return (
    <>
      {canCreate && <Button onClick={handleCreate}>新增用户</Button>}
      {canUpdate && <Button onClick={handleEdit}>编辑</Button>}
      {canDelete && <Button onClick={handleDelete}>删除</Button>}
    </>
  );
}
```

### 2. API 403 处理

fetch 后检查 403 状态，设置 `forbidden` state 显示无权限提示，而不是直接报错：

```tsx
const [forbidden, setForbidden] = useState(false);

const fetchData = async () => {
  const res = await fetch("/api/users");
  
  if (res.status === 403) {
    setForbidden(true);
    return;
  }
  
  // 正常处理...
};

// JSX
{forbidden && <Alert>您没有权限访问此功能</Alert>}
```

## 权限字符串格式

格式：`module:action`

常见模块和操作：
- `users:create` - 创建用户
- `users:update` - 更新用户
- `users:delete` - 删除用户
- `users:read` - 查看用户
- `wechat-users:create` - 创建微信用户
- `wechat-users:update` - 更新微信用户
- `wechat-users:delete` - 删除微信用户

## 用户类型

- `admin` - 管理员，拥有所有权限（hasPermission 直接返回 true）
- `user` - 普通用户，根据 permissions 数组检查权限
- 其他类型无法访问 CMS dashboard

## 应用场景

所有 CMS 管理页面的增删改按钮都应通过此 hook 控制显隐：

- `/dashboard/users` - 用户管理
- `/dashboard/wechat-users` - 微信用户管理
- 未来新增的管理页面

## 注意事项

1. **前端权限控制只是 UI 层面**，后端 API 必须同步验证权限
2. **admin 类型自动拥有所有权限**，无需在 permissions 数组中添加
3. **按钮隐藏不等于功能禁用**，用户仍可能通过 API 直接调用，后端必须校验
4. **403 状态应友好提示**，不要直接抛出错误或跳转登录页

## 相关文件

- `src/hooks/use-permissions.ts` - 权限检查 hook
- `src/middleware/auth-middleware.ts` - 后端权限中间件
- `src/types/user.ts` - 用户类型定义
