/**
 * 带硬超时的 fetch。
 *
 * Supabase 掉线时 fetch 会一直挂着（undici 默认 300s 才超时），请求不断堆积会把
 * dev server 的请求队列堵死 —— 连完全不依赖 Supabase 的页面（比如首页）也会跟着
 * 无法响应。这里强制快速失败，把「挂死」变成「一个明确的错误」。
 */

/** Supabase 查询是一次 PostgREST 调用，10s 已经非常宽裕。 */
export const FETCH_TIMEOUT_MS = 10_000;

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // 合并调用方自己的 signal，不要覆盖 Supabase 客户端内部的取消逻辑
  const upstream = init?.signal;
  const onUpstreamAbort = () => controller.abort();
  if (upstream) {
    if (upstream.aborted) {
      controller.abort();
    } else {
      upstream.addEventListener("abort", onUpstreamAbort, { once: true });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
    upstream?.removeEventListener("abort", onUpstreamAbort);
  });
}
