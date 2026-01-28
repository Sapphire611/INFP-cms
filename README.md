# 通用 CMS 系统 (Generic CMS)

一个基于 Next.js 15、Shadcn UI 和 MongoDB 构建的现代化通用 CMS 内容管理系统。

## 功能特性

- 👥 **用户管理** - 管理员和普通用户账户管理
- 🔍 **智能搜索** - 用户信息快速检索
- 📊 **数据分析** - 仪表盘统计、用户增长图表
- 🔐 **权限管理** - 管理员和用户登录，账户启用/禁用
- 📱 **响应式设计** - 支持所有设备，优化移动端体验
- 🌙 **深色模式** - 内置主题切换
- 🎯 **TypeScript** - 完整的类型安全
- 🎨 **现代界面** - 全新的登录页面设计，左右分栏布局

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

确保 MongoDB 正在运行，并创建 `.env` 文件：

```env
# 数据库配置
MONGODB_URI="mongodb://localhost:27017/jxrays"

# 认证配置
JWT_SECRET="your-secret-key-here"
```

### 3. 初始化数据库

```bash
npm run init-db
```

这将创建测试用户（管理员）。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000` 开始使用。

## 系统架构

### 数据库连接

系统采用**持久连接 + 连接池**架构：

- ✅ **服务启动时建立连接** - 应用启动即连接数据库并保持
- ✅ **连接池管理** - 2-10 个连接复用，提升性能
- ✅ **自动重连** - 断线自动重连，无需人工干预
- ✅ **全局缓存** - 所有 API 路由共享同一连接
- ✅ **健康监控** - 访问 `/api/health` 查看连接状态

```bash
# 启动时会看到以下日志
🔄 Attempting to connect to MongoDB...
✅ MongoDB connection opened successfully
✅ MongoDB: Connection established
🚀 MongoDB: Initial connection successful
```

连接配置 (src/lib/mongoose.ts):
- `maxPoolSize: 10` - 最大 10 个连接
- `minPoolSize: 2` - 保持 2 个最小连接
- `retryWrites: true` - 自动重试写入
- `retryReads: true` - 自动重试读取

### 用户类型

1. **管理员 (Admin)**
   - 可登录CMS后台
   - 完整的系统管理权限
   - 用户管理

2. **普通用户 (User)**
   - 可登录CMS后台（需账户启用）
   - 基本的系统访问权限

### 认证系统

- **登录限制**: 仅启用的管理员和教师可登录
- **会话管理**: 基于 JWT 的 Cookie 会话
- **路由保护**: 中间件自动保护后台路由
- **安全登出**: 清除 Cookie 和会话数据

### 项目结构

```
src/
├── app/                           # Next.js App Router
│   ├── api/                      # API 路由
│   │   ├── auth/                # 认证相关 API
│   │   ├── users/               # 用户管理 API
│   │   ├── wechat-users/        # 微信用户管理 API
│   │   └── dashboard/          # 仪表盘数据 API
│   └── (main)/dashboard/        # 后台页面
│       ├── default/             # 仪表盘
│       └── users/               # 用户管理
├── components/                   # 可复用 UI 组件
├── hooks/                        # 自定义 React Hooks
├── lib/                          # 工具函数和配置
├── middleware/                   # 认证中间件
├── models/                       # Mongoose 数据模型
│   ├── user.ts                  # 用户模型
│   ├── wechatUser.ts            # 微信用户模型
│   └── session.ts               # 会话模型
├── navigation/                   # 导航配置
└── types/                        # TypeScript 类型定义
```

## 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint
- `npm run format` - 格式化代码
- `npm run format:check` - 检查代码格式
- `npm run init-db` - 初始化数据库（创建测试用户）
- `npm run migrate:parents` - 迁移旧的家长数据到新模型

## 技术栈

- **框架**: Next.js 15 (App Router)
- **UI 库**: Shadcn UI + Radix UI
- **数据库**: MongoDB
- **ODM**: Mongoose
- **认证**: JWT + Cookie-based sessions
- **样式**: Tailwind CSS
- **状态管理**: Zustand + React Query
- **表单**: React Hook Form + Zod
- **图表**: Recharts
- **语言**: TypeScript

## 用户界面亮点

### 🔍 智能搜索功能

- **用户管理**: 支持按用户名、姓名或邮箱搜索用户
- **实时筛选**: 支持按用户类型、状态等条件筛选
- **快捷操作**: 支持 Enter 键快速搜索

### 🎨 现代化登录页面

- **分栏设计**: 左侧品牌展示区，右侧登录表单
- **功能介绍**: 左侧展示系统核心功能和优势
- **响应式布局**: 移动端自动调整为垂直布局
- **视觉优化**: 渐变色背景、流畅动画、现代配色

### 📊 数据表格

- **可排序**: 支持按各列排序
- **分页**: 自定义每页显示数量
- **列控制**: 可自定义显示/隐藏列
- **批量操作**: 支持批量选择和操作

### 🔐 权限控制

- **角色区分**: 管理员、普通用户两种角色
- **登录限制**: 只有启用的账户可登录 CMS
- **操作保护**: 删除操作前进行二次确认

## 微信用户系统

系统支持微信用户管理，可通过微信小程序登录。

### 核心特性

- ✅ 微信用户数据模型（WechatUser model）
- ✅ 微信小程序登录（openid/unionid）
- ✅ 完整的微信用户管理界面（增删改查）

## 开发指南

### 添加新功能

1. 在 `src/models/` 中创建数据模型
2. 在 `src/app/api/` 中创建 API 路由
3. 在 `src/app/(main)/dashboard/` 中创建页面
4. 在 `src/navigation/sidebar/` 中添加导航项

### 代码规范

- 使用 ESLint 和 Prettier 保持代码风格一致
- 遵循 TypeScript 最佳实践
- 组件使用 "use client" 指令（客户端组件）
- 数据库连接通过中间件自动管理（无需在 API 路由中手动连接）

## 安全注意事项

### 密码和认证
- ✅ 所有密码使用 bcrypt 加密（强度 10）
- ✅ JWT_SECRET 必须设置为强密码（建议 32+ 字符）
- ✅ JWT Token 包含过期时间（默认 24 小时）
- ✅ Cookie 使用 HttpOnly 和 SameSite=Strict

### 权限控制
- ✅ 家长账户不能登录 CMS 后台
- ✅ 只有启用的账户（isActive: true）可以登录
- ✅ 中间件自动保护所有 /dashboard 路由
- ✅ API 路由验证用户身份和权限

### 数据保护
- ✅ 删除操作前进行关联检查（如家长关联学生时不能删除）
- ✅ 输入验证使用 Zod schema
- ✅ API 响应不包含敏感信息（如密码哈希）
- ✅ 微信 openid 安全存储和验证

## 故障排除

### 登录问题

**问题**: 无法登录 CMS
- 检查账户是否已启用（`isActive: true`）
- 确认用户类型是 admin 或 user
- 验证邮箱和密码是否正确
- 检查浏览器 Cookie 是否被禁用

### 数据库问题

**问题**: 连接 MongoDB 失败
- 确认 MongoDB 服务正在运行
- 检查 `.env` 中的 `MONGODB_URI` 是否正确
- 验证数据库权限设置
- 访问 `http://localhost:3000/api/health` 查看连接状态

**问题**: 找不到用户数据
- 运行 `npm run init-db` 创建测试用户
- 检查数据库连接是否正常
- 使用健康检查 API: `curl http://localhost:3000/api/health`

**问题**: API 返回 503 错误
- 检查数据库是否正常运行
- 查看服务器日志中的数据库连接错误
- 数据库会自动重连，稍等片刻后重试

## 路线图

- [ ] 图片上传功能
- [ ] 实时消息推送
- [ ] Excel 数据导入导出
- [ ] 多语言支持
- [ ] 移动端原生应用

## 许可证

MIT License
