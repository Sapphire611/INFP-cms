/**
 * research tool — 组合工具：一次调用走完「搜索 → 并行抓正文 → 汇总」。
 *
 * ⚠️ 存在的理由**不是**省调用次数，而是把流程钉死。
 *
 * 现在 webSearch → fetchWebPage 这条链只写在提示词里（见 fetchWebPage.tool.ts 的
 * 头注释），走不走、走几步、抓几个页面全看模型当轮的心情 —— 同一个问题问两次，
 * 可能一次只搜不抓，一次抓三个页面。封装成原子工具后，每次都是同一套动作。
 *
 * 顺带两个好处：
 *   - 正文是 Promise.all 并行抓的。模型自己走这条链时通常是串行的（抓完一个才发下一个），
 *     因为每一轮只能看到上一轮的结果
 *   - 少一轮 LLM 往返 = 少发一遍全量上下文
 *
 * ⚠️ 它不比 webSearch + fetchWebPage 更强，只是**更快更确定**：
 * 代码层定死了「抓前 3 条」，模型失去了「先看搜索结果、再挑哪条值得读」的判断机会。
 * 所以两者并存 —— 查一个事实/数字/新闻用 webSearch，需要读正文才用 research。
 */
import { tool } from "ai";
import { z } from "zod";

import { fetchPage } from "../fetchWebPage/fetchWebPage.tool";
import { success, failure, type ToolResult } from "../types";
import { searchWeb, type SearchResultItem } from "../webSearch/webSearch.tool";

// ─── 参数 ───────────────────────────────────────────────────

/** 抓几篇正文。定死，不开放给模型 —— 开放了就又把决策权还回去了 */
const MAX_PAGES = 3;

/**
 * 每篇正文回给模型的字符上限。
 *
 * fetchWebPage 自己截到 6000，那是给「只看一篇」的场景定的。
 * 这里最多 3 篇，3 × 6000 = 18000 字符（约 6k token）一次塞进上下文太奢侈，
 * 2500 字足够判断一篇讲的是什么。
 */
const MAX_CHARS_PER_PAGE = 2500;

// ─── 输出形状 ───────────────────────────────────────────────

export interface ResearchSource {
  title: string;
  url: string;
  /** 正文抓到了没有 */
  fetched: boolean;
  /** 抓成功时的正文（已截断） */
  text?: string;
  /** 搜索摘要 —— 抓不到正文时至少还有这个 */
  snippet: string;
  /** 抓失败的原因 */
  note?: string;
}

export interface ResearchData {
  query: string;
  /** 这次用的是哪个搜索源（Bing / DuckDuckGo…），透传自 webSearch */
  searchSource: string;
  /** 搜索降级了没有（主源失败切备用源） */
  degraded: boolean;
  sources: ResearchSource[];
  fetchedCount: number;
}

// ─── 实现 ───────────────────────────────────────────────────

/**
 * 抓一条搜索结果，转成 ResearchSource。
 *
 * 单篇失败不影响整体 —— 返回原因，让模型自己决定是换个角度问，还是就着摘要答。
 */
async function fetchSource(result: SearchResultItem): Promise<ResearchSource> {
  const page = await fetchPage(result.url);

  if (!page.success) {
    return {
      title: result.title,
      url: result.url,
      fetched: false,
      snippet: result.snippet,
      note: page.error?.message ?? "抓取失败",
    };
  }

  return {
    title: page.data.title || result.title,
    url: result.url,
    fetched: true,
    text: page.data.textContent.slice(0, MAX_CHARS_PER_PAGE),
    snippet: result.snippet,
  };
}

/**
 * 组合工具没有自己的"来源可信度"可言，只能从子结果推。
 *
 * 分段，而不是线性加权 —— 每个取值的含义要能一眼读懂：
 *
 *   全抓到 → 继承搜索的可信度（0.85 / 0.7，取决于结果条数够不够）
 *   部分   → 0.78，明确低于反思阈值 0.8 → 触发自检
 *   全没抓 → 0.5，模型必须知道这批"正文"其实只有摘要
 *
 * ⚠️ 0.78 是刻意避开 0.8 的：反思用的是严格小于（`< CONFIDENCE_FLOOR`），
 * 取值若**恰好**等于阈值就会静默 —— webSearch 的 0.75 踩过一次
 * （见 agentReflection.ts 的注释）。
 */
function deriveConfidence(fetchedCount: number, candidateCount: number, searchConfidence: number): number {
  if (fetchedCount === 0 || candidateCount === 0) return 0.5;
  if (fetchedCount < candidateCount) return 0.78;
  return searchConfidence;
}

export async function researchTopic(query: string): Promise<ToolResult<ResearchData>> {
  const start = Date.now();

  // ── 1. 搜索 ──
  const found = await searchWeb(query);

  // 搜索都没成，后面无从谈起 —— 把错误码原样透传，反思步骤照旧能读
  if (!found.success) {
    return failure(found.error?.code ?? "SEARCH_FAILED", found.error?.message ?? "搜索失败", {
      retryable: found.error?.retryable ?? true,
      fallback: found.error?.fallback,
    });
  }

  // ── 2. 挑可抓取的候选 ──
  // 只认 http(s)：搜索结果里可能混着「无链接」这类占位值
  const candidates = found.data.results.filter((r) => r.url.startsWith("http")).slice(0, MAX_PAGES);

  // ── 3. 并行抓正文 ──
  const sources = await Promise.all(candidates.map(fetchSource));

  const fetchedCount = sources.filter((s) => s.fetched).length;

  // ── 4. 可信度 ──
  const confidence = deriveConfidence(fetchedCount, candidates.length, found.metadata.confidence);

  return success(
    {
      query,
      searchSource: found.data.source,
      degraded: found.data.degraded,
      sources,
      fetchedCount,
    },
    {
      source: `${found.data.source} + ${fetchedCount} 篇正文`,
      confidence,
      latencyMs: Date.now() - start,
    },
  );
}

// ─── Tool Definition ────────────────────────────────────────

export const research = tool({
  description: [
    "深度调研：一次调用自动完成「联网搜索 → 抓取前几条结果的正文 → 汇总」。",
    "何时调用：用户说「调研一下」「详细说说」「整理一份资料」「总结最近 XX 的动态」",
    "这类需要读正文才能答好的问题。",
    "与 webSearch 的分工：只要一个事实、数字或新闻标题，用 webSearch（更快）；",
    "需要基于正文做分析、对比、总结，用 research。",
    `返回：搜索来源 + 最多 ${MAX_PAGES} 篇网页正文（每篇截断到 ${MAX_CHARS_PER_PAGE} 字符）。`,
    "拿到结果后请直接基于正文作答并标注来源 URL，不要再重复搜索同一主题。",
  ].join(" "),
  inputSchema: z.object({
    query: z.string().describe("调研主题，用精简的关键词，1-5 个词，不要用完整句子"),
  }),
  execute: async (input): Promise<ToolResult<ResearchData>> => researchTopic(input.query),
});
