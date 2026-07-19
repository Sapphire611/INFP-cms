/**
 * Unit tests for fetchWebPage tool — SSRF protection & HTML extraction
 * @jest-environment node
 */

jest.mock("ai");

import { fetchWebPage } from "./fetchWebPage.tool";

const sampleHtml = `
<html>
<head><title>Test Article</title></head>
<body>
  <nav>Skip this nav content</nav>
  <header>Site header</header>
  <main>
    <article class="post-content">
      <h1>Test Article Title</h1>
      <p>This is the main content of the article. It contains meaningful text.</p>
      <p>Second paragraph with more details about the topic.</p>
    </article>
  </main>
  <footer>Copyright 2026 - skip this</footer>
  <script>console.log("skip scripts")</script>
  <style>.hidden { display: none; }</style>
</body>
</html>`;

describe("fetchWebPage tool — SSRF protection", () => {
  // ── URL blocking (SSRF) ──

  it("blocks localhost", async () => {
    const result = await fetchWebPage.execute!({ url: "http://localhost:3000/admin" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });

  it("blocks 127.0.0.1", async () => {
    const result = await fetchWebPage.execute!({ url: "http://127.0.0.1/api" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });

  it("blocks private IP ranges (192.168.x.x)", async () => {
    const result = await fetchWebPage.execute!({ url: "http://192.168.1.1/config" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });

  it("blocks 10.x.x.x private range", async () => {
    const result = await fetchWebPage.execute!({ url: "http://10.0.0.1/internal" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });

  it("blocks 172.16-31.x.x private range", async () => {
    const result = await fetchWebPage.execute!({ url: "http://172.16.0.1/private" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });

  it("blocks metadata service IP (100.100.100.x)", async () => {
    const result = await fetchWebPage.execute!({ url: "http://100.100.100.100/metadata" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });

  it("blocks non-http protocols", async () => {
    const result = await fetchWebPage.execute!({ url: "file:///etc/passwd" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });

  it("blocks IPv6 loopback", async () => {
    const result = await fetchWebPage.execute!({ url: "http://[::1]:8080/admin" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });

  it("blocks IPv6 link-local (fe80::)", async () => {
    const result = await fetchWebPage.execute!({ url: "http://[fe80::1]:8080/" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });

  // ── .local domains ──

  it("blocks .local domains", async () => {
    const result = await fetchWebPage.execute!({
      url: "http://internal.local/admin",
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });

  // ── Invalid URLs ──

  it("blocks malformed URLs", async () => {
    const result = await fetchWebPage.execute!({ url: "not-a-url" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BLOCKED_URL");
  });
});

describe("fetchWebPage tool — HTML extraction", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("extracts title and text content", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(sampleHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    );

    const result = await fetchWebPage.execute!({
      url: "https://example.com/article",
    });
    expect(result.success).toBe(true);
    expect(result.data.title).toBe("Test Article");
    expect(result.data.textContent).toContain("Test Article Title");
    expect(result.data.textContent).toContain("main content");
    expect(result.data.textContent).toContain("Second paragraph");
  });

  it("strips script and style tags", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(sampleHtml, { status: 200, headers: { "content-type": "text/html" } })
    );

    const result = await fetchWebPage.execute!({
      url: "https://example.com/article",
    });
    expect(result.data.textContent).not.toContain("console.log");
    expect(result.data.textContent).not.toContain("display: none");
  });

  it("strips nav and footer content", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(sampleHtml, { status: 200, headers: { "content-type": "text/html" } })
    );

    const result = await fetchWebPage.execute!({
      url: "https://example.com/article",
    });
    expect(result.data.textContent).not.toContain("Skip this nav content");
    expect(result.data.textContent).not.toContain("Copyright 2026");
  });

  it("returns metadata", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(sampleHtml, { status: 200, headers: { "content-type": "text/html" } })
    );

    const result = await fetchWebPage.execute!({
      url: "https://example.com/article",
    });
    expect(result.metadata.source).toContain("example.com");
    expect(result.metadata.confidence).toBe(0.85);
  });

  it("indicates truncation when text exceeds limit", async () => {
    const longText = "x".repeat(7000);
    const html = `<html><head><title>Long</title></head><body><p>${longText}</p></body></html>`;

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(html, { status: 200, headers: { "content-type": "text/html" } })
    );

    const result = await fetchWebPage.execute!({
      url: "https://example.com/long",
    });
    expect(result.success).toBe(true);
    expect(result.data.truncated).toBe(true);
    expect(result.data.textContent.length).toBeLessThanOrEqual(7000);
  });

  it("handles HTTP error responses", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const result = await fetchWebPage.execute!({
      url: "https://example.com/missing",
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("HTTP_ERROR");
  });

  it("retryable=true for 5xx errors", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response("Error", { status: 503 })
    );

    const result = await fetchWebPage.execute!({
      url: "https://example.com/error",
    });
    expect(result.error?.retryable).toBe(true);
  });

  it("rejects non-HTML content types", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(Buffer.from("PDF content"), {
        status: 200,
        headers: { "content-type": "application/pdf" },
      })
    );

    const result = await fetchWebPage.execute!({
      url: "https://example.com/doc.pdf",
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("UNSUPPORTED_TYPE");
  });

  it("handles network timeout", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new DOMException("The operation was aborted", "AbortError")
    );

    const result = await fetchWebPage.execute!({
      url: "https://slow.example.com/",
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TIMEOUT");
    expect(result.error?.retryable).toBe(true);
  });

  it("detects empty JS-rendered pages", async () => {
    const noContentHtml = "<html><head><title>SPA</title></head><body></body></html>";

    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(noContentHtml, { status: 200, headers: { "content-type": "text/html" } })
    );

    const result = await fetchWebPage.execute!({
      url: "https://spa.example.com/",
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("EMPTY_CONTENT");
  });
});
