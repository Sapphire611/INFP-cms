---
description: 部署应用到Vercel，包括触发部署、检查状态、配置环境变量等
---

# Vercel 部署技能

帮助将 INFP-CMS 项目部署到 Vercel。

## 可用操作

### 1. 触发部署
创建一个新的提交并推送到远程，触发 Vercel 部署。

**选项**:
- 提交信息（默认："🚀 触发 Vercel 部署"）
- 分支（默认：dev）

**流程**:
1. 检查当前 git 状态
2. 创建空提交或包含更改的提交
3. 推送到指定分支
4. 提供 Vercel Dashboard 链接

### 2. 检查环境变量
检查 Vercel 项目中的环境变量配置。

**必需的环境变量**:
- `DATABASE_URL` - PostgreSQL 连接字符串
- `JWT_SECRET` - JWT 密钥
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥
- `NEXTAUTH_URL` - NextAuth URL
- `NEXTAUTH_SECRET` - NextAuth 密钥
- `WECHAT_APPID` - 微信小程序 AppID（可选）
- `WECHAT_SECRET` - 微信小程序密钥（可选）
- `NEXT_PUBLIC_PASSWORD_SALT` - 密码加密 Salt（重要！）

### 3. 更新环境变量
更新 Vercel 项目中的环境变量。

**参数**:
- 变量名（必填）
- 变量值（必填）
- 环境（Production/Preview/Development，默认：全部）

**注意**:
- 更新环境变量后会自动触发新的部署
- `NEXT_PUBLIC_*` 前缀的变量会在客户端暴露
- 敏感信息不要使用 `NEXT_PUBLIC_*` 前缀

### 4. 查看部署历史
显示最近的部署记录和状态。

**显示信息**:
- 部署时间
- 提交信息
- 部署状态（成功/失败/进行中）
- 部署 URL

### 5. 回滚部署
回滚到之前的某个部署版本。

**参数**:
- 部署 ID 或提交 SHA（必填）

### 6. 检查构建状态
检查当前部署的构建状态和可能的错误。

**检查项目**:
- 构建日志
- 错误信息
- 构建时间
- 部署大小

## 部署前检查清单

在触发部署前，确认以下项目：

- [ ] 所有代码更改已提交
- [ ] 本地构建测试通过 (`npm run build`)
- [ ] 环境变量已正确配置
- [ ] 数据库连接正常
- [ ] 没有 TypeScript 错误
- [ ] 敏感信息未提交到代码库

## 常见问题

### 构建失败
**可能原因**:
- TypeScript 编译错误
- 依赖安装失败
- 环境变量缺失
- 构建超时

**解决方法**:
1. 检查构建日志
2. 本地运行 `npm run build` 测试
3. 验证环境变量配置
4. 检查依赖版本兼容性

### 部署成功但功能异常
**可能原因**:
- 环境变量未更新
- 数据库连接失败
- API 路由错误

**解决方法**:
1. 检查 Vercel 函数日志
2. 验证所有环境变量
3. 测试数据库连接
4. 查看 `/api/health` 端点

## 部署流程

```
1. 代码更改
   ↓
2. Git 提交
   ↓
3. 推送到 GitHub
   ↓
4. Vercel 自动检测
   ↓
5. 构建项目 (npm run build)
   ↓
6. 部署到 CDN
   ↓
7. 完成 ✅
```

## 注意事项

- Vercel 自动部署功能：推送到 main 或 dev 分支会自动触发
- 环境变量更改会自动触发重新部署
- 部署通常需要 2-5 分钟
- 生产环境部署会影响所有用户
- 建议在 Preview 环境测试后再部署到 Production
