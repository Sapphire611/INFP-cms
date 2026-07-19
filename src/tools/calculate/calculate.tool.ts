/**
 * calculate tool — sandboxed math expression evaluator
 */
import { tool } from "ai";
import { z } from "zod";
import { success, failure, type ToolResult } from "../types";

interface CalcData {
  expression: string;
  result: number;
}

export const calculate = tool({
  description: [
    "安全执行数学计算。支持加减乘除、幂运算、三角函数、对数等。",
    "何时调用：用户需要精确数学计算、表达式求值、单位换算中的数字计算。",
    "⚠️ 模型不应心算复杂表达式，必须调用此工具确保精度。",
    "支持函数：abs, ceil, floor, round, sqrt, pow, sin, cos, tan, log, exp, PI, E 等。",
  ].join(" "),
  inputSchema: z.object({
    expression: z
      .string()
      .describe(
        "数学表达式，如 '2 + 3 * 4', 'Math.sqrt(144)', 'Math.sin(Math.PI / 2)', 'Math.pow(2, 10)'"
      ),
  }),
  execute: async (input): Promise<ToolResult<CalcData>> => {
    const { expression } = input;
    const start = Date.now();

    const ALLOWED =
      /^[\d\s+\-*/().,%^!a-zA-Z0-9.]+$/;
    if (!ALLOWED.test(expression)) {
      return failure("INVALID_EXPRESSION", "表达式包含不允许的字符", {
        retryable: false,
        fallback: { suggestion: "请只使用数字、运算符和 Math 函数" },
      });
    }

    // Block dangerous global access patterns (second line of defense)
    if (/\b(globalThis|process|window|document|fetch|require|import|eval|Function|constructor|setTimeout|setInterval)\b/.test(expression)) {
      return failure("INVALID_EXPRESSION", "表达式包含不允许的内容", {
        retryable: false,
      });
    }

    const allowedFunctions = [
      "abs", "ceil", "floor", "round", "max", "min",
      "sqrt", "cbrt", "pow", "exp", "log", "log2", "log10",
      "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
      "sinh", "cosh", "tanh",
      "PI", "E", "LN2", "LN10", "LOG2E", "LOG10E", "SQRT1_2", "SQRT2",
      "sign", "trunc",
    ];

    try {
      const sandbox = Object.fromEntries(
        allowedFunctions.map((fn) => [fn, (Math as unknown as Record<string, unknown>)[fn]])
      );
      const result = new Function(
        ...Object.keys(sandbox),
        `"use strict"; return (${expression})`
      )(...Object.values(sandbox));

      if (typeof result !== "number" || !isFinite(result)) {
        return failure("NON_FINITE", `计算结果不是有限数: ${result}`, {
          retryable: false,
          fallback: { suggestion: "请检查表达式是否有除以零或无效运算" },
        });
      }

      return success(
        { expression, result: Number(result.toFixed(10)) },
        { source: "sandboxed new Function()", confidence: 0.99, latencyMs: Date.now() - start }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return failure("EVAL_ERROR", `计算执行失败: ${msg}`, {
        retryable: false,
        fallback: { suggestion: "请检查表达式语法是否正确" },
      });
    }
  },
});
