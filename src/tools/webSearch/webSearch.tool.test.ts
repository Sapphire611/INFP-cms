/**
 * Unit tests for webSearch tool — 主源固定 Bing，DuckDuckGo 自动降级
 * @jest-environment node
 */

jest.mock("ai");

import { webSearch } from "./webSearch.tool";

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
//
// 两个 result 刻意用 DDG 的两种链接形态：
//   1. 直接是目标地址
//   2. //duckduckgo.com/l/?uddg=<encoded> 跳转包装（真实 DDG 更常见的就是这种）
// 两种都必须还原成可抓取的真实 URL —— 见 resolveDdgUrl 的注释。
const ddgHtml = `
<html><body>
<div class="result">
  <a class="result__a" href="https://weather.com/">National Weather Service</a>
  <span class="result__snippet">Get the latest weather forecasts, radar, and alerts</span>
  <span class="result__url">weather.com</span>
</div>
<div class="result">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fopenweathermap.org%2F&rut=abc123">OpenWeatherMap</a>
  <span class="result__snippet">Weather API and forecasts for any location worldwide</span>
  <span class="result__url">openweathermap.org</span>
</div>
</body></html>`;

describe("webSearch tool — 搜索源优先级", () => {
  const bingResponse = () =>
    new Response(bingHtml, { status: 200, headers: { "content-type": "text/html" } });
  const ddgResponse = () =>
    new Response(ddgHtml, { status: 200, headers: { "content-type": "text/html" } });

  /** DDG 现在是降级源：必须先让主源 Bing 挂掉，才走得到它 */
  const withBingDown = (ddg: Response) =>
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Bing timeout"))
      .mockResolvedValueOnce(ddg);

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  // ── 主源固定 Bing ──

  // 曾经是「dev → Bing / prod → DuckDuckGo」。2026-09-16 实测推翻了它：
  // DDG 对数据中心/VPN IP 返回反爬挑战页（0 条结果）→ 线上每次搜索都降级、
  // confidence 恒为 0.75 → 反思每轮误报。这条测试锁住「不再按环境切」，防改回去。
  it("生产环境也用 Bing 做主源（不再按环境切换）", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    (global.fetch as jest.Mock).mockResolvedValueOnce(bingResponse());
    const result = await webSearch.execute!({ query: "上海天气" });

    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;

    expect(result.success).toBe(true);
    expect(result.data.source).toBe("Bing");
    expect(result.data.degraded).toBe(false);
  });

  it("查询语言不再影响源的选择（曾经中文走 Bing、英文走 DDG）", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(bingResponse());
    const chinese = await webSearch.execute!({ query: "上海天气" });
    expect(chinese.data.source).toBe("Bing");

    (global.fetch as jest.Mock).mockResolvedValueOnce(bingResponse());
    const english = await webSearch.execute!({ query: "weather forecast" });
    expect(english.data.source).toBe("Bing");
  });

  // ── 解析 ──

  it("parses Bing search results correctly", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(bingResponse());

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.data.results.length).toBe(3);
    expect(result.data.results[0].title).toContain("上海天气");
    expect(result.data.results[0].url).toBe("https://weather.example.com/shanghai");
    expect(result.data.results[0].snippet).toBeTruthy();
  });

  it("parses DuckDuckGo search results correctly", async () => {
    withBingDown(ddgResponse());

    const result = await webSearch.execute!({ query: "weather" });
    expect(result.data.source).toBe("DuckDuckGo");
    expect(result.data.results.length).toBe(2);
    expect(result.data.results[0].title).toBe("National Weather Service");
    expect(result.data.results[0].snippet).toBeTruthy();
  });

  // ── DDG 的 URL 必须是可抓取的（曾经取的是显示文本）──
  //
  // 以前这里取 .result__url 的文本（"weather.com"），那不是合法 URL，
  // 喂给 fetchPage 会被判非法 —— research 这类二跳抓取就全废了。

  it("从 DDG 的 href 取出真实 URL，而不是显示文本", async () => {
    withBingDown(ddgResponse());

    const result = await webSearch.execute!({ query: "weather" });
    expect(result.data.results[0].url).toBe("https://weather.com/");
  });

  it("解开 DDG 的 uddg 跳转包装，还原目标 URL", async () => {
    withBingDown(ddgResponse());

    const result = await webSearch.execute!({ query: "weather" });
    // //duckduckgo.com/l/?uddg=https%3A%2F%2Fopenweathermap.org%2F&rut=abc123
    expect(result.data.results[1].url).toBe("https://openweathermap.org/");
  });

  it("DDG 结果里没有 href 时退回显示文本，不崩", async () => {
    withBingDown(
      new Response(
        `<html><body><div class="result">
           <a class="result__a">No Link Result</a>
           <span class="result__snippet">snippet text here</span>
           <span class="result__url">example.com</span>
         </div></body></html>`,
        { status: 200, headers: { "content-type": "text/html" } }
      )
    );

    const result = await webSearch.execute!({ query: "weather" });
    expect(result.success).toBe(true);
    expect(result.data.results[0].url).toBe("example.com");
  });

  // ── 主源失败降级 ──

  it("Bing 失败 → 降级到 DuckDuckGo", async () => {
    withBingDown(ddgResponse());

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.success).toBe(true);
    expect(result.data.source).toBe("DuckDuckGo");
    expect(result.data.degraded).toBe(true);
    expect(result.metadata.confidence).toBeLessThan(0.85);
  });

  // ── 两个源都挂 ──

  it("returns failure when both engines fail", async () => {
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
    (global.fetch as jest.Mock).mockResolvedValueOnce(bingResponse());

    const result = await webSearch.execute!({ query: "上海天气" });
    // 3 results >= 3 → 0.85（高于反思阈值 0.8，不触发自检）
    expect(result.metadata.confidence).toBe(0.85);
  });

  it("降级成功但结果偏少 → 0.6（会触发反思）", async () => {
    withBingDown(ddgResponse()); // 2 条结果

    const result = await webSearch.execute!({ query: "上海天气" });
    // 降级 + <3 条 → 0.6
    expect(result.data.degraded).toBe(true);
    expect(result.metadata.confidence).toBe(0.6);
  });
});
