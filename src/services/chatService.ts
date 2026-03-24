/**
 * Chat service - integrates with DeepSeek API
 */

import OpenAI from "openai";
import {
  updateConversationTimestamp,
} from "./conversationService";
import { createSummary } from "./summaryService";
import type { Message } from "@/types/chat";

// Note: generateSummary has been moved to summaryService to avoid circular dependency

// Lazy initialization of DeepSeek client to avoid build errors
function getDeepSeekClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
  });
}

/**
 * Send a message to DeepSeek and get response
 */
export async function sendMessage(
  conversationId: string,
  userMessage: string,
  conversationHistory: Message[]
): Promise<{ content: string }> {
  try {
    // Build context with current conversation
    const messages = buildContextForAPI(conversationHistory, userMessage);

    // Get client and call DeepSeek API
    const client = getDeepSeekClient();
    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const assistantMessage = completion.choices[0]?.message?.content ?? "";

    // Update conversation timestamp
    await updateConversationTimestamp(conversationId);

    // Check if summarization is needed
    await checkAndSummarizeIfNeeded(conversationId, conversationHistory);

    return { content: assistantMessage };
  } catch (error) {
    console.error("Error calling DeepSeek API:", error);
    throw new Error("Failed to get AI response. Please try again.");
  }
}

/**
 * Build messages array for DeepSeek API call
 * Currently includes system prompt and current conversation
 */
function buildContextForAPI(
  conversationHistory: Message[],
  currentMessage: string
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful AI assistant. Provide clear, concise, and accurate responses.",
    },
  ];

  // Add conversation history (excluding system messages)
  for (const msg of conversationHistory) {
    if (msg.role !== "system") {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add current message
  messages.push({
    role: "user",
    content: currentMessage,
  });

  return messages;
}

// Note: generateSummary has been moved to summaryService to avoid circular dependency
// Use summaryService.createSummary() instead

/**
 * Check if conversation needs summarization
 * Trigger conditions:
 * - Message count >= 20
 * TODO: Add 7 days inactive check (requires tracking last message time)
 */
async function checkAndSummarizeIfNeeded(
  conversationId: string,
  conversationHistory: Message[]
): Promise<void> {
  const SUMMARIZATION_THRESHOLD = 20;

  if (conversationHistory.length >= SUMMARIZATION_THRESHOLD) {
    // Summarize the first half of messages
    const messagesToSummarize = conversationHistory.slice(0, Math.floor(conversationHistory.length / 2));

    if (messagesToSummarize.length > 0) {
      try {
        await createSummary(
          conversationId,
          messagesToSummarize,
          messagesToSummarize.length
        );
        console.log(`Generated summary for conversation ${conversationId}`);
      } catch (error) {
        console.error("Error generating summary:", error);
        // Don't throw - summarization failure shouldn't break chat
      }
    }
  }
}
