/**
 * Unit tests for calculate tool — sandboxed math expression evaluator
 */

jest.mock("ai");

import { calculate } from "./calculate.tool";

describe("calculate tool", () => {
  // ── Valid expressions ──

  it("evaluates simple arithmetic", async () => {
    const result = await calculate.execute!({ expression: "2 + 3 * 4" });
    expect(result.success).toBe(true);
    expect(result.data.result).toBe(14);
    expect(result.data.expression).toBe("2 + 3 * 4");
  });

  it("evaluates Math functions", async () => {
    const result = await calculate.execute!({ expression: "Math.sqrt(144)" });
    expect(result.success).toBe(true);
    expect(result.data.result).toBe(12);
  });

  it("evaluates Trigonometry", async () => {
    const result = await calculate.execute!({ expression: "Math.sin(Math.PI / 2)" });
    expect(result.success).toBe(true);
    expect(result.data.result).toBe(1);
  });

  it("evaluates exponential", async () => {
    const result = await calculate.execute!({ expression: "Math.pow(2, 10)" });
    expect(result.success).toBe(true);
    expect(result.data.result).toBe(1024);
  });

  it("evaluates negative numbers", async () => {
    const result = await calculate.execute!({ expression: "-5 + 3" });
    expect(result.success).toBe(true);
    expect(result.data.result).toBe(-2);
  });

  it("evaluates decimal arithmetic", async () => {
    const result = await calculate.execute!({ expression: "0.1 + 0.2" });
    expect(result.success).toBe(true);
    expect(Math.abs(result.data.result - 0.3)).toBeLessThan(1e-10);
  });

  it("rounds to 10 decimal places", async () => {
    const result = await calculate.execute!({ expression: "1 / 3" });
    expect(result.success).toBe(true);
    // 1/3 rounded to 10 decimal places
    expect(result.data.result.toString().length).toBeLessThanOrEqual(12);
  });

  it("sets high confidence metadata", async () => {
    const result = await calculate.execute!({ expression: "42" });
    expect(result.metadata.source).toBe("sandboxed new Function()");
    expect(result.metadata.confidence).toBe(0.99);
  });

  // ── Invalid expressions ──

  it("rejects code injection via string literals", async () => {
    const result = await calculate.execute!({
      expression: 'globalThis.process.exit(1)',
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXPRESSION");
  });

  it("rejects expressions with semicolons", async () => {
    const result = await calculate.execute!({ expression: "1; Math.sqrt(4)" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXPRESSION");
  });

  it("rejects assignment expressions", async () => {
    const result = await calculate.execute!({ expression: "x = 5" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXPRESSION");
  });

  it("rejects backtick template literals", async () => {
    const result = await calculate.execute!({ expression: "`hello`" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_EXPRESSION");
  });

  // ── Non-finite results ──

  it("rejects division by zero", async () => {
    const result = await calculate.execute!({ expression: "1 / 0" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NON_FINITE");
  });

  it("rejects NaN results", async () => {
    const result = await calculate.execute!({ expression: "Math.sqrt(-1)" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NON_FINITE");
  });

  // ── Syntax errors ──

  it("handles syntax errors gracefully", async () => {
    const result = await calculate.execute!({ expression: "2 +" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("EVAL_ERROR");
  });

  it("handles unmatched parentheses", async () => {
    const result = await calculate.execute!({ expression: "(1 + 2" });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("EVAL_ERROR");
  });

  // ── Edge cases ──

  it("handles large numbers", async () => {
    const result = await calculate.execute!({
      expression: "Math.pow(10, 10)",
    });
    expect(result.success).toBe(true);
    expect(result.data.result).toBe(10000000000);
  });

  it("handles zero", async () => {
    const result = await calculate.execute!({ expression: "0" });
    expect(result.success).toBe(true);
    expect(result.data.result).toBe(0);
  });
});
