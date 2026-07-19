/**
 * Unit tests for tool result types (success / failure constructors)
 */
import { success, failure } from "./types";

describe("ToolResult — success()", () => {
  it("returns success=true with data and default confidence", () => {
    const result = success({ city: "Beijing", temp: 25 }, { source: "wttr.in" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ city: "Beijing", temp: 25 });
    expect(result.metadata.source).toBe("wttr.in");
    expect(result.metadata.confidence).toBe(0.9);
    expect(result.metadata.latencyMs).toBe(0);
  });

  it("respects explicit confidence and latencyMs", () => {
    const result = success("done", { source: "test", confidence: 0.5, latencyMs: 42 });

    expect(result.metadata.confidence).toBe(0.5);
    expect(result.metadata.latencyMs).toBe(42);
  });

  it("has no error field", () => {
    const result = success(123, { source: "calc" });
    expect(result.error).toBeUndefined();
  });
});

describe("ToolResult — failure()", () => {
  it("returns success=false with error code and message", () => {
    const result = failure("TIMEOUT", "请求超时");

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("TIMEOUT");
    expect(result.error?.message).toBe("请求超时");
    expect(result.error?.retryable).toBe(false);
  });

  it("sets retryable when specified", () => {
    const retryable = failure("TIMEOUT", "timeout", { retryable: true });
    expect(retryable.error?.retryable).toBe(true);

    const fatal = failure("PARSE_ERROR", "bad json", { retryable: false });
    expect(fatal.error?.retryable).toBe(false);
  });

  it("stores fallback data", () => {
    const result = failure("NOT_FOUND", "city not found", {
      fallback: { suggestion: "try English name" },
    });

    expect(result.error?.fallback).toEqual({ suggestion: "try English name" });
  });

  it("metadata indicates error source with zero confidence", () => {
    const result = failure("EVAL_ERROR", "bad expression");
    expect(result.metadata.source).toBe("error");
    expect(result.metadata.confidence).toBe(0);
  });
});
