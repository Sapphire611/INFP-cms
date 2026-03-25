---
marp: true
theme: default
paginate: true
---

<!-- _class: lead -->

# INFP-CMS AI对话功能技术方案

## 智能对话系统的完整实现架构

---

# 目录

1. [功能概述](#功能概述)
2. [技术架构](#技术架构)
3. [数据库设计](#数据库设计)
4. [前端实现](#前端实现)
5. [后端服务](#后端服务)
6. [安全机制](#安全机制)
7. [部署配置](#部署配置)

---

# 功能概述

## 核心功能

- **🤖 AI智能对话** - 基于DeepSeek大模型的智能对话
- **💾 会话管理** - 多会话并行管理，支持创建/删除/切换
- **📱 响应式设计** - 适配桌面和移动设备
- **🔄 实时交互** - 流畅的实时对话体验
- **📊 智能摘要** - 自动生成对话摘要，优化上下文管理

---

# 功能特性

### 用户体验优化

- **持久化存储** - 对话记录保存在浏览器localStorage
- **自动保存** - 消息自动同步到本地存储
- **错误处理** - 友好的错误提示和重试机制
- **加载状态** - 清晰的加载和思考状态显示

### 技术亮点

- **混合存储策略** - 元数据存储在服务端，消息内容存储在客户端
- **智能摘要系统** - 自动压缩长对话历史
- **现代化架构** - 采用最新的React和Next.js技术栈

---

# 技术架构

## 系统架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户界面层      │    │    状态管理层    │    │    服务层        │
│                 │    │                 │    │                 │
│  • Chat Page    │────│  • Zustand Store│────│  • API Routes   │
│  • Components   │    │  • localStorage │    │  • Services     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │   数据层         │
                                              │                 │
                                              │  • Supabase     │
                                              │  • DeepSeek API │
                                              └─────────────────┘
```

---

# 技术栈

### 前端技术栈

- **框架**: Next.js 15 (App Router)
- **UI组件**: Shadcn UI + Radix UI
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **类型安全**: TypeScript

### 后端技术栈

- **API**: Next.js API Routes
- **数据库**: Supabase (PostgreSQL)
- **AI模型**: DeepSeek Chat API
- **认证**: 自定义JWT系统

---

# 数据库设计

## 表结构概览

```sql
-- 会话表 (存储会话元数据)
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  model TEXT DEFAULT 'deepseek-chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

```sql
-- 摘要表 (存储自动生成的摘要)
CREATE TABLE conversation_summaries (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  message_count_summary INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
```

---

# 数据库设计特点

## 存储策略

### 元数据存储 (服务端)
- **会话基本信息**: 标题、创建时间、模型选择
- **用户关联**: 通过user_id关联用户和会话
- **摘要记录**: 自动生成的对话摘要

### 消息内容存储 (客户端)
- **实时消息**: 完整的对话内容存储在localStorage
- **按会话隔离**: 每个会话独立存储 (`chat_messages_{conversationId}`)
- **性能优化**: 减少服务端存储和传输压力

---

# 前端实现

## 组件架构

```
src/app/(main)/dashboard/chat/
├── page.tsx                    # 主页面入口
└── _components/
    ├── chat-sidebar.tsx        # 侧边栏 - 会话列表
    ├── chat-main.tsx           # 主对话区域
    ├── chat-input.tsx          # 输入框组件
    ├── chat-message.tsx        # 消息展示组件
    └── conversation-item.tsx   # 会话列表项
```

---

### 状态管理

```typescript
// src/stores/chat/chat-store.ts
interface ChatState {
  conversations: Conversation[];      // 会话列表
  currentConversationId: string | null; // 当前会话ID
  currentMessages: Message[];         // 当前消息
  isLoading: boolean;                 // 加载状态
  error: string | null;               // 错误信息

  // Actions
  createConversation: (title?: string) => Promise<Conversation>;
  sendMessage: (content: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  // ... 更多方法
}
```

---

# 前端实现细节

## 消息流程

1. **用户输入** → ChatInput组件捕获
2. **状态更新** → 立即更新Zustand store，显示用户消息
3. **API调用** → 发送到`/api/chat`端点
4. **流式响应** → 接收AI回复并更新状态
5. **本地持久化** → 自动保存到localStorage

---

## 数据同步策略

```typescript
// 双向数据同步
syncToLocalStorage() {
  // 状态 → localStorage
  localStorage.setItem(
    `chat_messages_${conversationId}`,
    JSON.stringify(messages)
  );
}

loadFromLocalStorage(conversationId: string) {
  // localStorage → 状态
  const messages = JSON.parse(
    localStorage.getItem(`chat_messages_${conversationId}`)
  );
}
```

---

# 后端服务

## API路由设计

```
/api/chat
├── POST /api/chat                          # 发送消息
├── GET  /api/chat/conversations            # 获取会话列表
├── POST /api/chat/conversations            # 创建新会话
└── DELETE /api/chat/conversations/[id]     # 删除会话
```

## 服务层架构

```
src/services/
├── chatService.ts           # AI对话核心服务
├── conversationService.ts   # 会话管理服务
└── summaryService.ts        # 摘要生成服务
```

---

# AI对话服务 核心实现

```typescript
// src/services/chatService.ts
export async function sendMessage(
  conversationId: string,
  userMessage: string,
  conversationHistory: Message[]
): Promise<{ content: string }> {
  // 1. 构建API上下文
  const messages = buildContextForAPI(conversationHistory, userMessage);

  // 2. 调用DeepSeek API
  const completion = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: messages,
    temperature: 0.7,
    max_tokens: 2000,
  });

  // 3. 更新会话时间戳
  await updateConversationTimestamp(conversationId);

  // 4. 检查是否需要摘要
  await checkAndSummarizeIfNeeded(conversationId, conversationHistory);

  return { content: assistantMessage };
}
```

---

# 智能摘要系统

## 自动摘要机制

### 触发条件
- **消息数量**: 当对话消息 ≥ 20条时自动触发
- **摘要范围**: 对前半部分消息进行摘要
- **存储策略**: 摘要存储在数据库中，减少内存占用

---

### 摘要生成流程

```typescript
async function checkAndSummarizeIfNeeded(
  conversationId: string,
  conversationHistory: Message[]
) {
  const SUMMARIZATION_THRESHOLD = 20;

  if (conversationHistory.length >= SUMMARIZATION_THRESHOLD) {
    const messagesToSummarize = conversationHistory.slice(
      0, Math.floor(conversationHistory.length / 2)
    );

    await createSummary(
      conversationId,
      messagesToSummarize,
      messagesToSummarize.length
    );
  }
}
```

---

# 安全机制

## 身份验证

### JWT认证流程
```typescript
// src/lib/jwt.ts
export async function requireAuth(): Promise<JWTPayload> {
  const payload = await verifyAuth();

  if (!payload) {
    throw new Error("Unauthorized");
  }

  return payload;
}
```

### 会话隔离
- **用户隔离**: 每个用户只能访问自己的会话
- **权限验证**: API层面严格验证用户权限
- **RLS策略**: 数据库层面的行级安全策略

---

# 安全机制 (续)

### 输入验证
```typescript
// API请求验证
if (!conversationId || !message) {
  return NextResponse.json(
    { error: "conversationId and message are required" },
    { status: 400 }
  );
}

if (typeof message !== "string" || message.trim().length === 0) {
  return NextResponse.json(
    { error: "Message must be a non-empty string" },
    { status: 400 }
  );
}
```
---


### 错误处理
- **统一错误格式**: 标准化的错误响应
- **日志记录**: 完整的错误日志记录
- **用户友好**: 不暴露敏感系统信息

---

# 性能优化

## 前端优化

### 状态管理优化
- **选择性订阅**: 只订阅需要的状态片段
- **批量更新**: 减少不必要的重渲染

### 数据存储优化
- **混合存储**: 关键数据服务端，详细数据客户端
- **懒加载**: 按需加载对话历史

---

## 后端优化

### API性能
- **连接池**: Supabase连接复用
- **索引优化**: 数据库查询索引优化

### 智能缓存
- **摘要机制**: 减少上下文长度，提升AI响应速度
- **分页加载**: 会话列表分页查询

---

# 部署配置

## 环境变量

```bash
# DeepSeek AI配置
DEEPSEEK_API_KEY="your-deepseek-api-key"
DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# JWT配置
JWT_SECRET="your-jwt-secret"
```

## 部署步骤

1. **数据库初始化**: 执行`supabase-chat-setup.sql`
2. **环境变量配置**: 设置所有必需的环境变量
3. **依赖安装**: `npm install`
4. **构建部署**: `npm run build`
5. **启动服务**: `npm start`

---

# 监控与维护

### 错误日志
```typescript
console.error("Error in POST /api/chat:", error);
```

### 性能监控
- API响应时间、数据库查询性能、AI API调用统计

## 维护建议

- **定期清理**: 清理过期的会话和摘要
- **性能监控**: 监控API调用量和响应时间
- **成本控制**: 注意DeepSeek API的使用成本

---

# 未来扩展

## 功能扩展方向

### 🚀 短期目标
- **文件上传** - 支持图片和文档上传
- **语音输入** - 集成语音识别功能
- **多语言支持** - 支持多语言对话

### 📈 长期规划
- **多模型支持** - 支持更多AI模型
- **对话分析** - 对话数据分析和统计
- **协作功能** - 多用户会话协作

---

# 技术亮点总结

## ✅ 架构优势

- **前后端分离**: 清晰的架构边界
- **类型安全**: 完整的TypeScript支持
- **现代化**: 采用最新的技术栈

## ✅ 用户体验

- **响应迅速**: 优化的性能表现
- **界面友好**: 现代化的UI设计
- **容错性好**: 完善的错误处理

## ✅ 可维护性

- **代码规范**: 统一的代码风格
- **模块化**: 高度模块化的架构
- **文档完整**: 完整的技术文档

---

<!-- _class: lead -->

# 谢谢！

## INFP-CMS AI对话功能技术方案

**基于DeepSeek大模型的智能对话系统**