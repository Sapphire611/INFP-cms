---
description: 管理Supabase数据库，包括查询、更新、迁移等操作
---

# 数据库管理技能

帮助管理 INFP-CMS 系统的 Supabase 数据库。

## 可用操作

### 1. 查询用户数据
从数据库中查询用户信息。

**参数**:
- 查询条件（可选）：邮箱、用户名、用户类型等
- 输出格式：表格或 JSON

### 2. 统计数据概览
显示数据库的统计信息：
- 用户总数
- 活跃用户数
- 微信用户数
- 最近注册用户

### 3. 执行 SQL 查询
在 Supabase 数据库中执行自定义 SQL 查询。

**参数**:
- SQL 语句（必填）

**警告**: 仅限 SELECT 查询，禁用修改数据的操作。

### 4. 数据库健康检查
检查数据库连接和状态：
- 连接状态
- 表结构完整性
- 索引状态
- 数据一致性

### 5. 备份数据
导出关键数据到本地文件。

**选项**:
- 用户数据
- 微信用户数据
- 会话数据
- 全部数据

## 数据库结构

### users 表
```sql
- id: UUID (主键)
- username: VARCHAR
- email: VARCHAR (唯一)
- password: VARCHAR (bcrypt hash)
- user_type: VARCHAR ('admin' | 'user')
- profile_name: VARCHAR
- profile_phone: VARCHAR
- profile_avatar: VARCHAR
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### wechat_users 表
```sql
- id: UUID (主键)
- openid: VARCHAR (唯一)
- unionid: VARCHAR (可选)
- profile_name: VARCHAR
- profile_phone: VARCHAR
- wechat_nickname: VARCHAR
- wechat_avatar_url: VARCHAR
- is_active: BOOLEAN
- last_login_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## 常用查询

### 查找活跃管理员
```sql
SELECT * FROM users
WHERE user_type = 'admin' AND is_active = true;
```

### 查找最近7天注册的用户
```sql
SELECT * FROM users
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### 统计用户类型分布
```sql
SELECT
  user_type,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM users
GROUP BY user_type;
```

## 注意事项

- 所有查询操作都是只读的
- 修改数据操作需要使用专门的用户管理技能
- 执行 SQL 前会显示语句并要求确认
- 敏感数据（密码）不会显示在查询结果中
