/**
 * Summary service - manages conversation summaries in Supabase
 */

import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ConversationSummary } from "@/types/chat";

// Lazy initialization of DeepSeek client to avoid build errors
function getDeepSeekClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
  });
}

/**
 * Generate a summary using DeepSeek
 */
async function generateSummaryText(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  try {
    const client = getDeepSeekClient();
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "请用简洁的中文总结以下对话的主要内容，包括讨论的主题和关键结论。格式：【日期范围】讨论了XX主题，涉及YY内容。",
        },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        })),
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content ?? "对话摘要生成失败";
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("Failed to generate summary");
  }
}

/**
 * Create a summary for a conversation
 */
export async function createSummary(
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  messageCount: number
): Promise<ConversationSummary> {
  // Generate summary using DeepSeek
  const summaryText = await generateSummaryText(messages);

  // Save to database
  const { data, error } = await supabaseAdmin
    .from("conversation_summaries")
    .insert({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      summary_text: summaryText,
      message_count_summary: messageCount,
    })
    .select()
    .single();

  if (error) throw error;

  return transformSummary(data);
}

/**
 * Get all summaries for a conversation
 */
export async function getSummariesByConversationId(
  conversationId: string
): Promise<ConversationSummary[]> {
  const { data, error } = await supabaseAdmin
    .from("conversation_summaries")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(transformSummary);
}

/**
 * Get summaries for multiple conversations
 */
export async function getSummariesByConversationIds(
  conversationIds: string[]
): Promise<ConversationSummary[]> {
  if (conversationIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("conversation_summaries")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(transformSummary);
}

/**
 * Delete a summary by ID
 */
export async function deleteSummary(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("conversation_summaries")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Transform database record to TypeScript interface
 * Converts snake_case to camelCase
 */
function transformSummary(data: any): ConversationSummary {
  return {
    id: data.id,
    conversationId: data.conversation_id,
    summaryText: data.summary_text,
    messageCount: data.message_count_summary,
    createdAt: new Date(data.created_at),
  };
}
