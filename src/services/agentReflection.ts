/**
 * Agent 反思（Reflect）—— ReAct 循环里「观察」之后的那一步。
 *
 * 循环现在能把工具结果回填给模型了，但**没人判断这些结果好不好** —— 好结果和
 * 空结果一样被原样丢回去，模型只能自己猜。
 * 工具早就把判断依据放进了 `ToolResult.metadata`（confidence / retryable /
 * error.code），可是代码层从来没读过。这个模块补上那一步：每轮回填之后检查一次，
 * 把质量问题显式写成一条给模型的提示。
 *
 * 刻意**不做成一次额外的 LLM 调用**（那是每轮都烧 token）。先做确定性的
 * 代码层判断；模型拿到提示后自己决定是换关键词重试，还是诚实收尾。
 */

import type { ModelMessage } from "ai";

import type { ToolCallRecord } from "@/types/chat";

/**
 * 低于这个值的工具结果视为不可靠。
 *
 * 0.8 这条线对应各工具取值表里的**主源 / 降级**分界：
 *   calculate、getCurrentTime  0.99
 *   getWeather                 0.92
 *   fetchWebPage               0.85
 *   webSearch  主源、结果充足    0.85   ← 这条线之上：主源成功
 *   ─────────────────────── 0.8 ───────────────────────
 *   webSearch  降级、结果充足    0.75   ← 这条线之下：降级 / 结果不足
 *   webSearch  主源、结果偏少    0.7
 *   webSearch  降级、结果偏少    0.6
 *
 * ⚠️ 曾经设成 0.75，结果"降级但结果充足"恰好等于阈值（0.75 < 0.75 为假），
 * 永远静默 —— 主源超时降级恰恰是最该让用户知道的情况。
 */
const CONFIDENCE_FLOOR = 0.8;

interface ToolOutcome {
  toolName: string;
  success: boolean;
  confidence: number;
  latencyMs: number;
  errorCode?: string;
  retryable: boolean;
}

/**
 * 从工具返回值里读出质量信息。
 *
 * 返回 null 表示这不是一个 ToolResult 形状的返回值（工具可以自由返回别的结构），
 * 此时不妄下判断 —— 宁可漏报，不要误报。
 */
export function readToolOutcome(toolName: string, output: unknown): ToolOutcome | null {
  if (!output || typeof output !== "object") return null;

  const o = output as {
    success?: unknown;
    metadata?: { confidence?: unknown; latencyMs?: unknown };
    error?: { code?: unknown; retryable?: unknown };
  };

  if (typeof o.success !== "boolean") return null;

  return {
    toolName,
    success: o.success,
    // 缺字段时按"没问题"处理 —— 手里有数据比缺字段更常见，宁可漏报不误报
    confidence: asNumber(o.metadata?.confidence) ?? 1,
    latencyMs: asNumber(o.metadata?.latencyMs) ?? 0,
    errorCode: asString(o.error?.code),
    retryable: o.error?.retryable === true,
  };
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * 检查本轮工具结果的质量。
 *
 * @returns null 表示结果没问题；否则返回一段要追加进对话上下文的提示。
 */
export function reflectOnToolResults(toolResults: Array<{ toolName: string; output: unknown }>): string | null {
  const problems: string[] = [];

  for (const r of toolResults) {
    const outcome = readToolOutcome(r.toolName, r.output);
    if (!outcome) continue;

    if (!outcome.success) {
      const code = outcome.errorCode ?? "UNKNOWN";
      const hint = outcome.retryable ? "换参数重试可能有帮助" : "用同样的参数重试不会有帮助";
      problems.push(`- ${outcome.toolName} 调用失败（${code}），${hint}`);
    } else if (outcome.confidence < CONFIDENCE_FLOOR) {
      problems.push(`- ${outcome.toolName} 的结果可信度低（${outcome.confidence.toFixed(2)}），可能不相关或信息不足`);
    }
  }

  if (problems.length === 0) return null;

  return [
    "【结果自检】上一步的工具结果存在质量问题：",
    ...problems,
    "",
    "请据此决定下一步：换关键词或换工具重试；如果确实查不到，就诚实说明，不要编造。",
  ].join("\n");
}

/**
 * 执行一次反思：自检本轮工具结果，有问题就把提示追加进对话上下文。
 * 结果健康时什么都不做。
 *
 * 直接改 `workingMessages`（循环里那个累积数组），因为它就是"感知"的载体；
 * 同时把结论盖章到这一轮的 trace 记录上，事后才能回答
 * "这次反思触发了吗 / 说了什么 / 模型照做了吗"。
 */
export function appendReflectionIfNeeded(
  workingMessages: ModelMessage[],
  toolResults: Array<{ toolName: string; output: unknown }>,
  step: number,
  traceRecords: ToolCallRecord[] = [],
  send: (event: unknown) => void = () => {},
): void {
  const reflection = reflectOnToolResults(toolResults);
  if (!reflection) return;

  console.log(`[agent] 第 ${step} 轮：结果自检发现问题，已提示模型`);
  workingMessages.push({ role: "user", content: reflection });

  for (const record of traceRecords) {
    if (record.step === step) record.reflection = reflection;
  }

  // 推给前端，让用户看到 Agent 自己发现了问题
  send({ type: "reflection", step, content: reflection });
}
