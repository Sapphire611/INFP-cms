## Project Overview

**Sapphire Studio** is an AI workstation built on Next.js 15, Supabase, and Shadcn UI. It provides an AI chat interface with tool calling (weather, time, math, web search) powered by DeepSeek via the Vercel AI SDK v7. The CMS backend manages users, WeChat users, and dashboard data.

**Branding**: "Sapphire Studio — AI 工作站"

## AI Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                    AI Tech Stack                        │
├─────────────────────────────────────────────────────────┤
│  Chat UI          │  Vercel AI SDK v7  +  SSE 流式     │
│  (React + Zustand)│  @ai-sdk/openai  (DeepSeek 适配)   │
├─────────────────────────────────────────────────────────┤
│  Model            │  DeepSeek (deepseek-v4-flash)       │
│                   │  通过 OpenAI 兼容 API               │
├─────────────────────────────────────────────────────────┤
│  Tools            │  getWeather   → wttr.in             │
│                   │  getCurrentTime → Intl.DateTimeFormat│
│                   │  calculate    → sandboxed new Function│
│                   │  webSearch    → DuckDuckGo HTML 抓取 │
├─────────────────────────────────────────────────────────┤
│  Agent System     │  config/agents.ts                   │
│                   │  每个 Agent 有独立的 system prompt  │
│                   │  和工具开关 (enableWebSearch)       │
├─────────────────────────────────────────────────────────┤
│  Persistence      │  Supabase (对话元数据 + 消息历史)   │
│                   │  Summarization (20条触发摘要)        │
└─────────────────────────────────────────────────────────┘
```

### Core AI Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `ai` | ^7.0.8 | Vercel AI SDK v7 - `streamText()`, `tool()`, SSE streaming |
| `@ai-sdk/openai` | ^4.0.4 | OpenAI-compatible provider, pointed at DeepSeek |
| `openai` | ^6.32.0 | Raw OpenAI SDK (used only in `summaryService.ts`) |

### Model / Provider

**Only DeepSeek is used.** The app connects to DeepSeek's OpenAI-compatible API at `https://api.deepseek.com/v1` via the `@ai-sdk/openai` provider wrapper. 默认使用 `deepseek-v4-flash`，特定功能按需升级到 `deepseek-v4-pro`。不再使用已弃用的 `deepseek-chat`（2026/07/24 弃用）。

## Common Development Commands

```bash
# Development
npm run dev              # Start development server (Turbopack)
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Database & Scripts
npm run init-db          # Initialize database with test users


# Testing
npm run test:jest              # Backend unit/integration tests
npm run test:playwright:smoke  # Frontend smoke tests
npm run test:playwright:e2e    # Full E2E tests
npm run test:all               # All test suites
```

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/              # Authentication endpoints
│   │   ├── users/             # CMS user management
│   │   ├── wechat-users/      # WeChat user management
│   │   ├── dashboard/         # Dashboard statistics
│   │   └── chat/              # Chat API (SSE streaming)
│   │       ├── route.ts       # POST /api/chat — SSE stream
│   │       └── conversations/ # CRUD for conversations + messages
│   ├── (main)/                # Protected CMS routes
│   │   └── dashboard/         # CMS dashboard pages
│   ├── (external)/            # Public routes
│   └── chat/                  # Main chat app (/chat)
│       ├── layout.tsx         # Chat layout with provider
│       ├── page.tsx           # Chat page
│       └── _components/       # Header, icon sidebar, search dialog
├── components/
│   ├── ui/                    # Shadcn UI components
│   ├── data-table/            # Reusable data table
│   └── chat/                  # Shared chat components
│       ├── chat-main.tsx      # Message list + input
│       ├── chat-sidebar.tsx   # Agent selector + conversation list
│       ├── chat-input.tsx     # Textarea + send button
│       ├── chat-message.tsx   # Single message (basic version)
│       └── conversation-item.tsx # Sidebar conversation row
├── config/
│   ├── agents.ts              # Agent definitions (system prompts, tools)
│   └── app-config.ts          # App name, version, meta
├── hooks/                     # Custom React hooks
├── lib/
│   ├── ai-client.ts           # DeepSeek client (createOpenAI wrapper)
│   ├── supabase-client.ts     # Browser Supabase client
│   ├── supabase-server.ts     # Server Supabase client
│   ├── supabase-admin.ts      # Admin client (bypasses RLS)
│   ├── auth.ts               # Auth helpers, bcrypt
│   └── jwt.ts                 # JWT sign/verify, requireAuth()
├── middleware/                 # Auth middleware
├── navigation/                # Sidebar & search navigation
├── services/
│   ├── chatService.ts         # streamText() + SSE + message persistence
│   ├── chatTools.ts           # Tool definitions (weather, time, calc, search)
│   ├── messageService.ts      # Message CRUD (Supabase messages table)
│   ├── searchService.ts       # Standalone DuckDuckGo search
│   ├── summaryService.ts      # Conversation summarization (OpenAI SDK)
│   ├── conversationService.ts # Conversation CRUD (Supabase)
│   ├── userService.ts         # CMS user CRUD
│   └── wechatUserService.ts   # WeChat user operations
├── stores/
│   └── chat/
│       ├── chat-store.ts      # Zustand vanilla store (SSE consumption, API persistence)
│       └── chat-provider.tsx   # React context provider
└── types/
    └── chat/
        └── index.ts           # Message, Conversation, ToolCallRecord, SSE events
