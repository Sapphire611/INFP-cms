# Node.js 全栈 → AI Agent 工程师 学习路线图

> 基于 Sapphire Studio 项目现状，结合已有技术栈的务实进阶路径。
> 最后更新：2026-09-11（按代码核对，已实现的环节已删除，只留待办）

---

## 进度总览

| 环节 | 状态 | 代码位置 |
|---|---|---|
| 1.1 提示词工程 | ✅ 已完成 | `src/config/agents.ts` |
| 1.2 Tool Design 进阶 | ✅ 已完成 | `src/tools/` |
| **2.1 Agentic Loop** | ✅ **已完成**（含反思） | `src/services/chatService.ts` + `agentReflection.ts` |
| 2.2 工具组合与编排 | ⚠️ 结果验证已做，编排未做 | `src/services/agentReflection.ts` |
| 2.3 结构化输出 | ✅ 已做（trace 落在 `ToolCallRecord` 上） | `src/types/chat/index.ts` |
| 3.1 Memory | ⚠️ Working ✅ / Episodic ❌ | `src/services/summaryService.ts` |
| 3.2 Multi-Agent | ❌ 未实现（只有手动切换） | `src/config/agents.ts` |
| 3.3 可观测性与评估 | ❌ 未实现 | — |
| 3.4 MCP | ❌ 未实现 | — |
| 3.5 安全与护栏 | ⚠️ 仅基础（JWT + 工具超时 + calculate 沙箱） | `src/lib/jwt.ts` |
| 3.6 Provider 抽象与多模型路由 | ✅ 已完成 | `src/services/aiProviderService.ts` |

### 已删除的环节（已实现，不再需要学）

- **1.1 提示词工程** —— `agents.ts` 里两个 Agent 的 system prompt 已是完整结构（角色 → 可用工具 → 工作流程 → 决策规则 → 输出标准 → 行为底线），含防幻觉约束（禁止编造引用、标注来源）、工具调用状态反馈、搜索关键词策略的 few-shot 示例。
- **1.2 Tool Design 进阶** —— `src/tools/types.ts` 的 `ToolResult<T>` 就是本节要求的设计：`metadata { source, confidence, latencyMs }` + `error { code, retryable, fallback }`。`webSearch` 已实现错误分级（主源失败 → retryable → 降级另一个源；空结果 → 低 confidence）。本节建议的 `fetchWebPage` 工具（cheerio 解析正文）也已建好，`search → fetch → summarize` 链在 prompt 里已描述。
  **⚠️ 但有个当时没意识到的坑**：`confidence` 全是手写常数，不是算出来的 —— 详见 2.2 末尾。这个认知影响了整个反思机制的可信度。
- **2.1 Agentic Loop 全部** —— `chatService.ts` 手写 ReAct 循环 + `agentReflection.ts` 的反思步骤。详见下方 2.1。
- **3.1 的 Working Memory** —— 对话历史（`toModelMessages()`）+ 20 条触发摘要（`summaryService.ts`）已满足。
- **3.6 Provider 抽象** —— `aiProviderService.resolveApiConfig()`：CMS「模型管理」的平台优先，未配置回退 `DEEPSEEK_*` 环境变量；支持 DeepSeek / 智谱 GLM，密钥打码、连通性测试齐全。（**剩余未做**：按任务复杂度自动选模型的 `selectModel()` 路由，见第三层末尾。）

### 你的起点

| 已经会的 | 在项目里的体现 |
|---|---|
| LLM 调用 | DeepSeek / GLM via OpenAI 兼容 API |
| Tool Calling | 5 个工具，Zod schema + `ToolResult` 统一返回 |
| SSE 流式输出 | `streamText()` + fullStream 逐事件推送 |
| Agent 配置化 | system prompt / model / temperature 可切换 |
| 对话持久化 | Supabase messages + summaries 表 |
| 历史摘要 | 20 条触发自动摘要 |
| **手写 Agent 循环** | 自己转 ReAct 循环，不依赖 SDK 隐式行为 |
| 多平台凭证管理 | CMS 模型管理（DB 优先 + env 兜底） |

---

## 第二层：Agent 架构模式（核心转变）

这是从"带工具的聊天机器人"到"Agent"的关键跨越。

### 2.1 Agentic Loop（ReAct / Plan-Execute）

#### 已完成：循环本身（2026-09-11）

**之前坏在哪**：`streamText()` 没传 `stopWhen`，吃到 AI SDK v7 的默认值
`isStepCount(1)` —— 只跑一轮就退出：

