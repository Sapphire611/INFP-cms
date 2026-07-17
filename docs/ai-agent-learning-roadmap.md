# Node.js 全栈 → AI Agent 工程师 学习路线图

> 基于 Sapphire Studio 项目现状，结合已有技术栈的务实进阶路径。
> 最后更新：2026-07-17

---

## 你已经掌握的基础（比大部分人起点高）

Sapphire Studio 项目已经实现了 AI Agent 的雏形：

| 你已经会的 | 在项目里的体现 | 文件 |
|---|---|---|
| LLM 调用 | DeepSeek via OpenAI 兼容 API | `src/lib/ai-client.ts` |
| Tool Calling | 4 个工具，Zod schema + execute | `src/services/chatTools.ts` |
| SSE 流式输出 | `streamText()` + fullStream 逐事件推送 | `src/services/chatService.ts` |
| Agent 配置化 | system prompt / model / temperature 可切换 | `src/config/agents.ts` |
| 对话持久化 | Supabase messages + summaries 表 | `src/services/messageService.ts` |
| 历史摘要 | 20 条触发自动摘要 | `src/services/summaryService.ts` |
| 状态管理 | Zustand + SSE 消费 + localStorage 同步 | `src/stores/chat/chat-store.ts` |

**这些是一个生产级 AI 应用的核心骨架。** 从这出发，需要补的是三个层次的能力。

---

## 第一层：加深单 Agent 能力（立即可在项目里练手）

### 1.1 提示词工程（Prompt Engineering）— 最被低估

当前 system prompt 很简短：

```typescript
// src/config/agents.ts — 当前
systemPrompt: "你是 Sapphire Studio 的 AI 助手...需要实时信息时立即调 webSearch..."
```

**需要学：**

| 技巧 | 说明 | 示例 |
|---|---|---|
| **结构化 System Prompt** | 角色定义 → 能力边界 → 输出格式 → 约束条件 → 示例 | 见下方模板 |
| **Chain-of-Thought 强制** | 让模型在调用工具前先输出推理过程 | `"在回答前，先分析问题类型和所需信息"` |
| **输出格式控制** | 用 structured output 约束模型输出 | `json_schema` 模式 |
| **防幻觉策略** | 要求模型引用来源、标注不确定度 | `"如果信息来自搜索结果，请标注来源"` |
| **Few-shot 示例** | 给模型 2-3 个对话示例 | 用户问 → 你调什么工具 → 怎么回答 |

**结构化 System Prompt 模板：**

```markdown
## 角色
你是 Sapphire Studio 的 AI 助手，一个具备工具调用能力的智能代理。

## 核心能力
1. 联网搜索 (webSearch) — 获取实时信息
2. 天气查询 (getWeather) — 查询全球城市天气
3. 时间查询 (getCurrentTime) — 获取任意时区当前时间
4. 数学计算 (calculate) — 执行复杂数学表达式

## 行为准则
- 遇到需要实时/最新信息的问题，必须先调 webSearch
- 搜索结果不足时，换关键词重试（最多 2 次）
- 基于搜索结果给出完整中文回答，不要只复述搜索片段
- 如果信息不确定，明确告知用户"根据搜索结果，XX 可能不准确"

## 输出格式
- 使用 Markdown 格式化回答
- 如有搜索来源，在末尾列出引用链接
- 如涉及计算，展示计算过程

## 示例
用户："北京今天天气怎么样？"
你：调用 getWeather({ city: "Beijing" }) → 基于结果给出完整天气描述

用户："2024 年诺贝尔物理学奖得主是谁？"
你：调用 webSearch({ query: "2024 诺贝尔物理学奖" }) → 整理结果给出完整回答
```

**在你的项目里练手：** 把 `agents.ts` 里的 system prompt 重构成 200+ 行的模板。

### 1.2 Tool Design 进阶

当前工具是"请求-响应"式的：

