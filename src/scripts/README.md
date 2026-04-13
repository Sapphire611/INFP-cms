# Scripts 脚本说明

本目录包含项目的数据库管理和工具脚本。

## 总结

1. ✅ **generate-theme-presets.ts** - 在 package.json 中使用（`npm run generate:presets`）
2. ✅ **manage-user-passwords.ts** - 在 package.json 中使用（`npm run users:list`, `npm run users:reset`）
3. ⚠️ **generate-password-hash.ts** - 工具脚本，文档中有引用但未在代码中使用
4. ⚠️ **set-password.ts** - 工具脚本，文档中有引用但未在代码中使用
5. ⚠️ **generate-hash-standalone.ts** - 工具脚本，文档中有引用但未在代码中使用

## 📋 脚本列表

### ✅ `generate-theme-presets.ts`
**作用**: 自动生成主题预设配置

**功能**:
- 扫描 `/styles/presets` 目录下的 CSS 文件
- 提取主题的 `label`、`value` 和主色调（`--primary`）
- 从 `/app/globals.css` 获取默认主题颜色
- 将提取的元数据注入到 `/types/preferences/theme.ts` 文件

**使用方式**:
```bash
npm run generate:presets
```

**使用场景**:
- 添加新主题预设后手动运行
- Husky pre-push hook 自动执行
- 可选：集成到构建步骤

**注意事项**:
- 每个新 CSS 预设必须包含 `label:` 和 `value:` 注释
- 必须定义 `--primary` 变量（light 和 dark 模式）

---

### ⚠️ `generate-password-hash.ts`
**作用**: 生成密码哈希用于手动数据库更新

**功能**:
- 模拟前端 SHA-256 哈希
- 生成后端 bcrypt 哈希
- 输出可直接用于数据库的 SQL 语句

**使用方式**:
```bash
npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/generate-password-hash.ts <password>
```

**输出示例**:
```
Step 1 - SHA-256 Hash (frontend):
abc123...

Step 2 - Bcrypt Hash (store this in DB):
$2a$10$...

✅ Copy the Bcrypt Hash above and update your database:
   UPDATE users SET password = '$2a$10$...' WHERE email = 'liuliyi611@qq.com';
```

**使用场景**:
- 手动创建用户时生成密码哈希
- 调试密码验证问题
- 文档参考：`docs/PASSWORD_MIGRATION.md`

---


---

### ⚠️ `generate-hash-standalone.ts`
**作用**: 独立的密码哈希生成器

**功能**:
- 不依赖项目其他模块
- 使用固定盐值生成 SHA-256 哈希
- 生成 bcrypt 哈希
- 输出 SQL 更新语句

**使用方式**:
```bash
npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/generate-hash-standalone.ts <password>
```

**特点**:
- 完全独立，可单独运行
- 硬编码盐值：`infp-cms-fixed-salt-2024`
- 与 `generate-password-hash.ts` 功能类似但更独立

**使用场景**:
- 在没有完整项目环境时生成密码哈希
- 文档参考：`docs/PASSWORD_MIGRATION.md`

---
**作用**: JavaScript 版本的密码哈希生成器

**问题**:
- 与 `src/scripts/generate-password-hash.ts` 功能重复
- 硬编码密码 `123456`
- 不在 TypeScript 项目结构中

**替代方案**:
- 使用 `src/scripts/generate-password-hash.ts`

---

## 🎯 使用建议

### 日常开发
```bash
# 添加新主题后生成预设
npm run generate:presets

# 查看所有用户
npm run users:list
```

### 密码管理
```bash
# 推荐：使用管理工具重置密码
npm run users:reset <user-id> <new-password>

# 或：快速设置单个用户密码
npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/set-password.ts <email> <password>

# 或：仅生成哈希（手动更新数据库）
npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" src/scripts/generate-password-hash.ts <password>
```

### 密码迁移
参考文档：`docs/PASSWORD_MIGRATION.md`

## 📝 密码安全架构

所有密码管理脚本遵循统一的安全策略：

1. **客户端**: SHA-256 哈希（使用固定盐）
2. **服务端**: bcrypt 哈希（强度 10）
3. **存储**: 双重哈希结果

**盐值**: `infp-cms-fixed-salt-2024`（来自环境变量或默认值）

## ⚠️ 安全注意事项

1. **永远不要在生产环境使用 `reset-all` 命令**
2. **密码脚本仅在服务端运行**
3. **确保 `.env` 文件中的 `SUPABASE_SERVICE_ROLE_KEY` 安全**
4. **生成的密码哈希包含敏感信息，不要提交到版本控制**
5. **使用这些脚本需要管理员权限**
