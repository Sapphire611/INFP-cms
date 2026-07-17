# INFP-CMS

一个基于 Next.js 15、Supabase 和 Shadcn UI 构建的现代化内容管理系统，集成 CMS 用户管理、微信用户管理、RBAC 权限控制和 Three.js 可视化 demo。

## ✨ 核心特性

- 🔐 **混合认证系统** - 自定义 JWT + Supabase Auth，支持 CMS 用户和微信用户
- 👥 **双用户体系** - CMS 管理员/普通用户 + 微信小程序用户
- 🛡️ **RBAC 权限控制** - 基于 `module:action` 的细粒度权限管理
- 📊 **数据可视化** - 仪表盘统计、用户增长图表（Recharts）
- 🎨 **现代 UI** - Shadcn UI + Radix UI + Tailwind CSS v4
- 🌙 **主题系统** - 多主题预设 + 深色模式
- 🎯 **Three.js Demo** - BGA/IC/PCB 板渲染等 R3F 可视化案例
- 📱 **响应式设计** - 移动端优化

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret

# 密码加密（前端 SHA-256 salt）
NEXT_PUBLIC_PASSWORD_SALT=your_password_salt
```

### 3. 初始化数据库

在 Supabase Dashboard 中执行 `supabase-setup.sql` 创建表结构和测试用户。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`，使用测试账户登录。

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # 受保护路由（需登录）
│   │   └── dashboard/     # CMS 后台页面
│   ├── (external)/        # 公开路由（登录页等）
│   └── api/               # API 路由
│       ├── auth/          # 认证接口
│       ├── users/         # CMS 用户管理
│       ├── wechat-users/  # 微信用户管理
│       └── dashboard/     # 仪表盘数据
├── components/
│   ├── ui/                # Shadcn UI 组件
│   └── data-table/        # 可复用数据表格
├── hooks/                 # 自定义 Hooks（usePermissions 等）
├── lib/                   # 核心工具
│   ├── supabase-client.ts # 客户端 Supabase
│   ├── supabase-server.ts # 服务端 Supabase
│   ├── supabase-admin.ts  # 绕过 RLS 的管理员客户端
│   └── auth.ts            # 认证工具（bcrypt、JWT）
├── services/              # 业务逻辑层
│   ├── userService.ts
│   └── wechatUserService.ts
├── stores/                # Zustand 状态管理
└── types/                 # TypeScript 类型定义
```

## 🛠️ 可用脚本

```bash
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run lint             # 运行 ESLint
npm run format           # 格式化代码（Prettier）
npm run format:check     # 检查代码格式


```

## 🔐 认证与权限

### 认证系统

- **CMS 用户**: 自定义 JWT + bcrypt 密码加密（强度 10）
- **微信用户**: openid/unionid 认证
- **会话管理**: HttpOnly Cookie + SameSite=Strict
- **路由保护**: 中间件自动保护 `/dashboard` 路由

### RBAC 权限控制

使用 `usePermissions` hook 进行前端权限控制：

```tsx
const { hasPermission } = usePermissions();
const canCreate = hasPermission("users", "create");

{canCreate && <Button>新增用户</Button>}
```

权限格式：`module:action`（如 `users:create`、`wechat-users:delete`）

**注意**: `admin` 类型自动拥有所有权限。

## 🎨 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| 数据库 | Supabase (PostgreSQL) |
| UI | Shadcn UI + Radix UI + Tailwind CSS v4 |
| 认证 | 自定义 JWT + Supabase Auth |
| 状态管理 | Zustand + React Query |
| 表单 | React Hook Form + Zod |
| 图表 | Recharts |
| 3D 渲染 | React Three Fiber + Three.js |
| 语言 | TypeScript |

## 📚 文档与 Skills

- **CLAUDE.md** - Claude Code 项目指南
- **MIGRATION.md** - Prisma → Supabase 迁移文档
- **.claude/skills/** - 自定义技能库
  - `troubleshoot.md` - 问题排查
  - `r3f.md` - R3F/Three.js 开发规范
  - `rbac.md` - RBAC 权限控制用法
  - `database.md` - 数据库管理
  - `deploy.md` - Vercel 部署

## 🎯 Three.js Demo

项目包含多个 R3F 可视化案例：

- **BGA 封装渲染** - 球栅阵列封装可视化
- **IC 芯片渲染** - 集成电路 3D 模型
- **PCB 板渲染** - 印刷电路板可视化
- **lil-gui 集成** - 实时参数调试

查看 `.claude/skills/r3f.md` 了解开发规范。

## 🚢 部署

项目部署在 Vercel，需配置以下环境变量：

- Supabase 连接信息（URL、Keys）
- JWT_SECRET
- NEXT_PUBLIC_PASSWORD_SALT

健康检查端点：`/api/health`

## 📝 开发规范

1. **数据库操作** - 始终通过 `services/` 层，不直接调用 Supabase
2. **权限控制** - 前端用 `usePermissions`，后端 API 必须同步验证
3. **代码风格** - 遵循 ESLint + Prettier 配置
4. **提交规范** - 使用 Gitmoji（🐞 fix、✨ feat、🦄 refactor 等）

## 🔄 最近更新

- `5b838be` - 清理冗余代码，重构项目结构
- `18fa1e3` - 新增 BGA/IC/BasicIC threejs demo，重构 RBAC 权限控制
- `ad47859` - 修复权限&中间件等问题
- `d13e27f` - 引入 RBAC 权限系统

## 📄 License

Private

---

**INFP的小窝** - 内容管理系统 v2.0.0