```
1. 模型输出「正在搜索…」+ tool-call
2. 工具执行完，tool-result 返回
3. 循环结束 —— 模型根本没机会看到工具结果
```

工具结果永远进不到第二轮生成。当时靠 `generateForcedReply()`
（第二次不带工具的调用 + 手写 prompt 注入结果）打补丁。

**现在的实现**（`src/services/chatService.ts`）：

```ts
const STEP_STOP = isStepCount(1);        // 每轮只跑一步；循环是我们自己的
const workingMessages = [...messages];

for (let step = 1; step <= MAX_STEPS; step++) {
  const result = streamText({
    model, system, messages: workingMessages, tools, stopWhen: STEP_STOP,
  });

  for await (const chunk of result.fullStream) handleChunk(chunk, state, send);

  const calls = await result.toolCalls;
  if (calls.length === 0) break;                  // ← 正常出口：模型自己说完了

  workingMessages.push(...(await result.responseMessages));  // ← observation 回填
}
```

关键设计：

- **循环由我们转**，SDK 只负责"一步"。每步之间都是可以插手的代码位置。
- **正常出口是模型不再调工具**，不是步数。`MAX_STEPS`(12) 只是失控安全网 ——
  触发时才用一次无工具的 `streamText` 强制收尾。
- **`done` 整圈只发一次**（不是每轮），否则前端会在中间轮次就结束流。
- 每轮打 `[agent] 第 N 轮：<工具名>` 日志。
- 旧的 `generateForcedReply()` 已删除 —— 它是给转不起来的循环打的补丁。

回归测试：`src/__tests__/services/chatService.test.ts`（6 个用例，锁住轮次、
observation 回填、正常出口、安全网、done 只发一次）。

> ⚠️ **通用教训**：AI SDK v7 的 `streamText` 默认 `stopWhen: isStepCount(1)`。
> 不传 `stopWhen` 不等于"5 步"也不等于"无限"，而是**一轮**。文档里没写清楚的东西，
> 去 `node_modules/ai/dist/index.js` 里搜默认值。

#### 已完成：反思（Reflect）步骤（2026-09-11）

循环的第一版里"反思"是隐式的 —— 模型看到 observation 后自己决定继续还是收尾。
现在补上了独立的一步（`src/services/agentReflection.ts`），ReAct 的闭环完整了：

```
┌──────────────────────────────────────────┐
│  Agent Loop (你控制的)                    │
│                                          │
│  1. 思考 (Think)  → 分析当前状态         │
│  2. 规划 (Plan)   → 决定下一步做什么      │
│  3. 行动 (Act)    → 调用工具             │
│  4. 观察 (Observe)→ 解析工具结果          │
│  5. 反思 (Reflect)→ 结果是否正确   ✅ 已补 │
│  6. 判断是否完成   → 是则输出，否则回 1   │
└──────────────────────────────────────────┘
```

**实现方式**：循环里 `workingMessages.push(...responseMessages)` 之后调用
`appendReflectionIfNeeded()`，它读 `result.toolResults` 的 `output`，检查：

- `success === false` → 报出错误码，并按 `error.retryable` 区分「换参数重试可能有帮助」
  还是「同样的参数重试不会有帮助」
- `metadata.confidence < 0.75` → 报出「可信度低，可能不相关或信息不足」

**关键设计：这不是一次额外的 LLM 调用。** 每轮都调一次模型做自检，token 成本会翻倍；
而工具早就把判断依据放进了 `metadata`，代码层直接读就行。
模型拿到这条提示后自己决定是换关键词重试，还是诚实收尾。

阈值 0.75 是照着工具的**实际取值**定的：calculate/getCurrentTime 0.99、getWeather 0.92、
fetchWebPage 0.85、webSearch 0.85（结果充足）/ 0.75（降级）/ 0.7（结果偏少）/ 0.6（降级且结果少）
—— 0.75 这条线正好卡在「webSearch 没拿到足够结果」这个真实场景上，不是拍脑袋的数字。

> 到这里，1.2 里设计的 `ToolResult.metadata` 终于**有人消费**了 ——
> 在此之前它只是写给模型看的装饰。

**核心模式**（选型参考）：

| 模式 | 描述 | 适用场景 |
|---|---|---|
| **ReAct** | Reasoning + Acting 交替 | 需要多步推理 + 工具调用的任务 |
| **Plan-Execute** | 先制定完整计划，再逐步执行 | 目标明确的复杂任务 |
| **Reflection** | 执行后自检结果是否正确 | 需要高准确率的场景 |
| **ReWOO** | Reason Without Observation | 减少工具调用次数，提高效率 |

