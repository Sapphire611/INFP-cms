/**
 * Chat feature type definitions
 */

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
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
}

export interface UpdateConversationRequest {
  title?: string;
}
