/**
 * webSearch tool — Bing primary + DuckDuckGo fallback, zero API key.
 * HTML parsing via cheerio (jQuery-like DOM API), replacing fragile regex.
 *
 * Error grading:
 *   - Bing TIMEOUT → retryable, fall back to DuckDuckGo
 *   - DuckDuckGo TIMEOUT → fatal (both sources exhausted)
 *   - EMPTY_RESULTS → low confidence, model should try different keywords
 */
import { tool } from "ai";
import { z } from "zod";
import * as cheerio from "cheerio";
import { success, failure, type ToolResult } from "../types";

// ─── Shared Types ───────────────────────────────────────────

interface SearchResultItem {
  title: string;
  snippet: string;
  url: string;
}

interface SearchData {
  source: string;
  query: string;
  totalResults: number;
  results: SearchResultItem[];
  degraded: boolean; // true = primary source failed, using fallback
}

// ═══════════════════════════════════════════════════════════════
// DuckDuckGo Strategy
// ═══════════════════════════════════════════════════════════════
//
// DuckDuckGo 返回静态 HTML，结构稳定：
//   <div class="result">
//     <a class="result__a" href="...">标题文本</a>
//     <td class="result__snippet">摘要文本</td>
//     <td class="result__url">显示的 URL</td>
//   </div>
//
// 我们用 cheerio 的 .find() + .text() 提取，不再用正则抠。

async function searchDuckDuckGo(query: string): Promise<SearchResultItem[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const results: SearchResultItem[] = [];

  // 每个 .result 是一个搜索结果卡片
  $(".result").each((_i, el) => {
    if (results.length >= 8) return false; // cheerio 的 break: return false

    const $el = $(el);

    // 标题在 <a class="result__a"> 里
    const title = $el.find(".result__a").text().trim();

    // 摘要在 <td class="result__snippet"> 里
    const snippet = $el.find(".result__snippet").text().trim();

    // URL 在 <td class="result__url"> 里（显示用，不是 href）
    const link = $el.find(".result__url").text().trim();

    if (title && snippet) {
      results.push({ title, snippet, url: link || "无链接" });
    }
  });

  if (results.length === 0) throw new Error("未找到搜索结果");
  return results;
}

// ═══════════════════════════════════════════════════════════════
// Bing Strategy (cn.bing.com)
// ═══════════════════════════════════════════════════════════════
//
// Bing 搜索结果 HTML 结构（2026-07 实测）：
//   <li class="b_algo">
//     <div class="b_tpcn">           ← 缩略图/网站图标区域
//       <a href="...">               ← 图标链接（我们要跳过这个）
//         <div class="tpic">...</div>
//       </a>
//     </div>
//     <h2>                           ← 标题行
//       <a href="https://...">       ← 真正的标题链接 ✓
//           上海市人民政府
//       </a>
//     </h2>
//     <p>                            ← 摘要（普通 <p> 标签）
//       截至2025年末，上海市下辖16个区...
//     </p>
//     <div class="b_caption">        ← 或摘要在这里
//       <p>...</p>
//     </div>
//   </li>
//
// 我们用 cheerio 的 h2 a 直接定位标题，避免误抓图标链接。

