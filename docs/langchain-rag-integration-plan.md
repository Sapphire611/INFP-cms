# LangChain.js RAG 集成方案

> 在 Sapphire Studio 项目中集成 LangChain.js，实现文档知识库 Q&A。
> 最后更新：2026-07-17

---

## 背景

- 当前项目使用 Vercel AI SDK v7 + DeepSeek，已具备流式对话 + 工具调用能力
- 希望引入 LangChain.js 来学习其核心概念（TextSplitter、Embeddings、VectorStore、PromptTemplate、Chain）
- 选择 **RAG（检索增强生成）** 作为切入点：上传文档 → 自动切分 → 向量化存储 → 聊天中智能检索
- 用**阿里云百炼（DashScope）**做 embedding，因为已有 `DASHSCOPE_API_KEY`（和 `deepseek-eyes` skill 同一家）

---

## 要安装的包

```bash
npm install langchain @langchain/textsplitters @langchain/openai
```

| 包 | 用途 |
|---|---|
| `langchain` | PromptTemplate、RunnableSequence 等核心抽象 |
| `@langchain/textsplitters` | RecursiveCharacterTextSplitter，把长文档切成小块 |
| `@langchain/openai` | OpenAIEmbeddings，Python 只改 baseURL 指向百炼 |

> 不装 `langchain` 全家桶，只用 3 个包。现有的 AI SDK 流式对话完全不动。

---

## 核心原理（数据流）

### 文档录入（你上传时触发）

```
文本内容
  │
  ▼
RecursiveCharacterTextSplitter  ← LangChain
（按段落→句子→字符递归切分，每块 ~500 字）
  │
  ▼
OpenAIEmbeddings                ← @langchain/openai
（每块文本 → 1536 维向量，实际指向百炼 API）
  │
  ▼
Supabase pgvector               ← 已有的 Supabase
（向量 + 原文一起存进去）
```

### RAG 查询（用户问问题时自动触发）

```
用户问题: "我的项目用的什么模型？"
  │
  ▼
OpenAIEmbeddings                ← 把问题也向量化
  │
  ▼
Supabase 余弦相似度搜索          ← pgvector <=> 算子
（找到最相关的 5 个文档片段）
  │
  ▼
PromptTemplate                  ← LangChain
"根据以下文档回答用户问题：
 [片段1] [片段2] [片段3] ...
 用户问题：xxx"
  │
  ▼
DeepSeek 生成回答               ← 已有的 AI SDK
（通过现有的 SSE 流式返回）
```

---

## 文件变更清单

```
新增文件:
  supabase/migrations/20260717_add_pgvector_and_documents.sql  ← DB 迁移
  src/lib/embeddings.ts              ← 百炼 Embeddings 客户端
  src/services/documentService.ts    ← 文档录入管道 (LangChain 核心)
  src/services/ragService.ts         ← RAG 查询管道
  src/app/api/documents/route.ts     ← POST 上传 / GET 列表
  src/app/api/documents/[id]/route.ts← DELETE 删除

修改文件:
  src/services/chatTools.ts          ← 新增 queryDocuments 工具
  src/config/agents.ts               ← system prompt 加入知识库能力
```

**现有代码零破坏。** RAG 只是新增一个工具，和现有 `webSearch`、`getWeather` 平行。

---

## 数据库迁移

pgvector 是 Supabase 自带的扩展，只需启用 + 建表：

```sql
-- 1. 启用向量扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 文档元数据表
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 文档片段表（核心！存向量 + 原文）
CREATE TABLE document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,       -- 第几段
  content TEXT NOT NULL,              -- 原文
  embedding vector(1536),             -- 1536 维向量
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 向量相似度搜索索引（IVFFlat 近似搜索）
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

在 Supabase SQL Editor 里跑一次即可。

---

## Embeddings：阿里百炼 vs OpenAI

| | OpenAI | 阿里百炼 |
|---|---|---|
| 注册门槛 | 境外信用卡 | 支付宝/微信 |
| 免费额度 | $5（新账号） | 有（新用户） |
| 模型 | `text-embedding-3-small` | `text-embedding-v3` |
| 向量维度 | 1536 | 1024 |
| API 兼容 | 原生 | 兼容 OpenAI 格式 |
| 本项目可用？ | 需额外 Key | ✅ 已有 `DASHSCOPE_API_KEY` |

**选择百炼**：已有 Key，零额外成本。

### 百炼 Embeddings 客户端

```typescript
// src/lib/embeddings.ts
import { OpenAIEmbeddings } from "@langchain/openai";

export const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-v3",
  apiKey: process.env.DASHSCOPE_API_KEY,
  configuration: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
});
```

> `@langchain/openai` 的 `OpenAIEmbeddings` 可以通过 `baseURL` 指向任何兼容 OpenAI 格式的服务，百炼完全兼容。

---

## 服务层设计

### documentService.ts — 文档录入管道

```typescript
// 核心流程：接收文本 → 切分 → 向量化 → 存库
export async function ingestDocument(title: string, content: string) {
  // 1. 创建 document 记录
  // 2. RecursiveCharacterTextSplitter 切分
  // 3. OpenAIEmbeddings.embedDocuments() 批量向量化
  // 4. INSERT INTO document_chunks (embedding 用 pgvector 存储)
}
```

### ragService.ts — RAG 查询管道

```typescript
// 核心流程：问题向量化 → 相似搜索 → 拼 prompt → LLM 生成
export async function queryDocuments(question: string, topK = 5) {
  // 1. embeddings.embedQuery(question) → 向量
  // 2. Supabase 余弦相似度搜索（<=> 算子）
  // 3. PromptTemplate.format({ context, question })
  // 4. generateText() → 返回答案
}
```

---

## 聊天工具集成

```typescript
// src/services/chatTools.ts — 新增
export const queryDocuments = tool({
  description:
    "搜索知识库中的文档，获取项目相关信息。当用户询问关于项目、文档、技术方案等问题时调用。",
  inputSchema: z.object({
    question: z.string().describe("要查询的问题"),
  }),
  execute: async (input) => {
    return await queryDocuments(input.question);
  },
});

// 注册
export const chatTools = {
  webSearch,
  getWeather,
  getCurrentTime,
  calculate,
  queryDocuments,  // ← 新增
};
```

用户对话时模型自动判断要不要查知识库，和调 `webSearch` 的逻辑完全一样。

---

## 你将学到的 LangChain 概念

| 概念 | 在哪里用到 | 一句话解释 |
|---|---|---|
| **Document** | `documentService.ts` | LangChain 统一的数据载体 `{ pageContent, metadata }` |
| **TextSplitter** | `documentService.ts` | 把长文本切成语义完整的 chunks |
| **Embeddings** | `embeddings.ts` | 文本 → 数学向量，语义相近的文本向量也相近 |
| **VectorStore** | `ragService.ts` | 存向量 + 做相似度搜索 |
| **PromptTemplate** | `ragService.ts` | 模板化 prompt，变量注入 `{context}`, `{question}` |
| **RunnableSequence** | `ragService.ts` | 链式调用：检索 → 拼 prompt → 调 LLM |

---

## 环境变量

```bash
# .env.local 新增
DASHSCOPE_API_KEY=sk-xxx    # 已有，和 deepseek-eyes skill 共用
```

不需要额外申请任何 Key。

---

## 相关资源

- [LangChain.js 文档](https://js.langchain.com/)
- [阿里百炼 Embedding 文档](https://help.aliyun.com/zh/model-studio/text-embedding)
- [Supabase pgvector 指南](https://supabase.com/docs/guides/ai)
- [学习路线图](./ai-agent-learning-roadmap.md)
