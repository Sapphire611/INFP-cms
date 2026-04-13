# Server 服务端操作说明

本目录包含 Next.js Server Actions，用于服务端数据操作和 Cookie 管理。

## 总结

1. ✅ **server-actions.ts** - 6 处使用（布局、主题切换、布局控制）

## 📋 函数列表

### `getUserList(params)`
- 获取分页用户列表
- 当前返回模拟数据（100 条）
- 未在项目中使用

### `getValueFromCookie(key)`
- 从 Cookie 读取指定键的值
- 返回 `string | undefined`

### `setValueToCookie(key, value, options)`
- 设置 Cookie 值
- 默认过期时间：7 天
- 默认路径：`/`

### `getPreference<T>(key, allowed, fallback)`
- 获取用户偏好设置（带类型验证）
- 自动验证值是否在允许列表中
- 不合法时返回默认值
- **使用位置**：布局组件、主题切换器、布局控制（6 处）