### 2.2 工具组合与编排

当前工具是扁平的：

```typescript
export const tools = { webSearch, getWeather, getCurrentTime, calculate, fetchWebPage };
```

Agent 需要：

| 能力 | 说明 | 现状 |
|---|---|---|
| **工具依赖图** | search → fetch_page → extract → analyze | 循环已支持，但靠 prompt 引导，无代码层编排 |
| **并行工具调用** | 同时查天气和搜索新闻 | 靠 SDK 默认行为，无显式控制 |
| **条件工具路由** | 根据上一步结果决定下一步用什么工具 | ❌ 无代码层逻辑 |
| **工具结果验证** | 检查工具返回是否有效，无效则重试或换方案 | ✅ 已做（`agentReflection.ts` 消费 `confidence` / `retryable`） |

**注意**：结果验证（`metadata.confidence` / `error.retryable`）已经在 2.1 的反思步骤里做了 ——
但**只做到了"告诉模型"**。真正让代码层主导重试（自动换关键词重跑一次，而不是提示模型去跑）
还没做，那属于本节的编排范畴。

#### ⚠️ 更根本的问题：confidence 是手写的，不是算出来的（2026-09-11）

反思整个建立在 `metadata.confidence` 上，但那个数字的真相是：

| 工具 | confidence | 怎么来的 |
|---|---|---|
| `calculate` / `getCurrentTime` | 0.99 | 写死的常数 |
| `getWeather` | 0.92 | 写死的常数 |
| `fetchWebPage` | 0.85 | 写死的常数 |
| `webSearch` | 0.85 / 0.7 / 0.75 / 0.6 | **唯一有逻辑的**：`结果条数 ≥3 ? 高 : 低`，再按主源/降级分档 |

**它是"来源可信度"的先验，不是"与问题相关性"的测量。** 搜到 10 条结果但完全答非所问，
照样拿 0.85——反思永远不会对"自信的跑题"报警。

而且阈值（`agentReflection.ts` 的 `CONFIDENCE_FLOOR = 0.8`）和这些取值分处两个文件，
**耦合关系没有任何机制保证**。曾经就因为「降级恰好等于 0.75 阈值」导致主源超时永远静默——
那不是巧合，是这个结构的必然产物。

**更真实的可信度可以加什么**（前两个基本免费）：

| 信号 | 怎么算 | 成本 |
|---|---|---|
| 关键词重合度 | query 词与标题/摘要的词重合比例 | 免费 |
| 域名多样性 | 结果来自几个不同域名 | 免费 |
| 跨源一致性 | Bing 和 DDG 是否返回重叠 URL | 一次额外请求 |
| LLM 判定 | 让模型给"这批结果和问题相关吗"打分 | 一次调用 |

> 注意最后一行是陷阱：**反思的整个设计前提就是"不做额外 LLM 调用"**，
> 再用一次调用去算可信度就本末倒置了。

**便宜的防线**：加个测试把两个文件钉在一起 ——
`expect(主源正常的 confidence).toBeGreaterThan(CONFIDENCE_FLOOR)`。
谁改了数字测试立刻红，而不是等用户看到满屏琥珀色告警。

### 2.3 结构化输出（Structured Output）—— ✅ 已完成（2026-09-11）

**实现方式：没有新建 `AgentTrace` 类型，而是把 trace 字段挂在了 `ToolCallRecord` 上**
（`src/types/chat/index.ts`）：

```typescript
export interface ToolCallRecord {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: "calling" | "done" | "error";

  // ── Agent trace 字段 ──
  step?: number;        // 第几轮（同轮并行调用共享）
  confidence?: number;  // 工具自报可信度
  latencyMs?: number;   // 工具自报耗时
  thought?: string;     // 调这个工具之前模型说了什么
  reflection?: string;  // 这一轮结果自检的结论
}
```

**为什么这么做**：`messages.tool_calls` 本来就是 JSONB，`ToolCallRecord[]` 原样落库、
原样通过 API 回给前端。挂在这上面意味着**零迁移、零新增列**，trace 自动获得了
持久化和前端渲染——凭空多出一个 `AgentTrace` 类型反而要新建表、改
`messageService`、改 API、改 store 一路铺过去。

代价是语义上略微不纯（`reflection` 是"轮"级别的，却重复挂在该轮的每条记录上）。
考虑到反思只在有工具调用的轮次产生、且提示里本来就点名了具体工具，
这个代价是可接受的。

**落地后能看到什么**（`chat-message.tsx` 按 `step` 分组渲染）：

