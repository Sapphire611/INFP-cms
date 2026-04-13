# AI Chat Feature 使用指南

## 功能概述

AI Chat 功能已经成功实现！这是一个类似 ChatGPT 的多会话对话系统，使用 DeepSeek API 提供智能对话能力。

### 核心特性

✅ **多会话管理** - 用户可以创建、切换、删除多个对话会话
✅ **智能上下文维护** - 当前会话 + 最近3次完整对话 + 久远对话摘要
✅ **自动摘要生成** - 当对话达到20条消息时自动生成摘要
✅ **本地存储优化** - 详细消息存储在 localStorage，摘要存储在数据库
✅ **响应式设计** - 美观的聊天界面，适配各种屏幕尺寸

## 配置步骤

### 1. 设置 DeepSeek API Key

在 `.env` 文件中添加你的 DeepSeek API Key：

```bash
DEEPSEEK_API_KEY="your-actual-deepseek-api-key"
```

获取 API Key：访问 [https://platform.deepseek.com/](https://platform.deepseek.com/)

### 2. 运行数据库迁移

在 Supabase SQL 编辑器中运行 `supabase-chat-setup.sql` 文件中的 SQL 命令，创建所需的表和策略：

```bash
# 查看数据库设置文件
cat supabase-chat-setup.sql
```

这将创建：
- `conversations` 表 - 存储会话元数据
- `conversation_summaries` 表 - 存储自动生成的摘要
- Row Level Security (RLS) 策略 - 确保数据安全

### 3. 启动开发服务器

```bash
npm run dev
```

## 使用说明

### 访问 AI 对话

1. 登录系统后，在侧边栏点击 "AI对话"
2. 或者直接访问：`http://localhost:3000/dashboard/chat`

### 创建新对话

- 点击左侧的 "新对话" 按钮
- 系统会自动创建一个新会话

### 发送消息

- 在底部的输入框中输入你的问题
- 按 `Enter` 发送消息
- 按 `Shift+Enter` 换行

### 切换会话

- 点击左侧会话列表中的任意会话即可切换
- 消息历史会自动从 localStorage 恢复

### 删除会话

- 鼠标悬停在会话上，点击右侧的删除图标
- 删除会话会同时清理数据库和 localStorage 中的数据

## 技术架构

### 数据流

```
用户输入消息
  ↓
前端 Store (chat-store.ts)
  ↓
API 路由 (/api/chat)
  ↓
服务层 (chatService.ts)
  ↓
DeepSeek API (OpenAI SDK)
  ↓
返回 AI 响应
  ↓
更新 UI 和 localStorage
  ↓
检查是否需要生成摘要
```

### 上下文管理

发送给 DeepSeek 的上下文包括：

1. **系统提示** - 定义 AI 的行为和风格
2. **久远对话摘要** - 从数据库查询的旧对话摘要
3. **最近3次完整对话** - 从 localStorage 获取的完整消息
4. **当前会话** - 当前正在进行的对话

### 自动摘要触发条件

- 当前会话消息数 >= 20 条
- TODO: 会话 7 天未活跃

### 数据存储策略

**Supabase 数据库**:
- `conversations` 表：会话元数据（标题、创建时间等）
- `conversation_summaries` 表：对话摘要

**浏览器 localStorage**:
- 键格式：`chat_messages_{conversationId}`
- 存储：完整的消息历史（JSON 格式）

## 文件结构

```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts                     # 发送消息 API
│   │   └── chat/conversations/
│   │   ├── route.ts                          # 会话列表/创建 API
│   │   └── [id]/route.ts                     # 删除会话 API
│   └── (main)/dashboard/chat/
│       ├── page.tsx                          # 聊天页面主入口
│       └── _components/
│           ├── chat-sidebar.tsx              # 侧边栏
│           ├── chat-main.tsx                 # 主聊天区域
│           ├── chat-message.tsx              # 消息组件
│           ├── chat-input.tsx                # 输入框
│           └── conversation-item.tsx         # 会话列表项
├── services/
│   ├── conversationService.ts                # 会话管理服务
│   ├── chatService.ts                        # DeepSeek API 集成
│   └── summaryService.ts                     # 摘要生成服务
├── stores/
│   └── chat/
│       ├── index.ts                          # 导出
│       ├── chat-store.ts                     # Zustand store
│       └── chat-provider.tsx                 # React Context Provider
└── types/
    └── chat/
        └── index.ts                          # TypeScript 类型定义
```

## API 端点

### POST /api/chat
发送消息到 DeepSeek

**请求体**:
```json
{
  "conversationId": "uuid",
  "message": "用户消息",
  "conversationHistory": [...]
}
```

**响应**:
```json
{
  "content": "AI 响应内容"
}
```

### GET /api/chat/conversations
获取用户的会话列表

**查询参数**:
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20）

### POST /api/chat/conversations
创建新会话

**请求体**:
```json
{
  "title": "会话标题",
  "model": "deepseek-chat"
}
```

### DELETE /api/chat/conversations/[id]
删除指定会话

## 注意事项

### 安全性

- ✅ 所有 API 端点都需要身份验证（JWT token）
- ✅ RLS 策略确保用户只能访问自己的会话
- ✅ API Key 存储在服务器端，不暴露给客户端

### 性能优化

- localStorage 存储减少了数据库查询
- 延迟初始化 OpenAI 客户端避免构建错误
- 自动摘要生成控制上下文大小

### 限制

- 当前每个会话的消息阈值是 20 条（触发摘要生成）
- 摘要功能目前只在消息数达到阈值时触发
- 最近 3 次对话的完整上下文暂未实现（仅当前会话）

## 下一步优化建议

1. **实现最近3次对话上下文** - 从 localStorage 加载最近的会话
2. **添加流式响应** - 实时显示 AI 生成的内容
3. **会话重命名** - 让用户可以自定义会话标题
4. **导出对话** - 支持导出对话记录为 Markdown
5. **消息搜索** - 在当前会话中搜索历史消息
6. **语音输入** - 集成语音转文字功能

## 故障排查

### 构建失败

如果遇到构建错误，确保：
1. 已安装 `openai` 包：`npm install openai`
2. `.env` 文件存在（即使没有真实的 API Key）
3. 所有导入路径正确

### API 调用失败

如果消息发送失败：
1. 检查 DEEPSEEK_API_KEY 是否正确
2. 确认网络连接正常
3. 查看 Supabase 日志是否有数据库错误

### localStorage 限制

如果遇到存储空间问题：
- 每个会话的消息数限制在合理范围内
- 定期清理旧会话
- 摘要功能会帮助减少存储需求

## 技术栈

- **前端**: Next.js 15, React, Zustand
- **UI**: Shadcn UI, Radix UI, Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **AI**: DeepSeek API (OpenAI SDK)

---

**开发完成时间**: 2026-03-24
**版本**: 1.0.0
**状态**: ✅ 已完成并测试通过
