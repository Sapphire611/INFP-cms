/**
 * Unit tests for research tool — 组合工具：搜索 → 并行抓正文 → 汇总
 * @jest-environment node
 */

jest.mock("ai");

import { research, researchTopic } from "./research.tool";
import { reflectOnToolResults } from "@/services/agentReflection";

// ─── 假数据 ─────────────────────────────────────────────────

/** 4 条结果 —— 比 MAX_PAGES(3) 多一条，用来验证"只抓前 3 条" */
const bingHtml = `
<html><body>
<li class="b_algo"><h2><a href="https://news.example.com/a1">AI 动态 第一篇</a></h2><p>第一篇摘要</p></li>
<li class="b_algo"><h2><a href="https://news.example.com/a2">AI 动态 第二篇</a></h2><p>第二篇摘要</p></li>
<li class="b_algo"><h2><a href="https://news.example.com/a3">AI 动态 第三篇</a></h2><p>第三篇摘要</p></li>
<li class="b_algo"><h2><a href="https://news.example.com/a4">AI 动态 第四篇</a></h2><p>第四篇摘要</p></li>
</body></html>`;

/** DDG：第一条是跳转包装（真实 DDG 的常见形态），第二条没有 href */
const ddgHtml = `
<html><body>
<div class="result">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fopenweathermap.org%2F&rut=abc">OpenWeatherMap</a>
  <span class="result__snippet">Weather API and forecasts worldwide</span>
  <span class="result__url">openweathermap.org</span>
</div>
<div class="result">
  <a class="result__a">No Href Result</a>
  <span class="result__snippet">snippet without any href at all</span>
  <span class="result__url">example.com</span>
</div>
</body></html>`;

const htmlResponse = (title: string, body: string) =>
  new Response(`<html><head><title>${title}</title></head><body><main>${body}</main></body></html>`, {
    status: 200,
    headers: { "content-type": "text/html" },
  });

const searchResponse = (body: string) => new Response(body, { status: 200, headers: { "content-type": "text/html" } });

/** 所有测试共用的路由：搜索请求走假 HTML，页面请求走传入的处理函数 */
function routeFetch(pageHandler: (url: string) => Response | never) {
  (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
    if (url.includes("bing.com/search")) return searchResponse(bingHtml);
    if (url.includes("html.duckduckgo.com")) return searchResponse(ddgHtml);
    // 解码失败的话会直接来抓这个跳转地址 —— 让它报错，别伪装成成功
    if (url.includes("duckduckgo.com/l/")) {
      throw new Error(`DDG 跳转链接没有被解码，不该直接抓：${url}`);
    }
    return pageHandler(url);
  });
}

const allPagesOk = (url: string) => {
  if (url.includes("/a1")) return htmlResponse("第一篇", "第一篇的正文内容");
  if (url.includes("/a2")) return htmlResponse("第二篇", "第二篇的正文内容");
  if (url.includes("/a3")) return htmlResponse("第三篇", "第三篇的正文内容");
  return htmlResponse("某页", "正文");
};

// ─── 测试 ───────────────────────────────────────────────────