```
┌ 第 1 轮 ────────────────────────────┐
│ 🧠 我需要先查一下天气…               │  ← thought
│ ✓ 已查询天气 城市: Beijing           │
│   可信度 92% · 320ms                 │  ← confidence / latency
│ ⚠️ 【结果自检】…（琥珀色告示）        │  ← reflection
└─────────────────────────────────────┘
┌ 第 2 轮 ────────────────────────────┐
│ ✓ 已数学计算 表达式: 22*9/5+32       │
└─────────────────────────────────────┘
```

只有一轮时不显示「第 1 轮」标题——那是噪声。服务端同时打一份 trace 汇总日志：

```
[agent] 完成：2 轮，2 次工具调用，8.5s
[agent]   step1 getWeather done confidence=0.92 320ms
[agent]   step2 calculate done confidence=0.99 1ms
[agent]   反思：未触发（所有结果自检通过）
```

**这一段修掉的真 bug**：反思阈值原本是 0.75，而 webSearch 降级（主源超时、
fallback 成功且结果充足）恰好返回 0.75 —— `0.75 < 0.75` 为假，
**主源挂掉这种最该知会用户的情况永远静默**。阈值改到 0.8，正好落在
工具取值表里"主源成功(0.85) / 降级(0.75)"的天然分界上。

**还没做的**：token 用量没进 trace（`streamText` 的 `usage` 没采集），
跨对话的 trace 查询/聚合也没有——那些属于 3.3。

---

## 第三层：进阶 Agent 系统（职业级）

### 3.1 Memory 系统（仅剩 Episodic / Semantic）

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

> **已有铺垫**：`docs/langchain-rag-integration-plan.md` 里已写了完整方案
> （百炼 `text-embedding-v3` + LangChain + pgvector），依赖
> `@langchain/core` / `@langchain/openai` / `@langchain/textsplitters` / `langchain` / `cheerio`
> 都已装好，但 `src/lib/embeddings.ts` 和迁移文件都还没建 —— **规划有了，代码没写。**

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

**现状**：`agents.ts` 有 2 个 Agent（`default` / `deep-think`），但靠用户在侧边栏**手动切换**
—— 这是"手动路由"，不是 Router Agent。真正的 Router 得让模型自己判断该用哪个。

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

**现状**：唯一的可观测性是 `ToolResult.metadata`（source / confidence / latencyMs）、
`[agent] 第 N 轮` 的 console 日志，和 `console.error`。
工具跑了几毫秒、花了多少 token、哪一步失败了，都没有落盘。

**推荐工具：**

| 工具 | 说明 | 部署方式 |
|---|---|---|
| **Langfuse** | 开源 LLM 可观测平台，支持 tracing/eval/prompt mgmt | 自部署（Docker） |
| **LangSmith** | LangChain 官方的可观测平台 | SaaS |
| **Braintrust** | Eval 框架 + 可观测 | SaaS / 自部署 |
| **Helicone** | 轻量级 API 网关 + 可观测 | SaaS |

> 和 2.3 的 `AgentTrace` 一起做最划算：先把 trace 结构化落库，再接 Langfuse。

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

**现状**：只有 JWT 认证 + 各工具的 `AbortSignal.timeout` + `calculate` 的沙箱
（allowlist Math 函数，无全局访问）。其余全缺。

| 层面 | 防护措施 | 现状 |
|---|---|---|
| **输入层** | Prompt injection 检测、敏感词过滤 | ❌ |
| **执行层** | 工具调用权限控制、速率限制、超时 | ⚠️ 仅超时 |
| **输出层** | 内容安全过滤、PII 脱敏、事实性检查 | ❌ |
| **审计层** | 完整操作日志、异常行为告警 | ❌ |

> `webSearch` / `fetchWebPage` 会抓取任意外部网页内容并喂给模型 —— 这是最典型的
> prompt injection 入口（网页里写"忽略之前的指令"）。**循环修好之后，这个风险变大了**：
> 以前模型只跑一轮、看到工具结果的路径有限；现在工具结果会实打实地回填进上下文并
> 影响后续所有轮次的决策。做这一层时优先堵这里。

### 3.6 剩余部分：自动模型路由

Provider 抽象（多平台 + 凭证管理 + 解析顺序）已完成。**剩下的是本节后半段 ——
按任务特征自动选模型**：