```typescript
// 当前：单一工具，独立执行
export const webSearch = tool({
  execute: async (input) => {
    const results = await searchBing(input.query);
    return { source: "Bing", query, totalResults: results.length, results };
  },
});
```

**需要学：**

| 进阶点 | 说明 |
|---|---|
| **工具返回值设计** | 不仅返回 data，还要包含 metadata（来源、置信度、耗时） |
| **工具错误分级** | 可重试错误 vs 致命错误 vs 降级结果 |
| **长运行工具（Long-running tools）** | 需要轮询状态的任务（如"帮我生成一份报表"） |
| **工具描述工程** | `description` 是给模型看的，写得不好模型就不会调用 |

**改进后的工具返回值设计：**

```typescript
interface ToolResult {
  success: boolean;
  data: unknown;
  metadata: {
    source: string;       // 数据来源
    confidence: number;   // 置信度 0-1
    latencyMs: number;    // 耗时
    cachedResult: boolean; // 是否缓存命中
  };
  error?: {
    code: string;         // 错误码
    retryable: boolean;   // 是否可重试
    fallback?: unknown;   // 降级结果
  };
}
```

**在你的项目里练手：** 添加一个 `fetchWebPage` 工具（fetch → cheerio 解析 → 提取正文），练习工具链式调用（search → fetch → summarize）。

---

## 第二层：Agent 架构模式（核心转变）

这是从"带工具的聊天机器人"到"Agent"的关键跨越。

### 2.1 Agentic Loop（ReAct / Plan-Execute）

当前是**单次 `streamText` 调用**，AI SDK 帮你处理了 tool-call → tool-result → 继续生成的内部循环。真正的 Agent 需要**显式控制循环**：

```
┌──────────────────────────────────────────┐
│  Agent Loop (你控制的)                    │
│                                          │
│  1. 思考 (Think)  → 分析当前状态         │
│  2. 规划 (Plan)   → 决定下一步做什么      │
│  3. 行动 (Act)    → 调用工具             │
│  4. 观察 (Observe)→ 解析工具结果          │
│  5. 反思 (Reflect)→ 结果是否正确          │
│  6. 判断是否完成   → 是则输出，否则回 1   │
└──────────────────────────────────────────┘
```

**核心模式：**

| 模式 | 描述 | 适用场景 |
|---|---|---|
| **ReAct** | Reasoning + Acting 交替 | 需要多步推理 + 工具调用的任务 |
| **Plan-Execute** | 先制定完整计划，再逐步执行 | 目标明确的复杂任务 |
| **Reflection** | 执行后自检结果是否正确 | 需要高准确率的场景 |
| **ReWOO** | Reason Without Observation | 减少工具调用次数，提高效率 |

**在你的项目里练手：** 用 AI SDK 的 `generateText` + 手动循环实现一个真正的 ReAct Agent：

```typescript
// 伪代码：ReAct Loop
async function reactAgent(userQuery: string) {
  const maxSteps = 5;
  let context = userQuery;

  for (let step = 0; step < maxSteps; step++) {
    // 1. Think + Act
    const { thought, action, actionInput } = await generateText({
      model: deepseek.chat("deepseek-v4-flash"),
      system: `你是 ReAct Agent。输出 JSON:
        { "thought": "分析当前情况", "action": "工具名或 FINAL_ANSWER", "actionInput": {...} }`,
      prompt: context,
    });

    // 2. 如果是最终答案，返回
    if (action === "FINAL_ANSWER") return actionInput.answer;

    // 3. 否则执行工具
    const observation = await executeTool(action, actionInput);

    // 4. 将观察结果加入上下文
    context += `\n工具结果: ${JSON.stringify(observation)}`;
    context += `\n请检查结果是否足够回答用户问题，不够则继续调用工具。`;
  }

  // 达到最大步数，强制生成最终答案
  return await forceFinalAnswer(context);
}
```

### 2.2 工具组合与编排

当前工具是扁平的：

```typescript
export const chatTools = { webSearch, getWeather, getCurrentTime, calculate };
```

