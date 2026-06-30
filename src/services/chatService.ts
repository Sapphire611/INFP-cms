/**
 * Chat service - integrates with DeepSeek via Vercel AI SDK v7
 * Supports streaming responses with tool calling (weather, time, calculate, etc.)
 */

import { streamText, isStepCount, type ModelMessage } from "ai";
import type { Message } from "@/types/chat";
import { deepseek, CHAT_MODEL } from "@/lib/ai-client";
import { chatTools } from "@/services/chatTools";
import { getAgent } from "@/config/agents";
import {
  updateConversationTimestamp,
} from "./conversationService";
import { createSummary } from "./summaryService";

const DEFAULT_SYSTEM_PROMPT = `你是 INFP-CMS 的 AI 助手。你拥有以下能力：
- 联网搜索（webSearch）：获取实时最新信息，如近期活动、景点推荐、攻略、新闻等
- 查询天气（getWeather）：查询全球城市的实时天气
- 获取时间（getCurrentTime）：获取任意时区的当前时间
- 数学计算（calculate）：执行复杂的数学运算

## 重要规则
1. **默认联网**：当用户询问的信息可能随时间变化（推荐、攻略、活动、新闻、实时数据等），必须先调用 webSearch 获取最新结果，再基于搜索结果回答。
2. **关键词拆分**：如果搜索一个主题不够全面，可以多次调用 webSearch 用不同关键词搜索。
3. 回答时请使用中文，保持简洁专业，引用搜索结果中的具体信息。`;

/**
 * Convert app Message[] to AI SDK ModelMessage[]
 */
function toModelMessages(messages: Message[], currentMessage: string): ModelMessage[] {
  const modelMessages: ModelMessage[] = [];

  // Add conversation history (exclude system messages)
  for (const msg of messages) {
    if (msg.role === "user") {
      modelMessages.push({
        role: "user",
        content: msg.content,
      });
    } else if (msg.role === "assistant") {
      modelMessages.push({
        role: "assistant",
        content: msg.content,
      });
    }
  }

  // Add current user message
  modelMessages.push({
    role: "user",
    content: currentMessage,
  });

  return modelMessages;
}

/**
 * Stream a chat response with tool calling support
 * Returns a ReadableStream of SSE events (text/event-stream)
 */
export async function streamChatResponse(
  conversationId: string,
  userMessage: string,
  agentId: string,
  conversationHistory: Message[]
): Promise<ReadableStream<Uint8Array>> {
  const agent = getAgent(agentId);
  const messages = toModelMessages(conversationHistory, userMessage);

  const result = streamText({
    model: deepseek.chat(agent?.model ?? CHAT_MODEL),
    system: agent?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    messages,
    tools: chatTools,
    temperature: agent?.temperature ?? 0.7,
    stopWhen: isStepCount(5),
  });

  // Convert fullStream to SSE
  const encoder = new TextEncoder();
  let streamFinished = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of result.fullStream) {
          switch (chunk.type) {
            case "text-delta":
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: chunk.text })}\n\n`
                )
              );
              break;

            case "tool-call":
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool-call",
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    args: chunk.input,
                  })}\n\n`
                )
              );
              break;

            case "tool-result":
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool-result",
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    result: chunk.output,
                  })}\n\n`
                )
              );
              break;

            case "tool-error":
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool-error",
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    error: String(chunk.error),
                  })}\n\n`
                )
              );
              break;

            case "error":
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    error: String(chunk.error),
                  })}\n\n`
                )
              );
              break;

            case "finish":
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "done",
                    finishReason: chunk.finishReason,
                  })}\n\n`
                )
              );
              streamFinished = true;
              break;
          }
        }

        if (!streamFinished) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "done", finishReason: "unknown" })}\n\n`
            )
          );
        }

        controller.close();

        // Post-stream side effects (non-blocking)
        updateConversationTimestamp(conversationId).catch(() => {
          // Supabase may be unreachable in some network environments (e.g. China),
          // but this is non-critical — the conversation still works fine.
        });

        checkAndSummarizeIfNeeded(conversationId, conversationHistory);
      } catch (error) {
        console.error("Stream error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Stream error",
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return stream;
}

// ─── Summarization ─────────────────────────────────────────

async function checkAndSummarizeIfNeeded(
  conversationId: string,
  conversationHistory: Message[]
): Promise<void> {
  const SUMMARIZATION_THRESHOLD = 20;

  if (conversationHistory.length >= SUMMARIZATION_THRESHOLD) {
    const messagesToSummarize = conversationHistory.slice(
      0,
      Math.floor(conversationHistory.length / 2)
    );

    if (messagesToSummarize.length > 0) {
      try {
        await createSummary(
          conversationId,
          messagesToSummarize.map((m) => ({ role: m.role, content: m.content })),
          messagesToSummarize.length
        );
      } catch (error) {
        console.error("Error generating summary:", error);
      }
    }
  }
}
