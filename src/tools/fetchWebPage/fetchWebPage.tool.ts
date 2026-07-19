/**
 * fetchWebPage tool — fetch a URL and extract readable text content.
 *
 * Enables chained tool calling: webSearch → fetchWebPage → analyze/summarize.
 * HTML parsing via cheerio — strips scripts/styles/nav/footer, keeps body text.
 *
 * Security: only http/https URLs, CIDR-based IP blocking (SSRF protection).
 */
import { tool } from "ai";
import { z } from "zod";
import * as cheerio from "cheerio";
import { success, failure, type ToolResult } from "../types";

interface PageData {
  url: string;
  title: string;
  textContent: string;
  textLength: number;
  truncated: boolean;
}

/** 返回给模型的文本上限，防止 context 爆炸 */
const MAX_TEXT_LENGTH = 6000;

// ═══════════════════════════════════════════════════════════════
// SSRF Protection — CIDR 匹配拦截内网地址
// ═══════════════════════════════════════════════════════════════
//
// 用 CIDR 网段匹配替代简单字符串前缀匹配。
// 覆盖 IPv4（RFC 1918 私有地址 + 链路本地 + 多播 + 云元数据服务）
// 覆盖 IPv6（回环 ::1、链路本地 fe80::/10、唯一本地 fc00::/7、多播 ff00::/8）

interface BlockedNetwork {
  cidr: string;
  reason: string;
}

const BLOCKED_NETWORKS: BlockedNetwork[] = [
  // IPv4
  { cidr: "127.0.0.0/8",       reason: "Loopback" },
  { cidr: "0.0.0.0/8",         reason: "Current network" },
  { cidr: "169.254.0.0/16",    reason: "Link-local" },
  { cidr: "10.0.0.0/8",        reason: "Private" },
  { cidr: "172.16.0.0/12",     reason: "Private" },
  { cidr: "192.168.0.0/16",    reason: "Private" },
  { cidr: "224.0.0.0/4",       reason: "Multicast" },
  { cidr: "240.0.0.0/4",       reason: "Reserved (future use)" },
  { cidr: "100.64.0.0/10",     reason: "Carrier-grade NAT" },
  // 云元数据服务（阿里云/腾讯云等）
  { cidr: "100.100.100.0/24",  reason: "Metadata service" },
  // IPv6
  { cidr: "::1/128",           reason: "Loopback" },
  { cidr: "fe80::/10",         reason: "Link-local" },
  { cidr: "fc00::/7",          reason: "Unique Local" },
  { cidr: "ff00::/8",          reason: "Multicast" },
];

// ─── IPv6 地址展开 — "::" 缩写 → 完整 8 段 ────────────────
// 例： "2001::1" → "2001:0000:0000:0000:0000:0000:0000:0001"

function expandIPv6(ip: string): string {
  if (!ip.includes("::")) {
    return ip.split(":").map((p) => p.padStart(4, "0")).join(":");
  }
  const [left, right] = ip.split("::");
  const leftParts = left ? left.split(":").filter(Boolean) : [];
  const rightParts = right ? right.split(":").filter(Boolean) : [];
  const missing = 8 - leftParts.length - rightParts.length;
  const middle = Array.from({ length: missing }, () => "0000");
  return [...leftParts, ...middle, ...rightParts]
    .map((p) => p.padStart(4, "0"))
    .join(":");
}

// ─── IP → 二进制字符串 ────────────────────────────────────
// IPv4: "192.168.1.1" → "11000000101010000000000100000001"
// IPv6: 先展开，每段 16bit

function ipToBinary(ip: string): string {
  const isV6 = ip.includes(":");
  if (isV6) {
    return expandIPv6(ip)
      .split(":")
      .map((p) => parseInt(p, 16).toString(2).padStart(16, "0"))
      .join("");
  }
  return ip
    .split(".")
    .map((octet) => parseInt(octet, 10).toString(2).padStart(8, "0"))
    .join("");
}

// ─── CIDR 匹配 — 比较 IP 和网段的前缀位 ──────────────────
// 例：isIpInCidr("192.168.1.1", "192.168.0.0/16") → true

function isIpInCidr(ip: string, cidr: string): boolean {
  const [network, prefixLen] = cidr.split("/");
  const ipBits = ipToBinary(ip);
  const netBits = ipToBinary(network);

  const maxLen = Math.max(ipBits.length, netBits.length);
  const paddedIp = ipBits.padEnd(maxLen, "0");
  const paddedNet = netBits.padEnd(maxLen, "0");

  return paddedIp.slice(0, parseInt(prefixLen, 10)) === paddedNet.slice(0, parseInt(prefixLen, 10));
}

function isBlockedUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    if (u.protocol !== "http:" && u.protocol !== "https:") return true;

    const hostname = u.hostname;

    // 快速路径：域名拦截
    if (hostname === "localhost" || hostname.endsWith(".local")) return true;

    // CIDR 匹配：遍历黑名单网段
    for (const block of BLOCKED_NETWORKS) {
      try {
        if (isIpInCidr(hostname, block.cidr)) return true;
      } catch {
        // hostname 不是有效 IP（如 "example.com"），跳过此项
      }
    }

    return false;
  } catch {
    return true; // URL 格式不合法 → 拦截
  }
}

// ═══════════════════════════════════════════════════════════════
// HTML → 纯文本正文提取（cheerio）
// ═══════════════════════════════════════════════════════════════
//
// 处理流程：
//   1. 从 <title> 取网页标题
//   2. 删掉无意义标签：script, style, noscript, nav, footer, iframe, svg
//   3. 优先提取 <main>, <article>, [role=main], .post-content 等正文容器
//   4. 如果没有正文容器，fallback 到整个 <body>
//   5. .text() 去标签 + 合并空白 → 纯文本

function extractText(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);

  // 1. 标题
  const title = $("title").text().trim() || "无标题";

  // 2. 删除非正文元素（cheerio 的 remove() 直接从 DOM 中拿掉）
  $("script, style, noscript, head, nav, footer, iframe, svg, [aria-hidden=true]").remove();

  // 3. 尝试定位正文容器（各网站常见 class）
  const $content = $("main, article, [role=main], .content, .post-content, .article-content");
  const $source = $content.length > 0 ? $content : $("body");

  // 4. .text() 自动去标签，只保留文本，合并多余空白
  const text = $source.text().replace(/\s+/g, " ").trim();

  return { title, text };
}

// ═══════════════════════════════════════════════════════════════
// Tool Definition
// ═══════════════════════════════════════════════════════════════

export const fetchWebPage = tool({
  description: [
    "抓取指定网页并提取正文文本内容。",
    "何时调用：用户让你「打开这个链接」「看看这篇文章说了什么」、",
    "或者 webSearch 找到相关页面后需要查看详细内容时。",
    "典型链式调用：webSearch 找到链接 → fetchWebPage 抓取内容 → 基于内容分析/总结。",
    "返回：网页标题 + 纯文本正文（最多 6000 字符）。",
  ].join(" "),
  inputSchema: z.object({
    url: z
      .string()
      .describe("完整的网页 URL，如 https://example.com/article，必须是 http/https 协议"),
  }),
  execute: async (input): Promise<ToolResult<PageData>> => {
    const { url } = input;
    const start = Date.now();

    // ── 安全检查 ──
    if (isBlockedUrl(url)) {
      return failure("BLOCKED_URL", "不允许访问该 URL（内网地址或非 http/https 协议）", {
        retryable: false,
      });
    }

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(12000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
      });

      if (!res.ok) {
        return failure("HTTP_ERROR", `网页请求失败: HTTP ${res.status}`, {
          retryable: res.status >= 500 || res.status === 429,
        });
      }

      // 只处理 HTML / 纯文本，拒绝二进制
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        return failure("UNSUPPORTED_TYPE", `不支持的内容类型: ${contentType}`, {
          retryable: false,
          fallback: {
            suggestion:
              "该 URL 不是 HTML 页面，可能是 PDF/图片/视频等二进制文件，请直接从搜索结果摘要中获取信息",
          },
        });
      }

      const html = await res.text();
      const { title, text } = extractText(html);

      const truncated = text.length > MAX_TEXT_LENGTH;
      const textContent = truncated ? text.slice(0, MAX_TEXT_LENGTH) + "…" : text;

      // 检测纯 JS 渲染页面（正文为空）
      if (!textContent.trim()) {
        return failure("EMPTY_CONTENT", "网页正文为空，可能是纯 JS 渲染页面", {
          retryable: false,
          fallback: {
            suggestion: "该页面可能依赖 JavaScript 渲染，无法直接抓取。请从搜索结果摘要中获取信息",
          },
        });
      }

      return success(
        { url, title, textContent, textLength: text.length, truncated },
        { source: url, confidence: 0.85, latencyMs: Date.now() - start }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout =
        msg.includes("timeout") || msg.includes("abort") || msg.includes("Timeout");
      return failure(isTimeout ? "TIMEOUT" : "FETCH_ERROR", `网页抓取失败: ${msg}`, {
        retryable: isTimeout,
      });
    }
  },
});