Agent 需要：

| 能力 | 说明 |
|---|---|
| **工具依赖图** | search → fetch_page → extract → analyze |
| **并行工具调用** | 同时查天气和搜索新闻 |
| **条件工具路由** | 根据上一步结果决定下一步用什么工具 |
| **工具结果验证** | 检查工具返回是否有效，无效则重试或换方案 |

### 2.3 结构化输出（Structured Output）

当前 SSE 事件是自由文本。Agent 需要结构化的中间状态：

```typescript
// Agent 的思考过程需要结构化
interface AgentStep {
  stepNumber: number;
  thought: string;       // 我在想什么
  action: string;        // 我决定做什么（工具名或 FINAL_ANSWER）
  actionInput: unknown;  // 工具参数
  observation: string;   // 观察到的工具结果
  reflection?: string;   // 对结果的反思
  isFinal: boolean;      // 是否完成
}

interface AgentTrace {
  query: string;
  steps: AgentStep[];
  finalAnswer: string;
  totalSteps: number;
  totalDurationMs: number;
  tokensUsed: number;
}
```

---

## 第三层：进阶 Agent 系统（职业级）

### 3.1 Memory 系统

当前的"记忆"是对话历史 + 摘要。真正的 Agent 记忆有三层：

| 层级 | 含义 | 技术 | 你已有？ |
|---|---|---|---|
| **Working Memory** | 当前对话上下文 | 对话历史数组 | ✅ 已实现 |
| **Episodic Memory** | 过去的对话经验 | 向量数据库 + RAG | ❌ 需新增 |
| **Semantic Memory** | 持久化的知识和偏好 | 知识图谱 / 用户画像 | ❌ 需新增 |

**Episodic Memory 实现方案（基于 Supabase pgvector）：**

```sql
-- 在 Supabase 中启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 给 conversations 表添加 embedding
ALTER TABLE conversations ADD COLUMN embedding vector(1536);

-- 创建相似度搜索函数
CREATE OR REPLACE FUNCTION search_similar_conversations(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
) RETURNS TABLE (...) AS $$
  SELECT ...
  FROM conversations
  WHERE conversations.embedding <=> query_embedding < 1 - match_threshold
  ORDER BY conversations.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

**在你的项目里练手：** 给 `conversations` 表加 embedding 列，实现"搜索历史对话"功能。

### 3.2 Multi-Agent 系统

单一 Agent 有天花板。复杂任务需要多 Agent 协作：

```
┌─────────────────────────────────────────────────┐
│  Orchestrator Agent                              │
│  "用户想研究某股票，我需要：                      │
│   1. 搜索最新新闻 (→ Search Agent)                │
│   2. 分析财报数据 (→ Analyst Agent)               │
│   3. 综合生成报告 (→ Writer Agent)"              │
└──────────┬──────────┬──────────┐
           │          │          │
     Search Agent  Analyst Agent  Writer Agent
