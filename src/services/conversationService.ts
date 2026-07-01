/**
 * Conversation service - manages conversation metadata in Supabase
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Conversation, CreateConversationRequest } from "@/types/chat";

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  data: CreateConversationRequest = {}
): Promise<Conversation> {
  const { data: conversation, error } = await supabaseAdmin
    .from("conversations")
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      title: data.title ?? "新对话",
      model: data.model ?? "deepseek-v4-flash",
      agent_id: data.agentId ?? "default",
    })
    .select()
    .single();

  if (error) throw error;

  return transformConversation(conversation);
}

/**
 * Get conversations by user ID with pagination
 */
export async function getConversationsByUserId(
  userId: string,
  page = 1,
  pageSize = 20
): Promise<{
  conversations: Conversation[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabaseAdmin
    .from("conversations")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) throw error;

  const conversations = data?.map(transformConversation) ?? [];

  return {
    conversations,
    pagination: {
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  };
}

/**
 * Get a single conversation by ID
 */
export async function getConversationById(
  id: string
): Promise<Conversation | null> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw error;
  }

  return transformConversation(data);
}

/**
 * Delete a conversation by ID
 */
export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("conversations")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Update conversation timestamp (called when new message is sent)
 */
export async function updateConversationTimestamp(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  id: string,
  title: string
): Promise<Conversation> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .update({ title })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return transformConversation(data);
}

/**
 * Transform database record to TypeScript interface
 * Converts snake_case to camelCase
 */
function transformConversation(data: any): Conversation {
  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    model: data.model,
    agentId: data.agent_id ?? "default",
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
