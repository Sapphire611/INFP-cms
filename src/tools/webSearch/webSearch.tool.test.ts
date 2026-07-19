/**
 * Unit tests for webSearch tool — Bing/DuckDuckGo language routing
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

describe("webSearch tool — language routing", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  // ── Language routing ──

  it("routes Chinese query to Bing primary", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(bingHtml, { status: 200, headers: { "content-type": "text/html" } })
    );

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.success).toBe(true);
    expect(result.data.source).toBe("Bing");
    expect(result.data.degraded).toBe(false);
    expect(result.data.results.length).toBeGreaterThan(0);
  });

  it("routes English query to DuckDuckGo primary", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(ddgHtml, { status: 200, headers: { "content-type": "text/html" } })
    );

    const result = await webSearch.execute!({ query: "weather forecast" });
    expect(result.success).toBe(true);
    expect(result.data.source).toBe("DuckDuckGo");
    expect(result.data.degraded).toBe(false);
  });

  // ── Bing parsing ──

  it("parses Bing search results correctly", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(bingHtml, { status: 200, headers: { "content-type": "text/html" } })
    );

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.data.results.length).toBe(3);
    expect(result.data.results[0].title).toContain("上海天气");
    expect(result.data.results[0].url).toBe("https://weather.example.com/shanghai");
    expect(result.data.results[0].snippet).toBeTruthy();
  });

  // ── DuckDuckGo parsing ──

  it("parses DuckDuckGo search results correctly", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(ddgHtml, { status: 200, headers: { "content-type": "text/html" } })
    );

    const result = await webSearch.execute!({ query: "weather" });
    expect(result.data.results.length).toBe(2);
    expect(result.data.results[0].title).toBe("National Weather Service");
    expect(result.data.results[0].url).toBe("weather.com");
    expect(result.data.results[0].snippet).toBeTruthy();
  });

  // ── Fallback on primary failure ──

  it("falls back to DuckDuckGo when Bing fails (Chinese query)", async () => {
    (global.fetch as jest.Mock)
      // Bing fails
      .mockRejectedValueOnce(new Error("Bing timeout"))
      // DDG succeeds
      .mockResolvedValueOnce(
        new Response(ddgHtml, { status: 200, headers: { "content-type": "text/html" } })
      );

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.success).toBe(true);
    expect(result.data.source).toBe("DuckDuckGo");
    expect(result.data.degraded).toBe(true);
    expect(result.metadata.confidence).toBeLessThan(0.85);
  });

  it("falls back to Bing when DuckDuckGo fails (English query)", async () => {
    (global.fetch as jest.Mock)
      // DDG fails
      .mockRejectedValueOnce(new Error("DDG timeout"))
      // Bing succeeds
      .mockResolvedValueOnce(
        new Response(bingHtml, { status: 200, headers: { "content-type": "text/html" } })
      );

    const result = await webSearch.execute!({ query: "weather forecast" });
    expect(result.success).toBe(true);
    expect(result.data.source).toBe("Bing");
    expect(result.data.degraded).toBe(true);
  });

  // ── Both exhausted ──

  it("returns failure when both engines fail", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Bing down"))
      .mockRejectedValueOnce(new Error("DDG down"));

    const result = await webSearch.execute!({ query: "上海天气" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("ALL_SOURCES_FAILED");
    expect(result.error?.retryable).toBe(true);
  });

  // ── Confidence ──

  it("sets higher confidence with more results", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(bingHtml, { status: 200, headers: { "content-type": "text/html" } })
    );

    const result = await webSearch.execute!({ query: "上海天气" });
    // 3 results >= 3 → confidence 0.85
    expect(result.metadata.confidence).toBe(0.85);
  });
});
