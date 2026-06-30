/**
 * Web Search 服务 — 使用 DuckDuckGo 免费搜索，无需 API key
 */

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * 搜索网页并返回格式化结果
 * 使用 DuckDuckGo Instant Answer API（零配置，无 API key）
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  // DuckDuckGo Instant Answer API — 免费，无需注册
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "INFP-CMS/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = await response.json();
  const results: SearchResult[] = [];

  // Abstract (DuckDuckGo 的摘要答案)
  if (data.AbstractText) {
    results.push({
      title: data.Heading || "相关信息",
      url: data.AbstractURL || data.AbstractSource || "",
      content: data.AbstractText,
    });
  }

  // Related topics
  const topics = data.RelatedTopics || [];
  for (const topic of topics.slice(0, 5)) {
    if (topic.Text) {
      results.push({
        title: topic.Text.slice(0, 80),
        url: topic.FirstURL || "",
        content: topic.Text,
      });
    }
  }

  // 如果没有找到结果，回退到 HTML 抓取（备用方案）
  if (results.length === 0) {
    return fallbackSearch(query);
  }

  return results;
}

/**
 * 备用搜索：直接从 DuckDuckGo HTML 结果抓取
 */
async function fallbackSearch(query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    console.error("Fallback search failed:", response.status);
    return [];
  }

  const html = await response.text();

  // 简单正则提取搜索结果
  const results: SearchResult[] = [];
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/gi;

  const links: Array<{ href: string; title: string }> = [];
  const snippets: string[] = [];
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1];
    const href = rawHref.startsWith("//") ? "https:" + rawHref : rawHref;
    links.push({ href, title: match[2].replace(/<[^>]*>/g, "").trim() });
  }

  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]*>/g, "").trim());
  }

  for (let i = 0; i < Math.min(links.length, snippets.length, 5); i++) {
    results.push({
      title: links[i].title,
      url: links[i].href,
      content: snippets[i],
    });
  }

  if (results.length === 0) {
    results.push({
      title: "搜索结果",
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      content: "未找到相关结果，请尝试其他关键词。",
    });
  }

  return results;
}

/**
 * 将搜索结果格式化为注入上下文的文本
 */
export function formatSearchResults(
  results: SearchResult[],
  query: string
): string {
  if (results.length === 0) {
    return `用户搜索了「${query}」，但未找到相关结果。请告知用户。`;
  }

  let text = `以下是关于「${query}」的网络搜索结果，请基于这些信息回答用户问题：\n\n`;

  for (const r of results) {
    text += `**${r.title}**\n`;
    text += `来源：${extractDomain(r.url)}\n`;
    text += `内容：${r.content}\n\n`;
  }

  text += "请在回答中引用搜索结果的信息，并在末尾注明参考来源（格式：[标题](链接)）。";

  return text;
}
