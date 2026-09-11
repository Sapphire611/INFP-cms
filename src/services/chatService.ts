/**
 * Chat service - integrates with DeepSeek via Vercel AI SDK v7
 * Supports streaming responses with tool calling (weather, time, calculate, etc.)
 * Persists messages to Supabase (no localStorage dependency)
 */

import {
  streamText,
  generateText,
  isStepCount,
  type ModelMessage,
  type LanguageModel,
  type TextStreamPart,
  type ToolSet,
} from "ai";
import type { Message, ToolCallRecord } from "@/types/chat";
import { createModelClient } from "@/lib/ai-client";
import { tools } from "@/tools";
import { getAgent, getDefaultAgent } from "@/config/agents";
import { appendReflectionIfNeeded, readToolOutcome } from "./agentReflection";
import { resolveApiConfig } from "./aiProviderService";
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
 * 失控安全网 —— 这不是"调用次数上限"。
 *
 * 循环的正常出口是模型不再调用工具（模型自己决定答完了），
 * 这个数字只在模型陷入"搜了又搜"停不下来时才会碰到。
 */
const MAX_STEPS = 12;

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

// ─── SSE plumbing ──────────────────────────────────────────

/** 把一个结构化事件编码成 SSE 帧推给前端 */
function makeEnqueue(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  return (event: unknown): void => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  };
}

/** 一次对话里跨轮次累积的状态 */
interface StreamState {
  assistantContent: string;
  toolCallRecords: ToolCallRecord[];
  finishReason: string;
  /** 当前这一轮模型输出的文字。用来给同轮的工具调用盖上"思考" */
  roundText: string;
}

/**
 * 处理一轮 streamText 里的单个 chunk：更新累积状态 + 转发 SSE 事件。
 *
 * 这里刻意不发 done —— done 只在整圈跑完后发一次，
 * 否则前端会在中间轮次就把消息标记成"已完成"。
 *
 * @param step 当前是 Agent 循环的第几轮，写进 trace 用于事后回放
 */
function handleChunk(
  chunk: TextStreamPart<ToolSet>,
  state: StreamState,
  send: (event: unknown) => void,
  step: number
): void {
  switch (chunk.type) {
    case "text-delta":
      state.assistantContent += chunk.text;
      state.roundText += chunk.text;
      send({ type: "text", content: chunk.text });
      break;

    case "tool-call": {
      const thought = state.roundText.trim() || undefined;
      state.toolCallRecords.push({
        id: chunk.toolCallId,
        toolName: chunk.toolName,
        args: chunk.input as Record<string, unknown>,
        status: "calling",
        step,
        thought,
      });
      send({
        type: "tool-call",
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        args: chunk.input,
        step,
        thought,
      });
      break;
    }

    case "tool-result": {
      const idx = state.toolCallRecords.findIndex(
        (tc) => tc.id === chunk.toolCallId
      );
      const outcome = readToolOutcome(chunk.toolName, chunk.output);
      if (idx !== -1) {
        state.toolCallRecords[idx] = {
          ...state.toolCallRecords[idx],
          result: chunk.output,
          status: "done",
          confidence: outcome?.confidence,
          latencyMs: outcome?.latencyMs,
        };
      }
      send({
        type: "tool-result",
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        result: chunk.output,
        confidence: outcome?.confidence,
        latencyMs: outcome?.latencyMs,
      });
      break;
    }

    case "tool-error": {
      const idx = state.toolCallRecords.findIndex(
        (tc) => tc.id === chunk.toolCallId
      );
      if (idx !== -1) {
        state.toolCallRecords[idx] = {
          ...state.toolCallRecords[idx],
          result: String(chunk.error),
          status: "error",
        };
      } else {
        state.toolCallRecords.push({
          id: chunk.toolCallId,
          toolName: chunk.toolName,
          args: {},
          result: String(chunk.error),
          status: "error",
          step,
        });
      }
      send({
        type: "tool-error",
        toolCallId: chunk.toolCallId,
        toolName: chunk.toolName,
        error: String(chunk.error),
        step,
      });
      break;
    }

    case "error":
      send({ type: "error", error: String(chunk.error) });
      break;

    case "finish":
      state.finishReason = chunk.finishReason;
      break;
  }
}

/**
 * 一次 Agent 运行的 trace 汇总，打到日志里。
 *
 * 存在的理由：光看「第 N 轮：webSearch」回答不了
 * "结果到底好不好 / 反思为什么没触发"这类问题 —— 关键是 confidence。
 */
