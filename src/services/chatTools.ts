/**
 * Chat tools - available capabilities for the AI agent
 * Each tool is defined with AI SDK tool() helper (v7 API: inputSchema + execute(input, options))
 * Tools throw errors on failure so the AI SDK emits tool-error (not tool-result with error string)
 */

import { tool } from "ai";
import { z } from "zod";

// ─── Weather ───────────────────────────────────────────────

export const getWeather = tool({
  description: "查询指定城市当前天气。返回温度、天气状况、湿度、风速等信息。",
  inputSchema: z.object({
    city: z.string().describe("城市名称，使用英文如 Beijing, Shanghai, Tokyo, London"),
  }),
  execute: async (input) => {
    const { city } = input;
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`天气查询失败: HTTP ${res.status}`);

    const data = await res.json();
    const current = data.current_condition?.[0];
    if (!current) throw new Error(`未找到 ${city} 的天气数据`);

    return {
      city,
      temperature: `${current.temp_C}°C`,
      feelsLike: `${current.FeelsLikeC}°C`,
      condition: current.weatherDesc?.[0]?.value ?? "未知",
      humidity: `${current.humidity}%`,
      windSpeed: `${current.windspeedKmph} km/h`,
      visibility: `${current.visibility} km`,
      date: current.localObsDateTime,
    };
  },
});

// ─── Current Time ──────────────────────────────────────────

export const getCurrentTime = tool({
  description: "获取当前日期和时间，支持指定时区。",
  inputSchema: z.object({
    timezone: z
      .string()
      .describe("时区名称，如 Asia/Shanghai, America/New_York, Europe/London。默认 Asia/Shanghai")
      .optional(),
  }),
  execute: async (input) => {
    const tz = input.timezone || "Asia/Shanghai";
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
      return { timezone: tz, datetime: formatted, iso: now.toISOString() };
    } catch {
      const now = new Date();
      return {
        timezone: tz,
        datetime: now.toLocaleString("zh-CN"),
        iso: now.toISOString(),
        note: "时区无效，使用本地时间",
      };
    }
  },
});

// ─── Calculate ──────────────────────────────────────────────

export const calculate = tool({
  description:
    "安全执行数学计算。支持加减乘除、幂运算、括号、三角函数、对数等。",
  inputSchema: z.object({
    expression: z
      .string()
      .describe("数学表达式，例如: '2 + 3 * 4', 'Math.sqrt(144)', 'sin(PI/2)'"),
  }),
  execute: async (input) => {
    const { expression } = input;
    const allowedFunctions = [
      "abs", "ceil", "floor", "round", "max", "min",
      "sqrt", "cbrt", "pow", "exp", "log", "log2", "log10",
      "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
      "sinh", "cosh", "tanh",
      "PI", "E", "LN2", "LN10", "LOG2E", "LOG10E", "SQRT1_2", "SQRT2",
      "sign", "trunc",
    ];

    // Validate only safe constructs
    const ALLOWED =
      /^[\d\s+\-*/().,%^!eE,Math\.[a-zA-Z0-9]+]+$/;
    if (!ALLOWED.test(expression)) {
      throw new Error(`表达式包含不允许的字符`);
    }

    const sandbox = Object.fromEntries(
      allowedFunctions.map((fn) => [fn, (Math as any)[fn]])
    );
    const result = new Function(
      ...Object.keys(sandbox),
      `"use strict"; return (${expression})`
    )(...Object.values(sandbox));

    if (typeof result !== "number" || !isFinite(result)) {
      throw new Error(`计算结果不是有限数`);
    }
    return { expression, result: Number(result.toFixed(10)) };
  },
});

// ─── Web Search (DuckDuckGo → Bing 降级) ──────────────────

async function searchDuckDuckGo(query: string): Promise<Array<{ title: string; snippet: string; url: string }>> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(searchUrl, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const blocks = html.split('class="result"');
  const results: Array<{ title: string; snippet: string; url: string }> = [];

  for (let i = 1; i < blocks.length && results.length < 8; i++) {
    const b = blocks[i];
    const titleMatch = b.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
    const snippetMatch = b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/td>/);
    const urlMatch = b.match(/class="result__url"[^>]*>([\s\S]*?)<\/td>/);

    if (titleMatch) {
      const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      const url = urlMatch ? urlMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      if (title && snippet) results.push({ title, snippet, url: url || "无链接" });
    }
  }

  if (results.length === 0) throw new Error("未找到搜索结果");
  return results;
}