describe("research tool — 搜索 + 抓取组合", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  // ── 正常路径 ──

  it("搜索成功 + 全部抓取成功 → 继承搜索的可信度 0.85", async () => {
    routeFetch(allPagesOk);

    const result = await research.execute!({ query: "AI 行业动态" });

    expect(result.success).toBe(true);
    expect(result.data.fetchedCount).toBe(3);
    expect(result.data.sources).toHaveLength(3);
    expect(result.data.sources.every((s) => s.fetched)).toBe(true);
    expect(result.data.sources[0].text).toContain("第一篇的正文内容");
    // 全部抓到 → 不降级，继承 webSearch 的 0.85
    expect(result.metadata.confidence).toBe(0.85);
  });

  it("只抓前 MAX_PAGES(3) 条，第 4 条不进候选", async () => {
    routeFetch(allPagesOk);

    const result = await research.execute!({ query: "AI 行业动态" });
    const urls = result.data.sources.map((s) => s.url);

    expect(urls).toHaveLength(3);
    expect(urls).not.toContain("https://news.example.com/a4");
  });

  it("抓取失败的那条仍然带着搜索摘要兜底", async () => {
    routeFetch(allPagesOk);

    const result = await research.execute!({ query: "AI 行业动态" });
    expect(result.data.sources[0].snippet).toBeTruthy();
  });

  it("metadata.source 写清楚来源和抓到的篇数", async () => {
    routeFetch(allPagesOk);

    const result = await research.execute!({ query: "AI 行业动态" });
    expect(result.metadata.source).toContain("Bing");
    expect(result.metadata.source).toContain("3");
  });

  // ── 降级：抓取失败 ──

  it("部分抓取失败 → 0.78（刻意低于反思阈值，会触发自检）", async () => {
    routeFetch((url) => {
      if (url.includes("/a2")) return new Response("Not Found", { status: 404 });
      return allPagesOk(url);
    });

    const result = await research.execute!({ query: "AI 行业动态" });

    expect(result.success).toBe(true);
    expect(result.data.fetchedCount).toBe(2);
    expect(result.metadata.confidence).toBe(0.78);

    const failed = result.data.sources.find((s) => !s.fetched)!;
    expect(failed.note).toBeTruthy();
    expect(failed.snippet).toBeTruthy();
  });

  it("全部抓取失败 → 0.5，模型必须知道手上只有摘要", async () => {
    routeFetch(() => new Response("Not Found", { status: 404 }));

    const result = await research.execute!({ query: "AI 行业动态" });

    expect(result.success).toBe(true);
    expect(result.data.fetchedCount).toBe(0);
    expect(result.metadata.confidence).toBe(0.5);
  });

  // ── 和反思步骤的契约 ──

  it("抓取失败的结果会被反思步骤标记（0.78 < CONFIDENCE_FLOOR 0.8）", async () => {
    routeFetch(() => new Response("Not Found", { status: 404 }));

    const result = await research.execute!({ query: "AI 行业动态" });
    const reflection = reflectOnToolResults([{ toolName: "research", output: result }]);

    expect(reflection).not.toBeNull();
    expect(reflection).toContain("research");
  });

  it("全部成功的结果不会触发反思", async () => {
    routeFetch(allPagesOk);

    const result = await research.execute!({ query: "AI 行业动态" });
    expect(reflectOnToolResults([{ toolName: "research", output: result }])).toBeNull();
  });

  // ── 搜索失败 ──

  it("搜索两端都挂 → 透传 ALL_SOURCES_FAILED，不做无谓的抓取", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("network down"));

    const result = await research.execute!({ query: "AI 行业动态" });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("ALL_SOURCES_FAILED");
    expect(result.error?.retryable).toBe(true);
  });

  // ── 降级链路：DDG 的链接必须真的能抓 ──
  //
  // DDG 已不是主源（见 webSearch.tool.ts 顶部的实测记录），
  // 所以要先让 Bing 挂掉，才走得到它。

  it("降级到 DDG 时能解开 uddg 跳转并抓到真实 URL", async () => {
    const fetchedUrls: string[] = [];

    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes("bing.com/search")) throw new Error("Bing timeout");
      if (url.includes("html.duckduckgo.com")) return searchResponse(ddgHtml);
      if (url.includes("duckduckgo.com/l/")) {
        throw new Error(`DDG 跳转链接没有被解码：${url}`);
      }
      fetchedUrls.push(url);
      return htmlResponse("OpenWeatherMap", "正文内容");
    });

    const result = await research.execute!({ query: "weather api" });

    expect(fetchedUrls).toContain("https://openweathermap.org/");
    expect(result.data.fetchedCount).toBe(1);
  });

  it("搜索结果里不是 http 的条目（如「无链接」）不进候选", async () => {
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes("bing.com/search")) throw new Error("Bing timeout");
      if (url.includes("html.duckduckgo.com")) return searchResponse(ddgHtml);
      if (url.includes("duckduckgo.com/l/")) throw new Error("跳转链接未解码");
      return htmlResponse("OpenWeatherMap", "正文内容");
    });

    const result = await research.execute!({ query: "weather api" });
    const urls = result.data.sources.map((s) => s.url);

    // ddgHtml 有 2 条，但第 2 条没有 href（显示文本 "example.com"）
    expect(urls).toHaveLength(1);
    expect(urls).toContain("https://openweathermap.org/");
  });

  // ── 正文截断 ──

  it("每篇正文截断到 2500 字符（3 篇全塞进来会吃掉太多上下文）", async () => {
    routeFetch(() => htmlResponse("长文", "x".repeat(5000)));

    const result = await research.execute!({ query: "AI 行业动态" });

    expect(result.data.sources[0].text!.length).toBe(2500);
  });
});

describe("researchTopic — 直接调用实现本体的入口", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("绕过 tool 包装也能跑（组合工具复用它）", async () => {
    routeFetch(allPagesOk);

    const result = await researchTopic("AI 行业动态");
    expect(result.success).toBe(true);
    expect(result.data.query).toBe("AI 行业动态");
  });
});
