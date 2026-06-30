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
  | { type: "tool-call"; toolCallId: string; toolName: string; args: Record<string, unknown> }
  | { type: "tool-result"; toolCallId: string; toolName: string; result: unknown }
  | { type: "tool-error"; toolCallId: string; toolName: string; error: string }
  | { type: "done"; finishReason: string }
  | { type: "error"; error: string };