```typescript
const modelRouter = {
  "deepseek-v4-flash": deepseek.chat("deepseek-v4-flash"),    // 日常对话
  "deepseek-v4-pro": deepseek.chat("deepseek-v4-pro"),        // 复杂推理
  "claude-fable-5": anthropic("claude-fable-5"),              // 长文本/代码
  "gpt-5-mini": openai("gpt-5-mini"),                         // 简单任务
};

function selectModel(task: Task): Model {
  if (task.complexity === "high") return modelRouter["claude-fable-5"];
  if (task.needsReasoning) return modelRouter["deepseek-v4-pro"];
  return modelRouter["deepseek-v4-flash"];
}
```

**现状**：模型选择是"用户选 Agent → Agent 声明偏好 model → 当前平台决定最终 model"，
没有基于任务复杂度/成本的自动路由，也没有跨平台 fallback。

---

## 推荐学习顺序（Timeline，已按实际进度重排）

```
现在 → 第 2 周：用起来 + 攒数据 ★ 最高优先级
  ├── 拿真实对话检验：反思触发后模型到底换没换关键词？
  ├── 0.8 这个阈值吵不吵？（DDG 抽风时每轮都提示，可能反而浪费轮次）
  ├── 把 token 用量也记进 trace（现在是空白）
  └── 阅读：ReAct 论文 / Reflexion 论文（对照自己的实现看）

第 3-4 周：工具编排
  ├── 代码层主导重试：confidence 低时自动换关键词重跑，而不是提示模型去跑
  ├── 实现工具链式调用 (search → fetch → summarize) 的显式编排
  ├── 条件路由：根据上一步结果决定下一步用哪个工具
  └── webSearch 的两个源目前是"主源失败才降级"，可以考虑并行竞速

第 5-6 周：Memory & RAG
  ├── 按 docs/langchain-rag-integration-plan.md 走（依赖已装，写代码即可）
  ├── Supabase pgvector 集成 + 百炼 text-embedding-v3
  ├── 对话 embedding 生成 + 相似搜索
  ├── 实现"根据历史对话回答问题"
  └── 阅读：RAG 相关论文和最佳实践

第 7-8 周：Multi-Agent & Eval
  ├── Router Agent + 多 Agent 配置（从手动切换 → 模型自动分发）
  ├── 接入 Langfuse tracing（喂 AgentTrace）
  ├── 写 eval 脚本自动评估 Agent 输出
  └── 阅读：AutoGen / CrewAI 架构设计文档

第 9-12 周：生产化
  ├── 安全护栏（prompt injection 防护，优先 webSearch/fetchWebPage 入口）
  ├── 速率限制 + 审计日志
  ├── 自动模型路由 + 跨平台 fallback
  ├── MCP 协议集成
  ├── 性能优化（caching, batching）
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
| [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366) | Agent 自我反思和改进 ← **下一步做反思时读这篇** |
| [Tree of Thoughts](https://arxiv.org/abs/2305.10601) | 树状搜索推理空间 |
| [Generative Agents: Interactive Simulacra of Human Behavior](https://arxiv.org/abs/2304.03442) | Agent 记忆和行为的经典 |

### 框架 & 工具

| 名称 | 用途 |
|---|---|
| [Vercel AI SDK](https://sdk.vercel.ai/) | 你已在用 — 继续深入 `generateText`、`streamText`、`stopWhen`、`tool()` |
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
- ❌ 不需要再练 提示词工程 / 工具设计 / 多平台凭证管理 / Agent 循环与反思（已完成，见进度总览）

### 你需要重点突破的

1. **可观测性**：过程能在界面上回放了，但数据只跟着单条消息走 ——
   没法回答"最近 100 次对话里反思触发了多少次、模型照做了几次"
2. **评估体系**：没有 eval 的 Agent 质量无法保证
3. **代码层编排**：现在重试的决策权交给了模型（我们只提示）；下一步是让代码自己重跑
4. **阈值需要数据才能调**：0.8 是照着工具取值表推出来的，不是测出来的

### 第一步建议

ReAct 闭环完整了，过程也能在界面上一步步看到。下一步最有价值的是**攒数据评估自己**：

现在反思触发了多少次、模型有没有照做、0.8 这个阈值吵不吵 —— 全都是靠感觉。
trace 已经落在 `messages.tool_calls` 里了，写个查询就能统计：

```sql
-- 反思触发率
SELECT
  COUNT(*) FILTER (WHERE tc->>'reflection' IS NOT NULL) AS reflected,
  COUNT(*) AS total
FROM messages m, jsonb_array_elements(m.tool_calls) tc
WHERE m.created_at > now() - interval '7 days';
```

跑上一周，再决定阈值要不要调、反思提示词要不要改。
**没有数据的调参就是瞎猜**——这正好把你推向 3.3（Langfuse tracing + eval）。
