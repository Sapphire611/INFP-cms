# Hooks 使用说明

本目录包含项目中使用的自定义 React Hooks。

## 📋 Hooks 列表

### ✅ `use-auth.ts`
**作用**: 用户认证管理 Hook

**功能**:
- 从 cookie 中读取用户信息（`user-info`）
- 提供用户登录状态（`isAuthenticated`）
- 提供登出功能（`logout`）
- 自动处理用户信息的解析和状态管理

**返回值**:
```typescript
{
  user: User | null,           // 当前用户信息
  loading: boolean,            // 加载状态
  logout: () => Promise<void>, // 登出函数
  isAuthenticated: boolean     // 是否已认证
}
```

**使用位置**:
- `src/components/sidebar/nav-user.tsx` - 侧边栏用户信息显示
- `src/components/sidebar/account-switcher.tsx` - 账户切换组件

---

### ✅ `use-permissions.ts`
**作用**: RBAC 权限控制 Hook

**功能**:
- 从 cookie 中读取用户权限信息
- 提供权限检查函数 `hasPermission(module, action)`
- Admin 用户自动拥有所有权限
- 普通用户根据 `permissions` 数组判断

**返回值**:
```typescript
{
  hasPermission: (module: string, action: string) => boolean
}
```

**使用位置**:
- `src/app/(main)/cms/roles/page.tsx` - 角色管理页面
- `src/app/(main)/cms/users/page.tsx` - 用户管理页面
- `src/app/(main)/cms/users/_components/user-actions.tsx` - 用户操作按钮
- `src/app/(main)/cms/wechat-users/page.tsx` - 微信用户管理页面

**使用示例**:
```typescript
const { hasPermission } = usePermissions();
const canCreate = hasPermission('users', 'create');
```

---

### ✅ `use-mobile.ts`
**作用**: 响应式布局检测 Hook

**功能**:
- 检测当前设备是否为移动端（宽度 < 768px）
- 监听窗口大小变化，自动更新状态
- 使用 `matchMedia` API 实现高性能监听

**返回值**:
```typescript
boolean // true 表示移动端，false 表示桌面端
```

**使用位置**:
- `src/components/ui/sidebar.tsx` - 侧边栏响应式显示
- `src/app/(main)/demo/threejs/_components/table-cell-viewer.tsx` - 表格单元格查看器

---

### ✅ `use-data-table-instance.ts`
**作用**: 数据表格实例管理 Hook

**功能**:
- 封装 `@tanstack/react-table` 的配置和状态管理
- 提供行选择、列可见性、列过滤、排序、分页等功能
- 支持服务端分页（通过 `meta.pagination` 传入总记录数）
- 自动处理行 ID 生成逻辑

**参数**:
```typescript
{
  data: TData[],                    // 表格数据
  columns: ColumnDef<TData, TValue>[], // 列定义
  enableRowSelection?: boolean,     // 是否启用行选择
  defaultPageIndex?: number,        // 默认页码
  defaultPageSize?: number,         // 默认每页条数
  getRowId?: (row, index) => string, // 自定义行 ID 获取函数
  meta?: TableMeta                  // 元数据（包含分页信息）
}
```

**使用位置**:
- `src/app/(main)/cms/users/page.tsx` - 用户管理表格
- `src/app/(main)/demo/threejs/_components/data-table.tsx` - Demo 数据表格

---

## 🎯 使用建议

1. **认证相关**: 使用 `useAuth` 获取用户信息和登出功能
2. **权限控制**: 使用 `usePermissions` 进行按钮/功能的权限判断
3. **响应式布局**: 使用 `useIsMobile` 判断移动端/桌面端
4. **数据表格**: 使用 `useDataTableInstance` 快速创建功能完整的数据表格

## 📝 注意事项

- 所有 hooks 都标记为 `"use client"`，仅在客户端组件中使用
- `useAuth` 和 `usePermissions` 依赖 `user-info` cookie
- `useDataTableInstance` 支持服务端分页，需要传入 `meta.pagination.totalRows`
