/**
 * Chat service - integrates with DeepSeek via Vercel AI SDK v7
 * Supports streaming responses with tool calling (weather, time, calculate, etc.)
 * Persists messages to Supabase (no localStorage dependency)
 */

import { streamText, generateText, type ModelMessage } from "ai";
import OpenAI from "openai";
import type { Message, ToolCallRecord } from "@/types/chat";
import { deepseek, CHAT_MODEL } from "@/lib/ai-client";
import { chatTools } from "@/services/chatTools";
import { getAgent, getDefaultAgent } from "@/config/agents";
import {
  updateConversationTimestamp,
  updateConversationTitle,
} from "./conversationService";
import { createSummary } from "./summaryService";
import {
  saveUserMessage,
  saveAssistantMessage,
} from "./messageService";

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
 * Stream a chat response with tool calling support.
 * Server-side: saves user message before stream, assistant message after stream.
 * Returns a ReadableStream of SSE events (text/event-stream).
 */
export async function streamChatResponse(
  conversationId: string,
  userId: string,
  userMessage: string,
  agentId: string,
  conversationHistory: Message[]
): Promise<ReadableStream<Uint8Array>> {
  const agent = getAgent(agentId) ?? getDefaultAgent();
  const messages = toModelMessages(conversationHistory, userMessage);

  const encoder = new TextEncoder();

  // ── 1. Save user message to Supabase (fire-and-forget) ──
  saveUserMessage(conversationId, userMessage).catch((err) => {
    console.error("Failed to save user message:", err);
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantContent = "";
      const toolCallRecords: ToolCallRecord[] = [];
      let streamFinished = false;

      const result = streamText({
        model: deepseek.chat(agent.model),
        system: agent.systemPrompt,
        messages,
        tools: chatTools,
        temperature: agent.temperature,
      });

      try {
        for await (const chunk of result.fullStream) {
          switch (chunk.type) {
            case "text-delta":
              assistantContent += chunk.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: chunk.text })}\n\n`
                )
              );
              break;

            case "tool-call":
              toolCallRecords.push({
                id: chunk.toolCallId,
                toolName: chunk.toolName,
                args: chunk.input as Record<string, unknown>,
                status: "calling",
              });
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
              // Update matching tool call record
              const tcResultIdx = toolCallRecords.findIndex(
                (tc) => tc.id === chunk.toolCallId
              );
              if (tcResultIdx !== -1) {
                toolCallRecords[tcResultIdx] = {
                  ...toolCallRecords[tcResultIdx],
                  result: chunk.output,
                  status: "done",
                };
              }
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

            case "tool-error": {
              // Update matching tool-call record or create new one
              const tcErrIdx = toolCallRecords.findIndex(
                (tc) => tc.id === chunk.toolCallId
              );
              if (tcErrIdx !== -1) {
                toolCallRecords[tcErrIdx] = {
                  ...toolCallRecords[tcErrIdx],
                  result: String(chunk.error),
                  status: "error",
                };
              } else {
                toolCallRecords.push({
                  id: chunk.toolCallId,
                  toolName: chunk.toolName,
                  args: {},
                  result: String(chunk.error),
                  status: "error",
                });
              }
            }
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

        // ── 3. Adaptive fallback: if model answer is too short after tool calls, force a reply ──
        const isTooShort =
          assistantContent.length < 30 && toolCallRecords.length > 0;
        if (!assistantContent || isTooShort) {
          try {
            const forcedReply = await generateForcedReply(
              userMessage,
              assistantContent,
              toolCallRecords
            );
            if (forcedReply) {
              // Send as delta so client appends it to the existing message
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: forcedReply })}\n\n`
                )
              );
              assistantContent = (assistantContent || "") + forcedReply;
            }
          } catch {
            if (!assistantContent) {
              assistantContent =
                "抱歉，未能生成有效回复。请尝试换个方式提问。";
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", content: assistantContent })}\n\n`
                )
              );
            }
          }
        }

        // ── 4. Save assistant message to Supabase ──
        if (assistantContent) {
          saveAssistantMessage(conversationId, assistantContent, toolCallRecords).catch(
            (err) => {
              console.error("Failed to save assistant message:", err);
            }
          );
        }

        controller.close();

        // ── 4. Generate title after stream fully ends (non-blocking) ──
        if (conversationHistory.length === 0 && assistantContent) {
          generateAndSaveTitle(conversationId, userMessage, assistantContent).catch(
            (err) => {
              console.error("Failed to generate conversation title:", err);
            }
          );
        }

        // ── 5. Post-stream side effects (non-blocking) ──
        updateConversationTimestamp(conversationId).catch(() => {});
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

