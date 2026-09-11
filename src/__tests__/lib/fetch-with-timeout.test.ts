import { FETCH_TIMEOUT_MS, fetchWithTimeout } from "@/lib/fetch-with-timeout";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

/** 模拟一个永远不返回、只在 abort 时 reject 的请求（等价于 Supabase 掉线） */
const hangFetch = () => {
  mockFetch.mockImplementation(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error("fetchWithTimeout 必须给 fetch 传 signal"));
          return;
        }
        // 真实 fetch 的行为：signal 已 abort 就立刻 reject
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener("abort", () => reject(signal.reason));
      }),
  );
};

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("超时前正常返回响应", async () => {
    const fakeResponse = { status: 200 } as Response;
    mockFetch.mockResolvedValue(fakeResponse);

    await expect(fetchWithTimeout("https://example.com")).resolves.toBe(fakeResponse);
  });

  it("总是给 fetch 传一个 signal", async () => {
    mockFetch.mockResolvedValue({ status: 200 } as Response);

    await fetchWithTimeout("https://example.com");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("挂住的请求会被超时 abort，而不是永远等下去", async () => {
    hangFetch();

    await expect(fetchWithTimeout("https://example.com", undefined, 20)).rejects.toThrow();
  });

  it("调用方自己的 signal 仍然生效", async () => {
    hangFetch();
    const controller = new AbortController();

    const pending = fetchWithTimeout("https://example.com", { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toThrow();
  });

  it("传入已经 abort 的 signal 时立即失败", async () => {
    hangFetch();
    const controller = new AbortController();
    controller.abort();

    await expect(fetchWithTimeout("https://example.com", { signal: controller.signal })).rejects.toThrow();
  });

  it("默认超时为 10 秒", () => {
    expect(FETCH_TIMEOUT_MS).toBe(10_000);
  });
});