```

**关键模式：**

| 模式 | 描述 | 适用场景 |
|---|---|---|
| **Router** | 根据意图分发到不同 Agent | 多功能助手 |
| **Orchestrator** | 一个主控 Agent 调遣子 Agent | 复杂任务拆解 |
| **Debate/Review** | 多个 Agent 互相审查输出 | 需要高准确率 |
| **Swarm** | 多个同质 Agent 并行处理 | 大量相似任务 |

**在你的项目里练手：** 把现有 `agents.ts` 扩展为多 Agent，做一个 Router：

```typescript
// 扩展后的 agents.ts
const agents: AgentConfig[] = [
  {
    id: "router",
    name: "智能路由",
    systemPrompt: "你是路由 Agent。分析用户问题，选择最合适的专业 Agent 处理。",
    // ...
  },
  {
    id: "search-specialist",
    name: "搜索专家",
    systemPrompt: "你是搜索专家。擅长多轮搜索、关键词优化、信息交叉验证。",
    enableWebSearch: true,
  },
  {
    id: "coder",
    name: "编程助手",
    systemPrompt: "你是编程助手。擅长代码生成、Debug、架构设计。",
    // ...
  },
  {
    id: "writer",
    name: "写作助手",
    systemPrompt: "你是写作助手。擅长文章撰写、翻译、润色、总结。",
    // ...
  },
];
```

### 3.3 可观测性与评估（Observability & Eval）

这是生产 Agent 的必备能力，当前项目完全没有：

```
┌─────────────────────────────────────────────────────┐
│  可观测性三支柱                                       │
├─────────────────────────────────────────────────────┤
│  1. Tracing         │ 每次运行完整链路               │
│  2. Evaluation      │ 自动评估输出质量               │
│  3. Prompt Mgmt     │ 版本化管理和 A/B 测试           │
└─────────────────────────────────────────────────────┘
```

**推荐工具：**

| 工具 | 说明 | 部署方式 |
|---|---|---|
| **Langfuse** | 开源 LLM 可观测平台，支持 tracing/eval/prompt mgmt | 自部署（Docker） |
| **LangSmith** | LangChain 官方的可观测平台 | SaaS |
| **Braintrust** | Eval 框架 + 可观测 | SaaS / 自部署 |
| **Helicone** | 轻量级 API 网关 + 可观测 | SaaS |

### 3.4 MCP (Model Context Protocol)

MCP 是 Anthropic 提出的 Agent-工具连接标准协议。当前工具是硬编码在代码里的，MCP 让工具变成可插拔的服务：

```
你的 App ── MCP Client ──┬── MCP Server (文件系统)    → 读写本地文件
                         ├── MCP Server (数据库)      → 执行 SQL 查询
                         ├── MCP Server (GitHub API)  → 管理 Issues/PRs
                         ├── MCP Server (Slack)       → 发送消息
                         └── MCP Server (浏览器)      → 网页自动化
```

AI SDK v7 已支持 MCP tools 集成。在你的项目里接入一个 MCP server 试试。

### 3.5 安全与护栏（Guardrails）

当前项目在安全方面只做了基础的 JWT 认证。Agent 需要：

| 层面 | 防护措施 |
|---|---|
| **输入层** | Prompt injection 检测、敏感词过滤 |
| **执行层** | 工具调用权限控制、速率限制、超时 |
| **输出层** | 内容安全过滤、PII 脱敏、事实性检查 |
| **审计层** | 完整操作日志、异常行为告警 |

### 3.6 Provider 抽象与多模型路由

当前只用了 DeepSeek。生产环境需要：

```typescript
// 多模型路由
const modelRouter = {
  "deepseek-v4-flash": deepseek.chat("deepseek-v4-flash"),    // 日常对话
  "deepseek-v4-pro": deepseek.chat("deepseek-v4-pro"),        // 复杂推理
  "claude-fable-5": anthropic("claude-fable-5"),                // 长文本/代码
  "gpt-5-mini": openai("gpt-5-mini"),                           // 简单任务
};

function selectModel(task: Task): Model {
  if (task.complexity === "high") return modelRouter["claude-fable-5"];
  if (task.needsReasoning) return modelRouter["deepseek-v4-pro"];
  return modelRouter["deepseek-v4-flash"];
}
```

---

## 推荐学习顺序（Timeline）

```
第 1-2 周：Prompt Engineering 深化
  ├── 重写 system prompt（200+ 行，含 few-shot 示例）
  ├── 给每个工具写更精准的 description
  ├── 在你的项目里 A/B 测试不同 prompt 效果
  └── 阅读：Anthropic Prompt Engineering Guide

第 3-4 周：Agent Loop 手写
  ├── 用 AI SDK 的 generateText + 手动循环实现 ReAct
  ├── 添加 2-3 个新工具（网页抓取、文件读写、JSON 解析）
  ├── 实现工具链式调用 (search → fetch → summarize)
  └── 阅读：ReAct 论文 (Yao et al., 2022)