async function searchBing(query: string): Promise<SearchResultItem[]> {
  const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
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
  const $ = cheerio.load(html);
  const results: SearchResultItem[] = [];

  // 主策略：遍历每个 <li class="b_algo"> 结果块
  $("li.b_algo").each((_i, el) => {
    if (results.length >= 8) return false;

    const $el = $(el);

    // h2 > a 是标题链接（Bing 的标准结构）
    // 注意：不能用 el.find("a").first()，因为第一个 <a> 在 .b_tpcn 里是图标链接
    const $titleLink = $el.find("h2 a").first();
    const title = $titleLink.text().trim();
    const link = ($titleLink.attr("href") || "").trim();

    // 摘要：Bing 用的标签不稳定，按优先级尝试
    // .b_caption p — 最常见
    // .b_lineclamp — 旧版 Bing 用
    // .b_algoSlug  — 另一变体
    let snippet = $el
      .find(".b_caption p, .b_lineclamp, .b_algoSlug")
      .first()
      .text()
      .trim();

    // 降级：如果结构化选择器没拿到足够文本，用整块文本过滤
    if (!snippet || snippet.length < 10) {
      const $clone = $el.clone();
      $clone.find("h2, .b_tpcn").remove(); // 去掉标题行和图标区
      snippet = $clone.text().replace(/\s+/g, " ").trim().slice(0, 300);
    }

    if (title.length > 3 && link.startsWith("http") && !link.includes("bing.com")) {
      results.push({ title, snippet: snippet.slice(0, 300), url: link });
    }
  });

  // 降级策略：如果 b_algo 没拿到足够结果（Bing 改版），兜底提取页面所有外链
  if (results.length < 3) {
    $("a[href]").each((_i, el) => {
      if (results.length >= 8) return false;

      const $a = $(el);
      const href = ($a.attr("href") || "").trim();
      const text = $a.text().trim();

      if (
        text.length > 5 &&
        href.startsWith("http") &&
        !href.includes("bing.com") &&
        !href.includes("microsoft.com")
      ) {
        results.push({ title: text, snippet: "", url: href });
      }
    });
  }

  if (results.length === 0) throw new Error("Bing 未找到搜索结果");
  return results;
}

// ═══════════════════════════════════════════════════════════════
// Tool Definition
// ═══════════════════════════════════════════════════════════════

/** 检测查询是否包含中文 */
function isChineseQuery(query: string): boolean {
  return /[一-鿿]/.test(query);
}

export const webSearch = tool({
  description: [
    "联网搜索，获取实时最新信息。中文查询优先用 Bing，英文查询优先用 DuckDuckGo，一个失败自动切换另一个。",
    "何时调用：用户询问近期事件、新闻、具体攻略、产品价格、评测对比、",
    "最新动态、活动信息等需要联网获取数据的场景。",
    "返回结果包含标题、摘要、URL — 基于这些信息给出完整分析，标注来源。",
    "搜索结果不足时可换关键词重试（如中文换英文或相反）。",
  ].join(" "),
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "搜索关键词。建议：中文搜中文内容，英文搜英文内容；关键词精简到 1-5 个词，不要用完整句子"
      ),
  }),
  execute: async (input): Promise<ToolResult<SearchData>> => {
    const { query } = input;
    const start = Date.now();
    const chinese = isChineseQuery(query);

    // 中文 → Bing 优先, 英文 → DuckDuckGo 优先
    const primary = chinese
      ? { name: "Bing", fn: searchBing }
      : { name: "DuckDuckGo", fn: searchDuckDuckGo };
    const fallback = chinese
      ? { name: "DuckDuckGo", fn: searchDuckDuckGo }
      : { name: "Bing", fn: searchBing };

    // ── Primary ──
    try {
      const results = await primary.fn(query);
      return success(
        {
          source: primary.name,
          query,
          totalResults: results.length,
          results,
          degraded: false,
        },
        {
          source: primary.name,
          confidence: results.length >= 3 ? 0.85 : 0.7,
          latencyMs: Date.now() - start,
        }
      );
    } catch (primaryErr) {
      const primaryMsg =
        primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      console.warn(`${primary.name} failed, falling back to ${fallback.name}:`, primaryMsg);

      // ── Fallback ──
      try {
        const results = await fallback.fn(query);
        return success(
          {
            source: fallback.name,
            query,
            totalResults: results.length,
            results,
            degraded: true,
          },
          {
            source: `${fallback.name} (${primary.name} 降级)`,
            confidence: results.length >= 3 ? 0.75 : 0.6,
            latencyMs: Date.now() - start,
          }
        );
      } catch (fallbackErr) {
        const fbMsg =
          fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        return failure("ALL_SOURCES_FAILED", "所有搜索引擎均失败", {
          retryable: true,
          fallback: {
            [`${primary.name}Error`]: primaryMsg,
            [`${fallback.name}Error`]: fbMsg,
            suggestion: "请稍后重试，或尝试更换搜索关键词",
          },
        });
      }
    }
  },
});
