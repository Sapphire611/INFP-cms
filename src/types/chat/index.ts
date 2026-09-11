/**
 * Chat feature type definitions
 */

export interface SearchSource {
  title: string;
  url: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  /** Tool calls initiated by the assistant (for rendering) */
  toolCalls?: ToolCallRecord[];
  /** Search sources for web search results */
  sources?: SearchSource[];
  /** Whether this message is still being streamed */
  isStreaming?: boolean;
}

export interface ToolCallRecord {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: "calling" | "done" | "error";

  // ── Agent trace 字段 ────────────────────────────────────
  // 这些字段随 tool_calls 一起存进 messages 表（JSONB），
  // 用来事后回答"这一轮到底发生了什么、反思为什么没触发"。
  /** 属于 Agent 循环的第几轮（从 1 开始）。同轮并行调用的工具共享同一个 step */
  step?: number;
  /** 工具自报的可信度，来自 ToolResult.metadata.confidence */
  confidence?: number;
  /** 工具自报的执行耗时，来自 ToolResult.metadata.latencyMs */
  latencyMs?: number;
  /** 调用这个工具之前模型输出的那段话（它的"思考"） */
  thought?: string;
  /** 这一轮结果自检的结论。undefined = 自检通过，没发现问题 */
  reflection?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ConversationSummary {
  id: string;
  conversationId: string;
  summaryText: string;
  messageCount: number;
  createdAt: Date;
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
  agentId: string;
  conversationHistory?: Message[];
}

export interface SendMessageResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface CreateConversationRequest {
  title?: string;
  model?: string;
  agentId?: string;
}

export interface UpdateConversationRequest {
  title?: string;
}

/** SSE stream event types from /api/chat */
export type ChatStreamEvent =
  | { type: "text"; content: string }
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
      /** Agent 循环第几轮，前端据此把工具调用分组显示 */
      step?: number;
      /** 调用前模型输出的那段话 */
      thought?: string;
    }
  | {
      type: "tool-result";
      toolCallId: string;
      toolName: string;
      result: unknown;
      /** 工具自报可信度，前端展示结果可靠程度 */
      confidence?: number;
      latencyMs?: number;
    }
  | {
      type: "tool-error";
      toolCallId: string;
      toolName: string;
      error: string;
      step?: number;
    }
  /** 结果自检发现问题，这一轮被打上了反思标记 */
  | { type: "reflection"; step: number; content: string }
  | { type: "done"; finishReason: string }
  | { type: "error"; error: string };
