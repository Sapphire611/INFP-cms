/**
 * Message service - manages chat messages in Supabase
 * Replaces localStorage-based persistence with server-side storage
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Message, ToolCallRecord } from "@/types/chat";

/**
 * Save a user message for a conversation
 */
export async function saveUserMessage(
  conversationId: string,
  content: string
): Promise<Message> {
  const messageId = crypto.randomUUID();
  const now = new Date();

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({
      id: messageId,
      conversation_id: conversationId,
      role: "user",
      content,
      tool_calls: [],
      created_at: now.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return transformMessage(data);
}

/**
 * Save an assistant message (with tool calls) for a conversation
 */
export async function saveAssistantMessage(
  conversationId: string,
  content: string,
  toolCalls: ToolCallRecord[] = []
): Promise<Message> {
  const messageId = crypto.randomUUID();
  const now = new Date();

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({
      id: messageId,
      conversation_id: conversationId,
      role: "assistant",
      content,
      tool_calls: toolCalls,
      created_at: now.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return transformMessage(data);
}

/**
 * Get messages for a conversation (paginated, oldest first)
 */
export async function getMessagesByConversationId(
  conversationId: string,
  page = 1,
  pageSize = 50
): Promise<{
  messages: Message[];
  total: number;
}> {
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await supabaseAdmin
    .from("messages")
    .select("*", { count: "exact" })
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  return {
    messages: (data ?? []).map(transformMessage),
    total: count ?? 0,
  };
}

/**
 * Delete all messages for a conversation (called when deleting conversation)
 */
export async function deleteMessagesByConversationId(
  conversationId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (error) throw error;
}

/**
 * Transform database record (snake_case) to TypeScript interface (camelCase)
 */
function transformMessage(data: any): Message {
  return {
    id: data.id,
    role: data.role,
    content: data.content,
    timestamp: new Date(data.created_at),
    toolCalls: (data.tool_calls as ToolCallRecord[]) ?? [],
  };
}
