/**
 * getCurrentTime tool — resolve date/time for any IANA timezone
 */
import { tool } from "ai";
import { z } from "zod";
import { success, failure, type ToolResult } from "../types";

interface TimeData {
  timezone: string;
  datetime: string;
  iso: string;
  weekday: string;
  unixTimestamp: number;
}

export const getCurrentTime = tool({
  description: [
    "获取当前日期和时间，支持指定 IANA 时区（如 Asia/Shanghai）。",
    "何时调用：用户问「现在几点」「今天几号」「XX 现在是什么时间」、",
    "需要时间戳计算时间差、或需要确认时区转换时。",
    "默认时区为 Asia/Shanghai，不指定时返回北京/上海时间。",
  ].join(" "),
  inputSchema: z.object({
    timezone: z
      .string()
      .describe(
        "IANA 时区名称，如 Asia/Shanghai, America/New_York, Europe/London。默认 Asia/Shanghai"
      )
      .optional(),
  }),
  execute: async (input): Promise<ToolResult<TimeData>> => {
    const tz = input.timezone || "Asia/Shanghai";
    const start = Date.now();

    try {
      const now = new Date();
      const formatted = now.toLocaleString("zh-CN", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "long",
      });

      // Extract weekday separately for structured output
      const weekdayOnly = now.toLocaleString("zh-CN", {
        timeZone: tz,
        weekday: "long",
      });

      return success(
        {
          timezone: tz,
          datetime: formatted,
          iso: now.toISOString(),
          weekday: weekdayOnly,
          unixTimestamp: Math.floor(now.getTime() / 1000),
        },
        {
          source: "Intl.DateTimeFormat",
          confidence: 0.99,
          latencyMs: Date.now() - start,
        }
      );
    } catch {
      // Invalid timezone — fall back to local time
      const now = new Date();
      const localFormatted = now.toLocaleString("zh-CN", {
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      return failure("INVALID_TIMEZONE", `时区 "${tz}" 无效`, {
        retryable: false,
        fallback: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          datetime: localFormatted,
          iso: now.toISOString(),
          note: `指定的时区 "${tz}" 无效，已返回本地时间`,
        },
      });
    }
  },
});