// ─── Title Generation ──────────────────────────────────────

/**
 * Generate a conversation title and save to DB.
 * Called AFTER the stream is fully closed — never blocks the response.
 */
async function generateAndSaveTitle(
  conversationId: string,
  userMessage: string,
  _assistantContent: string
): Promise<void> {
  try {
    const result = await generateText({
      model: deepseek.chat(CHAT_MODEL),
      system: [
        "根据用户提问生成对话标题（5-15字）。直接输出标题，不加引号或前缀。",
        "",
        "示例：",
        '"今天天气怎么样" → 天气查询',
        '"Python如何读取CSV文件" → Python读取CSV',
        '"帮我算一下投资收益" → 投资收益计算',
        '"最近AI行业有什么新闻" → AI行业动态',
        '"你好" → 打个招呼',
        '"这段代码为什么报错" → 代码调试',
        "",
        "规则：",
        `- 提取核心话题，去掉“帮我”、“请问”等礼貌用语`,
        `- 绝不要输出“新对话”、“未命名”或空标题`,
        `- 纯闲聊用简短描述，如“闲聊”或“打个招呼”`,
      ].join("\n"),
      prompt: userMessage,
      temperature: 0.8,
    });

    const title = result.text.replace(/["""'\n]/g, "").trim();
    const finalTitle =
      title && title !== "新对话" && title.length >= 2
        ? title.slice(0, 20)
        : userMessage.replace(/[？?！!。，,、\s]/g, "").slice(0, 20) || "新对话";

    await updateConversationTitle(conversationId, finalTitle);
    console.log(`Title set: "${finalTitle}"`);
  } catch (err) {
    console.error("Title generation failed:", err);
    // Fallback: use user message
    const fallback =
      userMessage.replace(/[？?！!。，,、\s]/g, "").slice(0, 20) || "新对话";
    await updateConversationTitle(conversationId, fallback).catch(() => {});
  }
}

// ─── Forced Reply ──────────────────────────────────────────

/**
 * When the model's streaming response is too short or empty after tool calls,
 * make a non-streaming follow-up call to force a complete answer.
 * Now passes the actual tool results so the model has proper context.
 */
async function generateForcedReply(
  userMessage: string,
  partialContent: string,
  toolCallRecords: ToolCallRecord[]
): Promise<string | null> {
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
  });

  // Format tool results for context injection
  const toolResultsText = toolCallRecords
    .filter((tc) => tc.status === "done" && tc.result)
    .map((tc) => {
      const resultStr =
        typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result);
      return `[${tc.toolName} 返回结果]:\n${resultStr}`;
    })
    .join("\n\n");

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: [
        "你已通过工具获取了信息。现在请基于这些信息，用中文给出一个完整、详细、有见解的回答。",
        "",
        "要求：",
        "- 用 Markdown 组织内容（标题、列表、表格）",
        "- 总结关键信息，不要罗列原始数据",
        "- 给出你的分析和建议",
        "- 标注信息来源 [来源](url)",
        "- 回答要完整，不能只有一两句话",
      ].join("\n"),
    },
    { role: "user", content: `用户问题：${userMessage}` },
  ];

  // Inject tool results as context
  if (toolResultsText) {
    messages.push({
      role: "user",
      content: `以下是工具返回的数据：\n\n${toolResultsText}\n\n请基于以上数据回答用户的问题。`,
    });
  }

  // Include partial content if any (so the model can build on it)
  if (partialContent) {
    messages.push({ role: "assistant", content: partialContent });
  }

  messages.push({ role: "user", content: "请给出完整回答：" });

  const completion = await client.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  return completion.choices[0]?.message?.content?.trim() || null;
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