```

## AI System Design

### 1. Provider Layer (`src/lib/ai-client.ts`)

```typescript
// Creates the AI SDK model instance pointed at DeepSeek
import { createOpenAI } from "@ai-sdk/openai";

export const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
});

export const CHAT_MODEL = "deepseek-v4-flash";
```

This is the **single AI client** used by `chatService.ts`. The `@ai-sdk/openai` package wraps DeepSeek's OpenAI-compatible API so the Vercel AI SDK v7 can use it transparently.

### 2. Tools (`src/services/chatTools.ts`)

Four tools are defined using the Vercel AI SDK v7 `tool()` helper. Each tool has a Zod `inputSchema` and an async `execute` function. **All tools run server-side** inside `streamText()`.

| Tool | Source | Auth Required | Description |
|------|--------|---------------|-------------|
| `getWeather` | [wttr.in](https://wttr.in) | No | Free weather API, returns JSON (`?format=j1`). 8s timeout. |
| `getCurrentTime` | `Intl.DateTimeFormat` | No | Built-in JS. Supports timezone parameter, defaults to `Asia/Shanghai`. |
| `calculate` | Sandboxed `new Function()` | No | Math expression evaluator. Allowlist of Math functions (`sin`, `sqrt`, `log`, etc.). No global access. |
| `webSearch` | DuckDuckGo HTML | No | Scrapes `html.duckduckgo.com/html/`. Parses result blocks for title/snippet/url. Max 8 results, 10s timeout. |

**Adding a new tool:**

1. Define it in `src/services/chatTools.ts` using `tool({...})`
2. Add it to the `chatTools` export object
3. Update the system prompt in `src/config/agents.ts` or `src/services/chatService.ts` to describe the new capability

All tools are passed to `streamText()` via the `tools: chatTools` parameter. The model decides when to call them based on its system prompt.

### 3. Agent System (`src/config/agents.ts`)

Agents are **configuration objects** that customize the AI's behavior:

```typescript
interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: string;          // Lucide icon name: "Bot", "Search"
  systemPrompt: string;  // The system prompt sent to the model
  model: string;         // Default "deepseek-v4-flash", upgrade to "deepseek-v4-pro" for specific features
  temperature: number;   // Default 0.7
  maxTokens: number;     // Default 2000
  enableWebSearch: boolean; // Whether web search is mentioned in prompt
}
```

**Active agents:**

| ID | Name | Key Behavior |
|----|------|-------------|
| `default` | Sapphire AI | 专业精准，始终联网；结构化输出（Markdown + 来源标注），搜索后必须总结分析 |
| `deep-think` | 深度思考 | 逐步推理，深度分析；使用 deepseek-v4-pro，展示「分析→推导→结论」过程 |

**Adding a new agent:**

1. Add an entry to the `agents` array in `src/config/agents.ts`
2. The new agent instantly appears in the chat sidebar's agent selector
3. Create a new icon mapping if needed in `chat-sidebar.tsx`

### 4. Streaming Flow (SSE)

The complete data flow for a user message:

```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  chat-store.ts.sendMessage()                                 │
│    ├─ Creates conversation (if new)                          │
│    ├─ Adds user message optimistically                       │
│    ├─ POST /api/chat (SSE request)                           │
│    │     ↓                                                   │
│    │  Server: chatService.streamChatResponse()               │
│    │     ├─ toModelMessages() — convert to AI SDK format     │
│    │     ├─ streamText({ model, system, messages, tools })   │
│    │     ├─ Iterate fullStream → SSE events:                 │
│    │     │   "text-delta" → { type: "text", content }        │
│    │     │   "tool-call"  → { type: "tool-call", ... }       │
│    │     │   "tool-result"→ { type: "tool-result", ... }     │
│    │     │   "finish"     → { type: "done" }                 │
│    │     ↓                                                   │
│    │  Client: read SSE stream                                │
│    │     ├─ text: append to assistant message (in-place)    │
│    │     ├─ tool-call: push to toolCallRecords[]             │
│    │     ├─ tool-result: update matching toolCallRecord      │
│    │     └─ done: mark isStreaming=false                     │
│    │                                                         │
│    │  Post-stream (server, non-blocking):                    │
│    │     ├─ Save assistant message to Supabase               │
│    │     ├─ Update conversation updated_at (Supabase)        │
│    │     └─ Check if summarization needed (≥20 messages)     │
│    └─────────────────────────────────────────────────────────┘
│  Client: loadConversations() to refresh order                 │
└──────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- Messages are stored in **Supabase** (`messages` table). The server saves user message before streaming and assistant message after streaming completes.
- When switching conversations, messages are fetched via `GET /api/chat/conversations/[id]/messages`.
- Tool calls are limited to **5 steps** (`stopWhen: isStepCount(5)`) to prevent infinite loops.
- Post-stream side effects (message save, timestamp update, summarization) fire-and-forget — they don't block the response.