async function searchBing(query: string): Promise<Array<{ title: string; snippet: string; url: string }>> {
  const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-cn`;
  const res = await fetch(searchUrl, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`Bing HTTP ${res.status}`);

  const html = await res.text();
  const results: Array<{ title: string; snippet: string; url: string }> = [];

  // Strategy 1: Parse <li class="b_algo"> blocks — don't use lookahead (more robust)
  const blocks = html.split('<li class="b_algo"');
  for (let i = 1; i < blocks.length && results.length < 8; i++) {
    const block = blocks[i];
    // Find the closing </li> that ends this result block
    const endIdx = block.indexOf('<li class="b_algo"');
    const content = endIdx > 0 ? block.slice(0, endIdx) : block;

    // Extract <a> with href (skip bing.com internal links)
    const aMatch = content.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);

    // Extract snippet: try multiple patterns
    let snippet = "";
    const snippetPatterns = [
      /<p[^>]*>([\s\S]*?)<\/p>/,
      /<span[^>]*class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/span>/,
      /<div[^>]*class="[^"]*b_caption[^"]*"[^>]*>([\s\S]*?)<\/div>/,
      /<span[^>]*class="[^"]*b_snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/,
    ];
    for (const pattern of snippetPatterns) {
      const m = content.match(pattern);
      if (m) {
        snippet = m[1].replace(/<[^>]+>/g, "").trim();
        if (snippet.length > 10) break;
      }
    }
    // If no structured snippet found, grab first meaningful text block
    if (!snippet) {
      const textOnly = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      // Take a reasonable chunk after the title
      snippet = textOnly.slice(0, 250);
    }

    if (aMatch) {
      const url = aMatch[1];
      const title = aMatch[2].replace(/<[^>]+>/g, "").trim();
      if (title.length > 3 && url.startsWith("http") && !url.includes("bing.com")) {
        results.push({ title, snippet: snippet.slice(0, 300), url });
      }
    }
  }

  // Strategy 2: Fallback — extract all external links with meaningful text
  if (results.length < 3) {
    const linkRegex = /<a[^>]*href="(https?:\/\/(?!(?:www\.)?bing\.com|(?:www\.)?microsoft\.com)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null && results.length < 8) {
      const url = linkMatch[1];
      const title = linkMatch[2].replace(/<[^>]+>/g, "").trim();
      if (title.length > 5 && !url.includes("bing.com")) {
        results.push({ title, snippet: "", url });
      }
    }
  }

  // Strategy 3: Last resort — try cn.bing.com
  if (results.length < 3) {
    const cnUrl = `https://cn.bing.com/search?q=${encodeURIComponent(query)}`;
    const cnRes = await fetch(cnUrl, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
    });
    if (cnRes.ok) {
      const cnHtml = await cnRes.text();
      const cnLinkRegex = /<a[^>]*href="(https?:\/\/(?!(?:www\.)?bing\.com)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let cnMatch;
      while ((cnMatch = cnLinkRegex.exec(cnHtml)) !== null && results.length < 8) {
        const url = cnMatch[1];
        const title = cnMatch[2].replace(/<[^>]+>/g, "").trim();
        if (title.length > 5) {
          results.push({ title, snippet: "", url });
        }
      }
    }
  }

  if (results.length === 0) throw new Error("Bing 未找到搜索结果");
  return results;
}

export const webSearch = tool({
  description:
    "联网搜索，获取实时最新信息。当用户询问近期事件、最新动态、具体地点推荐、攻略、新闻、当前活动等需要联网获取数据的场景时必须调用。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词，使用中文或英文"),
  }),
  execute: async (input) => {
    const { query } = input;

    // ── Strategy 1: Bing (works in China + globally) ──
    try {
      const results = await searchBing(query);
      return { source: "Bing", query, totalResults: results.length, results };
    } catch (bingError) {
      console.warn("Bing search failed, falling back to DuckDuckGo:", String(bingError));
    }

    // ── Strategy 2: DuckDuckGo (fallback, may not work in China) ──
    const results = await searchDuckDuckGo(query);
    return { source: "DuckDuckGo", query, totalResults: results.length, results };
  },
});

// ─── All tools ──────────────────────────────────────────────

export const chatTools = {
  webSearch,
  getWeather,
  getCurrentTime,
  calculate,
} as const;
