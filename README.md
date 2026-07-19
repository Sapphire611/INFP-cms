# Sapphire Studio — AI 工作站

基于 Next.js 16、Supabase 和 Shadcn UI 构建的 AI 工作站，集成了 CMS 用户管理、微信用户管理、RBAC 权限控制、AI 智能对话（DeepSeek + 流式输出）、数据分析看板和 Three.js 可视化。

## 核心特性

- **AI 智能对话** — DeepSeek 驱动，SSE 流式输出，支持联网搜索、天气查询、数学计算、时间查询等工具调用
- **Agent 系统** — 多 Agent 配置（Sapphire AI / 深度思考），独立的 system prompt 和工具开关
- **对话管理** — 多轮对话持久化、对话摘要（20 条触发）、Markdown 渲染
- **联网搜索** — Bing 主搜索 + DuckDuckGo 降级，零 API Key 依赖
- **混合认证** — 自定义 JWT + bcrypt，支持 CMS 用户和微信小程序用户
- **RBAC 权限控制** — 基于 `module:action` 的细粒度权限管理
- **数据可视化** — 仪表盘统计、用户增长图表（Recharts）
- **现代 UI** — Shadcn UI + Radix UI + Tailwind CSS v4 + 多主题预设
- **Three.js Demo** — BGA/IC/PCB 板渲染等 R3F 可视化案例
- **响应式设计** — 移动端优化

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```env
# DeepSeek AI
DEEPSEEK_API_KEY=your_deepseek_api_key
# DEEPSEEK_BASE_URL=https://api.deepseek.com/v1  # 可选，默认值

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret
```

### 3. 初始化数据库

在 Supabase Dashboard 中执行 `supabase-setup.sql` 创建表结构和测试用户。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`，使用测试账户登录。

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── auth/              # 认证接口
│   │   ├── users/             # CMS 用户管理
│   │   ├── wechat/            # 微信接口
│   │   ├── wechat-users/      # 微信用户管理
│   │   ├── chat/              # AI 对话 SSE 流式接口
│   │   │   ├── route.ts       # POST /api/chat — SSE stream
│   │   │   └── conversations/ # 对话 & 消息 CRUD
│   │   ├── dashboard/         # 仪表盘统计
│   │   ├── permissions/       # 权限管理
│   │   └── roles/             # 角色管理
│   ├── (main)/dashboard/      # CMS 后台页面（受保护路由）
│   ├── chat/                  # AI 对话界面 (/chat)
│   ├── mbti/                  # MBTI 页面
│   └── cms/                   # CMS 入口
├── components/
│   ├── ui/                    # Shadcn UI 组件
│   ├── data-table/            # 可复用数据表格
│   ├── chat/                  # 对话组件
│   │   ├── chat-main.tsx      # 消息列表 + 输入
│   │   ├── chat-sidebar.tsx   # Agent 选择 + 对话列表
│   │   ├── chat-input.tsx     # 输入框 + 发送
│   │   ├── chat-message.tsx   # 单条消息渲染
│   │   └── conversation-item.tsx
│   └── sidebar/               # 侧边栏 & 导航
├── config/
│   ├── agents.ts              # Agent 配置（system prompt + 工具开关）
│   └── app-config.ts          # 应用名称、版本
├── hooks/                     # 自定义 Hooks
├── lib/
│   ├── ai-client.ts           # DeepSeek 客户端（createOpenAI 封装）
│   ├── supabase-client.ts     # 浏览器 Supabase
│   ├── supabase-server.ts     # 服务端 Supabase
│   ├── supabase-admin.ts      # 绕过 RLS 的管理员客户端
│   ├── auth.ts                # bcrypt 密码工具
│   └── jwt.ts                 # JWT 签发/验证、requireAuth()
├── middleware/                 # Auth 中间件
├── navigation/                # 侧边栏 & 搜索导航配置
├── services/
│   ├── chatService.ts         # streamText() + SSE + 消息持久化
│   ├── chatTools.ts           # AI 工具定义（搜索/天气/时间/计算）
│   ├── messageService.ts      # 消息 CRUD
│   ├── conversationService.ts # 对话 CRUD
│   ├── summaryService.ts      # 对话摘要（20 条触发）
│   ├── userService.ts         # CMS 用户 CRUD
│   ├── wechatUserService.ts   # 微信用户操作
│   └── permissionService.ts   # 权限服务
├── stores/
│   ├── chat/                  # Zustand 对话状态（SSE 消费 + 持久化）
│   └── preferences/           # 用户偏好（主题等）
└── types/
    └── chat/                  # 对话类型定义（Message, SSE 事件等）
```