### 5. SSE Event Types

Defined in `src/types/chat/index.ts` as `ChatStreamEvent`:

| Event | Direction | Payload |
|-------|-----------|---------|
| `text` | Server → Client | `{ type: "text", content: string }` |
| `tool-call` | Server → Client | `{ type: "tool-call", toolCallId, toolName, args }` |
| `tool-result` | Server → Client | `{ type: "tool-result", toolCallId, toolName, result }` |
| `tool-error` | Server → Client | `{ type: "tool-error", toolCallId, toolName, error }` |
| `done` | Server → Client | `{ type: "done", finishReason }` |
| `error` | Bidirectional | `{ type: "error", error: string }` |

### 6. State Management (`src/stores/chat/`)

Uses **Zustand vanilla store** (not React Zustand) wrapped in a React context provider. This allows accessing chat state outside React components.

Key actions:
- `sendMessage(content)` — full SSE lifecycle (see streaming flow above)
- `loadConversations()` — fetch conversation list from API
- `createConversation(title?)` — create new conversation via API
- `deleteConversation(id)` — delete via API + cleanup localStorage
- `syncToLocalStorage()` / `loadFromLocalStorage(id)` — persistence layer

### 7. Summarization (`src/services/summaryService.ts`)

- Triggers automatically after **20 messages** in a conversation.
- Summarizes the first half of the conversation history.
- Uses the **raw OpenAI SDK** (not the AI SDK) pointed at DeepSeek.
- Stores summaries in Supabase `conversation_summaries` table.
- Runs as a fire-and-forget side effect after streaming completes.


## Key Concepts

### Authentication System

- Custom JWT tokens for CMS user sessions
- bcrypt for password hashing (strength: 10)
- Cookie-based sessions with HttpOnly and SameSite=Strict
- Chat API routes use `requireAuth()` from `src/lib/jwt.ts`
- Middleware protects `/dashboard` routes
- Users must have `isActive: true` to login. Only `admin` and `user` types can access the CMS.

### Database Operations

- **Always use service layer functions** instead of direct Supabase calls
- Use `supabase-admin` (from `src/lib/supabase-admin.ts`) only when bypassing RLS is necessary
- Database columns use snake_case in Supabase but camelCase in TypeScript interfaces

### User Management

- **Admin**: Full system access, can manage users
- **User**: Basic CMS access (if account is active)
- **WeChat Users**: Managed separately with openid/unionid authentication

## Development Patterns

### Adding a New AI Tool