第 5-6 周：Memory & RAG
  ├── Supabase pgvector 集成
  ├── 对话 embedding 生成 + 相似搜索
  ├── 实现"根据历史对话回答问题"
  └── 阅读：RAG 相关论文和最佳实践

第 7-8 周：Multi-Agent & Eval
  ├── Router Agent + 多 Agent 配置
  ├── 接入 Langfuse tracing
  ├── 写 eval 脚本自动评估 Agent 输出
  └── 阅读：AutoGen / CrewAI 架构设计文档

第 9-12 周：生产化
  ├── 安全护栏（prompt injection 防护）
  ├── 多模型路由 + fallback
  ├── MCP 协议集成
  ├── 性能优化（caching, batching, 并行工具调用）
  └── 部署监控（token 消耗、延迟、错误率）

持续：读论文 & 关注前沿
  ├── ReAct, Plan-and-Solve, Reflexion, Tree of Thoughts
  ├── OpenAI Agents SDK, LangGraph, CrewAI 源码阅读
  └── Anthropic 的 Agent 最佳实践文档
```

---

## 推荐资源

### 必读论文

| 论文 | 核心贡献 |
|---|---|
| [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) | 奠定了 Reasoning + Acting 交替的 Agent 范式 |
| [Plan-and-Solve Prompting](https://arxiv.org/abs/2305.04091) | 先规划再执行的提示策略 |
| [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366) | Agent 自我反思和改进 |
| [Tree of Thoughts](https://arxiv.org/abs/2305.10601) | 树状搜索推理空间 |
| [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442) | Agent 记忆和行为的经典 |

### 框架 & 工具

| 名称 | 用途 |
|---|---|
| [Vercel AI SDK](https://sdk.vercel.ai/) | 你已在用 — 继续深入 `generateText`、`streamText`、`tool()` |
| [LangGraph](https://langchain-ai.github.io/langgraph/) | Agent 工作流编排（Python/JS） |
| [OpenAI Agents SDK](https://platform.openai.com/docs/guides/agents) | Agent 循环、工具、多 Agent 的参考实现 |
| [Langfuse](https://langfuse.com/) | 开源 LLM 可观测平台（tracing + eval + prompt mgmt） |
| [CrewAI](https://www.crewai.com/) | 多 Agent 编排框架 |

### 实践指南

| 资源 | 说明 |
|---|---|
| [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) | **必读** — Agent 设计原则和模式 |
| [OpenAI: A Practical Guide to Building Agents](https://platform.openai.com/docs/guides/agents) | Agent SDK 设计和最佳实践 |
| [Lilian Weng: LLM Powered Autonomous Agents](https://lilianweng.github.io/posts/2023-06-23-agent/) | Agent 系统综述（经典博文） |

---

## 总结：你的优势 & 最短路径

### 你不需要的

- ❌ 不需要从头学 Python（Node.js/TypeScript 生态已足够成熟）
- ❌ 不需要换框架（AI SDK + DeepSeek + Supabase 是完整的技术栈）
- ❌ 不需要从零写 Agent（已有 streaming、tool calling、persistence 基础设施）

### 你需要重点突破的

1. **思维模型转变**：从"请求-响应"变成"感知-规划-行动-反思"的自主循环
2. **Prompt Engineering**：这是 Agent 的"编程语言"，投入产出比最高
3. **Agent Loop 手写**：理解 AI SDK 底层发生了什么
4. **可观测性**：没有 tracing 的 Agent 是黑盒，无法调试和优化
5. **评估体系**：没有 eval 的 Agent 质量无法保证

### 第一步建议

在你的 Sapphire Studio 项目中：

> **手动实现一个 ReAct Loop**：让模型在给出最终答案前，能自己决定"我需要再搜一次"、"这个结果不够好，换个关键词"、"让我先计算再判断"——而不是一次 `streamText` 调完就结束。

这比学任何新框架都更重要。
