/**
 * Unit tests for webSearch tool — 按环境选主搜索源，另一个自动降级
 * @jest-environment node
 */

jest.mock("ai");

import { webSearch } from "./webSearch.tool";

/** @types/node 把 process.env.NODE_ENV 标成只读，测试里要临时改它 */
function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

// Realistic Bing HTML for "上海天气" query
const bingHtml = `
<html><body>
<li class="b_algo">
  <div class="b_tpcn"><a href="https://example.com/icon"><div class="tpic"></div></a></div>
  <h2><a href="https://weather.example.com/shanghai">上海天气预报 — 中国天气网</a></h2>
  <p>上海今日多云，22°C~28°C，东南风3级，空气质量良。</p>
  <div class="b_caption"><p>上海天气预报,提供上海天气一周 forecast。</p></div>
</li>
<li class="b_algo">
  <div class="b_tpcn"><a href="https://example.com/icon2"><div class="tpic"></div></a></div>
  <h2><a href="https://tianqi.example.com/shanghai">上海天气 — 墨迹天气</a></h2>
  <p>实时温度24°C，相对湿度60%，紫外线弱。</p>
</li>
<li class="b_algo">
  <div class="b_tpcn"><a href="https://example.com/icon3"><div class="tpic"></div></a></div>
  <h2><a href="https://weather.cn/shanghai">上海一周天气展望 — 中国气象局</a></h2>
  <div class="b_caption"><p>本周上海以多云为主，偶有阵雨，最高气温30°C。</p></div>
</li>
</body></html>`;

// Realistic DuckDuckGo HTML for "weather" query
// Note: using <span> instead of <td> because cheerio strips orphan <td> tags (HTML spec)
const ddgHtml = `
<html><body>
<div class="result">
  <a class="result__a" href="https://weather.com/">National Weather Service</a>
  <span class="result__snippet">Get the latest weather forecasts, radar, and alerts</span>
  <span class="result__url">weather.com</span>
</div>
<div class="result">
  <a class="result__a" href="https://openweathermap.org/">OpenWeatherMap</a>
  <span class="result__snippet">Weather API and forecasts for any location worldwide</span>
  <span class="result__url">openweathermap.org</span>
</div>
</body></html>`;

describe("webSearch tool — 搜索源优先级", () => {
  const originalEnv = process.env.NODE_ENV;

  const bingResponse = () =>
    new Response(bingHtml, { status: 200, headers: { "content-type": "text/html" } });
  const ddgResponse = () =>
    new Response(ddgHtml, { status: 200, headers: { "content-type": "text/html" } });

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    setNodeEnv(originalEnv);
  });

  // ── 环境决定主源 ──

  it("开发环境 → Bing 做主源", async () => {
    setNodeEnv("development");
    (global.fetch as jest.Mock).mockResolvedValueOnce(bingResponse());

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.success).toBe(true);
    expect(result.data.source).toBe("Bing");
    expect(result.data.degraded).toBe(false);
  });

  it("生产环境 → DuckDuckGo 做主源", async () => {
    setNodeEnv("production");
    (global.fetch as jest.Mock).mockResolvedValueOnce(ddgResponse());

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.success).toBe(true);
    expect(result.data.source).toBe("DuckDuckGo");
    expect(result.data.degraded).toBe(false);
  });

  it("查询语言不再影响源的选择（曾经中文走 Bing、英文走 DDG）", async () => {
    setNodeEnv("development");

    (global.fetch as jest.Mock).mockResolvedValueOnce(bingResponse());
    const chinese = await webSearch.execute!({ query: "上海天气" });
    expect(chinese.data.source).toBe("Bing");

    (global.fetch as jest.Mock).mockResolvedValueOnce(bingResponse());
    const english = await webSearch.execute!({ query: "weather forecast" });
    expect(english.data.source).toBe("Bing");
  });

  // ── 解析 ──

  it("parses Bing search results correctly", async () => {
    setNodeEnv("development");
    (global.fetch as jest.Mock).mockResolvedValueOnce(bingResponse());

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.data.results.length).toBe(3);
    expect(result.data.results[0].title).toContain("上海天气");
    expect(result.data.results[0].url).toBe("https://weather.example.com/shanghai");
    expect(result.data.results[0].snippet).toBeTruthy();
  });

  it("parses DuckDuckGo search results correctly", async () => {
    setNodeEnv("production");
    (global.fetch as jest.Mock).mockResolvedValueOnce(ddgResponse());

    const result = await webSearch.execute!({ query: "weather" });
    expect(result.data.results.length).toBe(2);
    expect(result.data.results[0].title).toBe("National Weather Service");
    expect(result.data.results[0].url).toBe("weather.com");
    expect(result.data.results[0].snippet).toBeTruthy();
  });

  // ── 主源失败降级 ──

  it("Bing 失败 → 降级到 DuckDuckGo", async () => {
    setNodeEnv("development");
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Bing timeout"))
      .mockResolvedValueOnce(ddgResponse());

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.success).toBe(true);
    expect(result.data.source).toBe("DuckDuckGo");
    expect(result.data.degraded).toBe(true);
    expect(result.metadata.confidence).toBeLessThan(0.85);
  });

  it("DuckDuckGo 失败 → 降级到 Bing", async () => {
    setNodeEnv("production");
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("DDG timeout"))
      .mockResolvedValueOnce(bingResponse());

    const result = await webSearch.execute!({ query: "weather forecast" });
    expect(result.success).toBe(true);
    expect(result.data.source).toBe("Bing");
    expect(result.data.degraded).toBe(true);
  });

  // ── 两个源都挂 ──

  it("returns failure when both engines fail", async () => {
    setNodeEnv("development");
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Bing down"))
      .mockRejectedValueOnce(new Error("DDG down"));

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("ALL_SOURCES_FAILED");
    expect(result.error?.retryable).toBe(true);
  });

  // ── 可信度取值（agentReflection 的阈值 0.8 就卡在这张表上）──

  it("主源成功且结果充足 → 0.85", async () => {
    setNodeEnv("development");
    (global.fetch as jest.Mock).mockResolvedValueOnce(bingResponse());

    const result = await webSearch.execute!({ query: "上海天气" });
    // 3 results >= 3 → 0.85（高于反思阈值 0.8，不触发自检）
    expect(result.metadata.confidence).toBe(0.85);
  });

  it("降级成功但结果偏少 → 0.6（会触发反思）", async () => {
    setNodeEnv("development");
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Bing timeout"))
      .mockResolvedValueOnce(ddgResponse()); // 2 条结果

    const result = await webSearch.execute!({ query: "上海天气" });
    // 降级 + <3 条 → 0.6
    expect(result.data.degraded).toBe(true);
    expect(result.metadata.confidence).toBe(0.6);
  });
});