1. **Define the tool** in `src/services/chatTools.ts`:
   ```typescript
   import { tool } from "ai";
   import { z } from "zod";

   export const myTool = tool({
     description: "工具描述，告诉模型何时调用",
     inputSchema: z.object({
       param: z.string().describe("参数说明"),
     }),
     execute: async (input) => {
       // Server-side execution logic
       return { result: "..." };
     },
   });

   // Add to the export object
   export const chatTools = { webSearch, getWeather, getCurrentTime, calculate, myTool };
   ```

2. **Update the system prompt** in `src/config/agents.ts` or `chatService.ts` to describe the new tool's capability.

3. **Update types** if the tool returns novel data structures.

### Adding a New Agent

1. Add an entry to the `agents` array in `src/config/agents.ts`:
   ```typescript
   {
     id: "my-agent",
     name: "My Agent",
     description: "What this agent does",
     icon: "Bot",
     systemPrompt: "You are a specialized agent that...",
     model: "deepseek-v4-flash",
     temperature: 0.7,
     maxTokens: 2000,
     enableWebSearch: false,
   }
   ```

2. The agent automatically appears in the chat sidebar — no UI changes needed.

### Adding a New API Route

1. Create route handler in `src/app/api/`
2. Use `requireAuth()` for protected routes
3. Validate requests with Zod schemas
4. Return consistent JSON responses

### Adding CMS Dashboard Pages

1. Create page in `src/app/(main)/dashboard/`
2. Use `"use client"` directive for interactivity
3. Add navigation entry in `src/navigation/sidebar/sidebar-items.ts`

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DEEPSEEK_API_KEY` | Yes (for AI) | DeepSeek API key |
| `DEEPSEEK_BASE_URL` | No | DeepSeek API base URL (default: `https://api.deepseek.com/v1`) |
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (admin ops) | Supabase service role key — bypasses RLS |

**Note:** The AI tools (weather, search, time, calculate) require **no API keys** — they use free services (wttr.in, DuckDuckGo) or built-in JS APIs.

## Important Files

### AI Core
- `src/lib/ai-client.ts` — DeepSeek client setup (entry point for the AI stack)
- `src/services/chatService.ts` — Main streaming logic, SSE conversion, summarization trigger
- `src/services/chatTools.ts` — All tool definitions (add new tools here)
- `src/config/agents.ts` — Agent configurations (add new agents here)
- `src/app/api/chat/route.ts` — SSE endpoint that pipes the stream to the client

### State & UI
- `src/stores/chat/chat-store.ts` — Zustand store (SSE consumption, localStorage sync)
- `src/stores/chat/chat-provider.tsx` — React context wrapper
- `src/types/chat/index.ts` — All chat-related TypeScript types
- `src/components/chat/` — Shared chat UI components
- `src/app/chat/` — Main chat route and page-specific components

### Auth & Data
- `src/lib/jwt.ts` — JWT utilities and `requireAuth()` middleware
- `src/lib/auth.ts` — Password hashing and auth helpers
- `src/middleware/auth-middleware.ts` — Route protection
- `src/services/conversationService.ts` — Conversation CRUD
- `src/services/summaryService.ts` — Conversation summarization

### CMS
- `src/services/userService.ts` — CMS user CRUD
- `src/services/wechatUserService.ts` — WeChat user operations
- `supabase-setup.sql` — Database schema

## Testing

**CRITICAL: Every new feature or fix MUST have passing tests before marking complete.**

### Required Test Suites

1. **Backend Unit/Integration Tests (Jest)**
   - Command: `npm run test:jest`
   - Location: `src/__tests__/`
   - Cover: API routes, services, utilities, tools

2. **Frontend Smoke Tests (Playwright)**
   - Command: `npm run test:playwright:smoke`
   - Tag: `@smoke`
   - Cover: Core page loads, basic navigation

3. **Full E2E Tests (Playwright)**
   - Command: `npm run test:playwright:e2e`
   - Cover: Complete business processes, user flows

### Testing Workflow

```bash
# 1. Write/update tests for your changes
# 2. Run ALL test suites
npm run test:jest              # Must pass
npm run test:playwright:smoke  # Must pass
npm run test:playwright:e2e    # Must pass

# 3. Fix failures and re-run until ALL pass
```

### Important

- Run `npm run test:all` before committing
- Fix ALL failures before marking task complete
- Add `@smoke` tag to critical path tests
- Use `ghp_` prefix for test data

## Deployment

- Deployed on Vercel
- Environment variables must be configured in Vercel dashboard
- Health check available at `/api/health`
- DeepSeek API must be accessible from the deployment environment