function logTrace(records: ToolCallRecord[], steps: number, elapsedMs: number): void {
  console.log(
    `[agent] 完成：${steps} 轮，${records.length} 次工具调用，${(elapsedMs / 1000).toFixed(1)}s`
  );

  for (const r of records) {
    const bits = [`step${r.step ?? "?"}`, r.toolName, r.status];
    if (typeof r.confidence === "number") {
      bits.push(`confidence=${r.confidence.toFixed(2)}`);
    }
    if (typeof r.latencyMs === "number" && r.latencyMs > 0) {
      bits.push(`${r.latencyMs}ms`);
    }
    console.log(`[agent]   ${bits.join(" ")}`);
  }

  const reflected = records.filter((r) => r.reflection).length;
  console.log(
    reflected > 0
      ? `[agent]   反思：${reflected} 条记录被标记`
      : "[agent]   反思：未触发（所有结果自检通过）"
  );
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

  // ── 0. 解析当前启用的模型平台（CMS「模型管理」优先，未配置时回退环境变量）──
  // 放在开流之前：凭证有问题时直接返回错误，不会推到流里才失败。
  const apiConfig = await resolveApiConfig(agent.model);
  const model = createModelClient(apiConfig.apiKey, apiConfig.baseURL).chat(
    apiConfig.model
  );

  const encoder = new TextEncoder();

  // ── 1. Save user message to Supabase (fire-and-forget) ──
  saveUserMessage(conversationId, userMessage).catch((err) => {
    console.error("Failed to save user message:", err);
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = makeEnqueue(controller, encoder);
      const startedAt = Date.now();
      const state: StreamState = {
        assistantContent: "",
        toolCallRecords: [],
        finishReason: "unknown",
        roundText: "",
      };

      // 累积的对话上下文。每一轮的 assistant 消息 + 工具结果都追加进来，
      // 下一轮 streamText 带着它们再问模型一次 —— 这就是 ReAct 的 observation 回填。
      const workingMessages: ModelMessage[] = [...messages];

      // 每轮只让 SDK 跑一步（一次生成 + 它触发的工具执行），循环由我们自己转。
      const STEP_STOP = isStepCount(1);

      let executedSteps = 0;

      try {
        for (let step = 1; step <= MAX_STEPS; step++) {
          executedSteps = step;
          const result = streamText({
            model,
            system: agent.systemPrompt,
            messages: workingMessages,
            tools,
            temperature: agent.temperature,
            maxOutputTokens: agent.maxTokens,
            stopWhen: STEP_STOP,
          });

          // 新一轮开始，"思考"重新累积
          state.roundText = "";

          for await (const chunk of result.fullStream) {
            handleChunk(chunk, state, send, step);
          }

          const calls = await result.toolCalls;

          // ── 正常出口：模型这一轮没调工具，说明它认为可以作答了 ──
          // 步数不由我们规定，由模型自己决定什么时候停下来。
          if (calls.length === 0) {
            console.log(`[agent] 第 ${step} 轮：模型不再调用工具，循环结束`);
            break;
          }

          console.log(
            `[agent] 第 ${step} 轮：${calls.map((c) => c.toolName).join(", ")}`
          );

          // 把本轮的 assistant 消息和工具结果喂回上下文，进入下一轮
          workingMessages.push(...(await result.responseMessages));

          // ── Reflect：结果回填之后自检质量 ──
          // 不做额外 LLM 调用，只读工具早就返回的 metadata（confidence/retryable）。
          // 有问题就显式提示模型，而不是把烂结果原样丢回去让它自己猜。
          appendReflectionIfNeeded(
            workingMessages,
            await result.toolResults,
            step,
            state.toolCallRecords,
            send
          );

          // ── 安全网：模型反复搜不收敛，步数用尽 ──
          // 此时上下文里已经有工具结果，逼它不带工具给出最终答案，
          // 而不是让用户对着一堆工具卡片干等。
          if (step === MAX_STEPS) {
            console.warn(`[agent] 达到安全网上限 ${MAX_STEPS} 步，强制收尾`);
            state.assistantContent += await streamFinalAnswer(
              model,
              workingMessages,
              send
            );
          }
        }

        logTrace(state.toolCallRecords, executedSteps, Date.now() - startedAt);

        // 极端兜底：模型一个字都没产出
        if (!state.assistantContent) {
          state.assistantContent = "抱歉，未能生成有效回复。请尝试换个方式提问。";
          send({ type: "text", content: state.assistantContent });
        }

        send({ type: "done", finishReason: state.finishReason });

        // ── Save assistant message to Supabase ──
        saveAssistantMessage(
          conversationId,
          state.assistantContent,
          state.toolCallRecords
        ).catch((err) => {
          console.error("Failed to save assistant message:", err);
        });

        controller.close();

        // ── Generate title after stream fully ends (non-blocking) ──
        if (conversationHistory.length === 0 && state.assistantContent) {
          generateAndSaveTitle(
            conversationId,
            model,
            userMessage,
            state.assistantContent
          ).catch((err) => {
            console.error("Failed to generate conversation title:", err);
          });
        }

        // ── Post-stream side effects (non-blocking) ──
        updateConversationTimestamp(conversationId).catch(() => {});
        checkAndSummarizeIfNeeded(conversationId, conversationHistory);
      } catch (error) {
        console.error("Stream error:", error);
        send({
          type: "error",
          error: error instanceof Error ? error.message : "Stream error",
        });
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
  model: LanguageModel,
  userMessage: string,
  _assistantContent: string
): Promise<void> {
  try {
    const result = await generateText({
      model,
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

// ─── Safety-net Final Answer ───────────────────────────────

/**
 * 只在安全网触发时调用：模型耗尽了步数仍在调工具。
 *
 * 此时 workingMessages 里已经带着完整的工具结果（是标准的 tool-result 消息，
 * 不需要像以前那样手动把结果拼成字符串塞进 prompt），所以这里只要
 * 关掉工具、明确要求收尾即可。
 */
async function streamFinalAnswer(
  model: LanguageModel,
  workingMessages: ModelMessage[],
  send: (event: unknown) => void
): Promise<string> {
  const result = streamText({
    model,
    system: [
      "你已经用完了可用的工具调用预算，现在必须直接作答。",
      "请基于上面的对话和工具结果，用 Markdown 给出最终回答。",
      "如果拿到的信息不足以完整回答，诚实地说明哪部分没有查到，不要编造。",
    ].join("\n"),
    messages: workingMessages,
    temperature: 0.7,
    maxOutputTokens: 2048,
  });

  let fullContent = "";

  for await (const chunk of result.fullStream) {
    if (chunk.type === "text-delta") {
      fullContent += chunk.text;
      send({ type: "text", content: chunk.text });
    }
  }

  return fullContent;
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
