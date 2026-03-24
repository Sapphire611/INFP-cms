# INFP-CMS Skills

这个目录包含了 INFP-CMS 项目的所有技能（skills）。这些技能可以通过 `/skills` 命令调用。

## 📋 可用技能列表

### 1. 用户管理 (user-management)
**文件**: `user-management.md`
**功能**:
- 列出所有用户
- 重置用户密码
- 创建新用户
- 启用/禁用用户
- 查看用户统计

**使用示例**:
```
/skills user-management
```

### 2. 密码管理 (password)
**文件**: `password.md`
**功能**:
- 生成密码 Hash
- 重置用户密码
- 批量重置密码
- 密码策略检查
- 验证密码格式

**使用示例**:
```
/skills password
```

### 3. 数据库管理 (database)
**文件**: `database.md`
**功能**:
- 查询用户数据
- 统计数据概览
- 执行 SQL 查询（只读）
- 数据库健康检查
- 备份数据

**使用示例**:
```
/skills database
```

### 4. Vercel 部署 (deploy)
**文件**: `deploy.md`
**功能**:
- 触发部署
- 检查环境变量
- 更新环境变量
- 查看部署历史
- 回滚部署
- 检查构建状态

**使用示例**:
```
/skills deploy
```

### 5. 问题排查 (troubleshoot)
**文件**: `troubleshoot.md`
**功能**:
- 诊断登录问题
- 诊断数据库连接问题
- 诊断构建错误
- 诊断密码加密问题
- 诊断 API 问题
- 检查系统健康

**使用示例**:
```
/skills troubleshoot
```

## 🎯 如何使用技能

1. **列出所有技能**:
   ```
   /skills
   ```

2. **调用特定技能**:
   ```
   /skills <skill-name>
   ```

3. **技能会询问具体操作**:
   - 选择你需要的功能
   - 提供必要的参数
   - 确认后执行

## 📝 技能开发

### 创建新技能

1. 在 `.claude/skills/` 目录创建新的 Markdown 文件
2. 添加 frontmatter 元数据：
   ```markdown
   ---
   description: 技能描述
   ---
   ```
3. 编写技能文档，包括：
   - 功能描述
   - 使用方法
   - 参数说明
   - 注意事项

### 技能模板

```markdown
---
description: 简短描述技能的功能
---

# 技能名称

详细的技能描述...

## 可用操作

### 操作1
描述和参数...

### 操作2
描述和参数...

## 注意事项
重要提醒...
```

## 🔧 自定义

你可以根据项目需求修改这些技能或创建新技能。技能文件使用 Markdown 格式，支持：

- 标题（# ## ###）
- 列表（- 或 1.）
- 代码块（```）
- 表格
- 粗体（**text**）
- 斜体（*text*）

## 📚 相关资源

- [Claude Code 技能文档](https://docs.anthropic.com/claude-code/skills)
- [INFP-CMS 项目文档](./README.md)
- [密码迁移文档](../PASSWORD_MIGRATION.md)
