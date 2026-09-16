/**
 * webSearch tool — Bing / DuckDuckGo 双源，零 API key。
 * HTML parsing via cheerio (jQuery-like DOM API), replacing fragile regex.
 *
 * 主源固定 Bing，DuckDuckGo 作为降级源 —— 为什么不再按环境选，见 searchWeb 顶部。
 *
 * Error grading:
 *   - 主源 TIMEOUT → retryable, 降级到另一个源
 *   - 两个源都 TIMEOUT → fatal (ALL_SOURCES_FAILED)
 *   - EMPTY_RESULTS → 低 confidence，模型该换关键词
 */
import { tool } from "ai";
import { z } from "zod";
import * as cheerio from "cheerio";
import { success, failure, type ToolResult } from "../types";

// ─── Shared Types ───────────────────────────────────────────

export interface SearchResultItem {
  title: string;
  snippet: string;
  url: string;
}

export interface SearchData {
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
//     <td class="result__url">显示的 URL</td>   ← 人看的，不是 href
//   </div>
//
// 我们用 cheerio 的 .find() + .text() 提取，不再用正则抠。
//
// ⚠️ 取 URL 必须走 href，不能走 .result__url 的文本：
// 那个文本是「weather.com」或「example.com › 路径」这种显示形式，不是合法 URL。
// 只拿它去喂 fetchPage 会被判非法（new URL() 抛错），research 这类二跳抓取就全废。

/**
 * 把 DDG 结果里的 href 还原成可访问的目标 URL。
 *
 * DDG 的链接有两种形态：
 *   1. 直接就是目标地址：https://weather.com/
 *   2. 跳转包装：//duckduckgo.com/l/?uddg=https%3A%2F%2Fweather.com%2F&rut=...
 *      真正的目标藏在 uddg 参数里，不解开就没法二跳。
 *
 * 返回 null 表示这个 href 不是可用的 http(s) 地址。
 */
function resolveDdgUrl(href: string | undefined | null): string | null {
  if (!href) return null;
  const absolute = href.startsWith("//") ? `https:${href}` : href;

  try {
    const parsed = new URL(absolute);
    return parsed.searchParams.get("uddg") ?? (absolute.startsWith("http") ? absolute : null);
  } catch {
    return null;
  }
}

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
    const $titleLink = $el.find(".result__a").first();
    const title = $titleLink.text().trim();

    // 摘要在 <td class="result__snippet"> 里
    const snippet = $el.find(".result__snippet").text().trim();

    // URL：优先从 href 还原（含 uddg 跳转包装），实在拿不到才退回显示文本。
    const $urlEl = $el.find(".result__url").first();
    const link =
      resolveDdgUrl($titleLink.attr("href")) ??
      resolveDdgUrl($urlEl.attr("href")) ??
      $urlEl.text().trim();

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

interface SearchProvider {
  name: string;
  fn: (query: string) => Promise<SearchResultItem[]>;
}

const BING: SearchProvider = { name: "Bing", fn: searchBing };
const DUCKDUCKGO: SearchProvider = { name: "DuckDuckGo", fn: searchDuckDuckGo };

/**
 * 搜索实现本体。
 *
 * 和 tool() 定义分开，是为了让组合工具（research）能直接复用。
 * 走 `webSearch.execute()` 是行不通的：SDK 把 execute 的返回类型声明成
 * `ToolResult | AsyncIterable<ToolResult>`（它允许流式工具），于是每处取值
 * 都要先 cast —— 白白把这个工具耦死在 SDK 的签名上。
 */
export async function searchWeb(query: string): Promise<ToolResult<SearchData>> {
  const start = Date.now();

  // ── 主源固定 Bing ──
  //
  // 曾经按环境选（dev → Bing / prod → DuckDuckGo，理由是「部署机 IP 更容易被 Bing 拦」）。
  // 2026-09-16 实测推翻了它：DDG 的 html 端点对数据中心/VPN IP 直接返回反爬挑战页
  // （HTTP 202 +「Select all squares containing a duck」），`.result` 一个都没有，
  // searchDuckDuckGo() 于是抛「未找到搜索结果」。后果是线上**每次搜索**都降级到 Bing：
  //
  //   degraded 恒为 true → confidence 恒为 0.75 → 低于 agentReflection 的 0.8 阈值
  //   → 反思每轮都塞一条「结果可信度低」，模型可能白跑几轮换关键词
  //
  // 也就是说那个环境优先级在线上从没生效过，只是把降级路径的成本变成了常态。
  // Bing 在两个环境都正常（实测 10 条 b_algo），固定用它。
  //
  // ⚠️ 这里也不看查询语言。最早是「中文 → Bing，英文 → DuckDuckGo」，被环境优先级取代，
  // 现在两者都不成立。
  const primary = BING;
  const fallback = DUCKDUCKGO;

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
}

export const webSearch = tool({
  description: [
    "联网搜索，获取实时最新信息。两个搜索源互为备份，一个失败自动切换另一个。",
    "何时调用：用户询问近期事件、新闻、具体攻略、产品价格、评测对比、",
    "最新动态、活动信息等需要联网获取数据的场景。",
    "返回结果包含标题、摘要、URL — 基于这些信息给出完整分析，标注来源。",
    "搜索结果不足时可换关键词重试（如中文换英文或相反）。",
    "需要读多篇正文做分析/对比/总结时，用 research 一次走完，不要先搜再一页页抓。",
  ].join(" "),
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "搜索关键词。建议：中文搜中文内容，英文搜英文内容；关键词精简到 1-5 个词，不要用完整句子"
      ),
  }),
  execute: async (input): Promise<ToolResult<SearchData>> => searchWeb(input.query),
});