## AI 对话系统

### 架构

```
浏览器 (chat-store.ts)
  │  POST /api/chat (SSE)
  ▼
服务端 (chatService.ts)
  ├─ streamText({ model: deepseek-v4-flash, tools })
  ├─ SSE 事件流: text → tool-call → tool-result → done
  └─ 后处理: 保存消息 → 更新时间戳 → 触发摘要检查
```

### 工具

| 工具 | 数据源 | 说明 |
|------|--------|------|
| `webSearch` | Bing → DuckDuckGo 降级 | 联网搜索，零 API Key |
| `getWeather` | wttr.in | 全球天气查询 |
| `getCurrentTime` | Intl.DateTimeFormat | 支持时区 |
| `calculate` | 沙箱 `new Function()` | 安全数学计算 |

### Agent

| Agent | 模型 | 特点 |
|-------|------|------|
| Sapphire AI | deepseek-v4-flash | 专业精准，始终联网，结构化输出 |
| 深度思考 | deepseek-v4-pro | 逐步推理，深度分析，展示思考过程 |

### SSE 事件类型

| 事件 | 方向 | 说明 |
|------|------|------|
| `text` | Server → Client | 流式文本增量 |
| `tool-call` | Server → Client | 工具调用开始 |
| `tool-result` | Server → Client | 工具调用结果 |
| `tool-error` | Server → Client | 工具调用失败 |
| `done` | Server → Client | 流结束 |
| `error` | 双向 | 错误信息 |

## 认证与权限

### 认证系统

- **CMS 用户**: 自定义 JWT + bcrypt 密码加密（强度 10）
- **微信用户**: openid/unionid 认证
- **会话管理**: HttpOnly Cookie + SameSite=Strict
- **路由保护**: 中间件自动保护 `/dashboard` 路由

### RBAC 权限控制

```tsx
const { hasPermission } = usePermissions();
const canCreate = hasPermission("users", "create");
```

权限格式：`module:action`（如 `users:create`、`wechat-users:delete`）。`admin` 类型自动拥有所有权限。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router + Turbopack) |
| 语言 | TypeScript 5.7 |
| 数据库 | Supabase (PostgreSQL) |
| UI | Shadcn UI + Radix UI + Tailwind CSS v4 |
| AI SDK | Vercel AI SDK v7 (`ai` + `@ai-sdk/openai`) |
| AI 模型 | DeepSeek (deepseek-v4-flash / deepseek-v4-pro) |
| 认证 | 自定义 JWT + bcrypt |
| 状态管理 | Zustand v5 + TanStack React Query v5 |
| 表单 | React Hook Form + Zod |
| 图表 | Recharts |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| 3D 渲染 | React Three Fiber + Three.js |
| 测试 | Jest + Playwright |
| 部署 | Vercel |

## 可用脚本

```bash
npm run dev                 # 启动开发服务器 (Turbopack)
npm run build               # 构建生产版本
npm run start               # 启动生产服务器
npm run lint                # 运行 ESLint
npm run format              # 格式化代码 (Prettier)
npm run format:check        # 检查代码格式
npm run test:jest           # 后端单元/集成测试
npm run test:playwright:smoke  # 前端冒烟测试
npm run test:playwright:e2e    # 完整 E2E 测试
npm run test:all            # 全部测试
```

## 部署

部署在 Vercel，需配置环境变量：

- `DEEPSEEK_API_KEY` — DeepSeek API 密钥
- `JWT_SECRET` — JWT 签名密钥
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase 服务角色密钥

健康检查端点：`/api/health`

## 开发规范

1. **数据库操作** — 始终通过 `services/` 层，不直接调用 Supabase
2. **权限控制** — 前端用 `usePermissions`，后端 API 必须同步验证
3. **新增工具** — 在 `src/services/chatTools.ts` 定义，在 `src/config/agents.ts` 更新 system prompt
4. **新增 Agent** — 在 `src/config/agents.ts` 添加配置，侧边栏自动出现
5. **代码风格** — 遵循 ESLint + Prettier 配置
6. **测试** — 新功能必须包含测试，`npm run test:all` 全部通过再提交

---

**Sapphire Studio** — AI 工作站 v2.0.0
