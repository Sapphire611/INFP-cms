/**
 * 反思模块的单元测试 —— 纯函数，不需要任何 mock。
 *
 * 这个模块的职责是"读工具早就返回的 metadata，判断结果能不能用"，
 * 所以重点测两件事：
 *   1. 该报的能报出来（失败 / 低可信度）
 *   2. 不该报的不要误报（健康结果、非 ToolResult 形状的返回值）
 *
 * @jest-environment node
 */

import { appendReflectionIfNeeded, reflectOnToolResults } from "@/services/agentReflection";

/** 造一个工具返回值 */
function tool(toolName: string, output: unknown): { toolName: string; output: unknown } {
  return { toolName, output };
}

function healthy(confidence = 0.9) {
  return {
    success: true,
    data: {},
    metadata: { source: "test", confidence, latencyMs: 10 },
  };
}

function failed(code: string, retryable: boolean) {
  return {
    success: false,
    data: null,
    metadata: { source: "error", confidence: 0, latencyMs: 10 },
    error: { code, message: "boom", retryable },
  };
}

describe("reflectOnToolResults", () => {
  describe("不该报的情况", () => {
    it("结果全部健康 → 返回 null", () => {
      expect(reflectOnToolResults([tool("webSearch", healthy(0.85)), tool("getWeather", healthy(0.92))])).toBeNull();
    });

    it("空结果集 → 返回 null", () => {
      expect(reflectOnToolResults([])).toBeNull();
    });

    it("可信度正好等于阈值 0.8 → 不算问题（边界）", () => {
      expect(reflectOnToolResults([tool("webSearch", healthy(0.8))])).toBeNull();
    });

    it("返回值不是 ToolResult 形状 → 不妄下判断", () => {
      expect(
        reflectOnToolResults([
          tool("weirdTool", null),
          tool("plainString", "just a string"),
          tool("noSuccessField", { data: [], metadata: {} }),
          tool("emptyObject", {}),
        ]),
      ).toBeNull();
    });

    it("缺 metadata 时按高可信度处理，不误报", () => {
      expect(reflectOnToolResults([tool("bare", { success: true, data: 1 })])).toBeNull();
    });
  });

  describe("该报的情况", () => {
    it("可信度低于阈值（0.79 < 0.8）→ 报出来", () => {
      const result = reflectOnToolResults([tool("webSearch", healthy(0.79))]);

      expect(result).not.toBeNull();
      expect(result).toContain("webSearch");
      expect(result).toContain("0.79");
    });

    it("主源超时降级（0.75）→ 必须报出来", () => {
      // 回归测试：阈值曾经是 0.75，而"降级但结果充足"恰好等于 0.75，
      // 0.75 < 0.75 为假 —— 主源挂掉这种最该知会用户的情况永远静默。
      const result = reflectOnToolResults([tool("webSearch", healthy(0.75))]);

      expect(result).not.toBeNull();
      expect(result).toContain("0.75");
    });

    it("webSearch 降级且结果少（0.6）→ 报出来", () => {
      const result = reflectOnToolResults([tool("webSearch", healthy(0.6))]);

      expect(result).toContain("0.60");
      expect(result).toContain("可信度低");
    });

    it("工具失败且可重试 → 提示换参数重试", () => {
      const result = reflectOnToolResults([tool("getWeather", failed("TIMEOUT", true))]);

      expect(result).toContain("getWeather");
      expect(result).toContain("TIMEOUT");
      expect(result).toContain("换参数重试可能有帮助");
    });

    it("工具失败且不可重试 → 明确说重试没用", () => {
      const result = reflectOnToolResults([tool("fetchWebPage", failed("PARSE_ERROR", false))]);

      expect(result).toContain("PARSE_ERROR");
      expect(result).toContain("同样的参数重试不会有帮助");
    });

    it("失败优先级高于可信度：失败的工具不会被当成「低可信度」重复报", () => {
      const result = reflectOnToolResults([tool("getWeather", failed("TIMEOUT", true))]);

      // confidence 是 0，但因为是失败分支，不该出现"可信度低"的措辞
      expect(result).not.toContain("可信度低");
      expect(result!.match(/getWeather/g)).toHaveLength(1);
    });

    it("多个工具混合时，只列有问题的那个", () => {
      const result = reflectOnToolResults([
        tool("calculate", healthy(0.99)),
        tool("webSearch", healthy(0.6)),
        tool("getCurrentTime", healthy(0.99)),
      ]);

      expect(result).toContain("webSearch");
      expect(result).not.toContain("calculate");
      expect(result).not.toContain("getCurrentTime");
    });

    it("提示里带上让模型自己决策的指引", () => {
      const result = reflectOnToolResults([tool("webSearch", healthy(0.6))]);

      expect(result).toContain("【结果自检】");
      expect(result).toContain("不要编造");
    });
  });
});

describe("appendReflectionIfNeeded", () => {
  it("结果健康 → 上下文原样不动", () => {
    const messages: any[] = [{ role: "user", content: "问题" }];

    appendReflectionIfNeeded(messages, [tool("webSearch", healthy(0.9))], 1);

    expect(messages).toHaveLength(1);
  });

  it("结果有问题 → 追加一条 user 消息，且排在最后", () => {
    const messages: any[] = [{ role: "user", content: "问题" }];

    appendReflectionIfNeeded(messages, [tool("webSearch", healthy(0.6))], 2);

    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("【结果自检】");
  });

  it("把结论盖章到这一轮的 trace 记录上（其他轮不受影响）", () => {
    const trace: any[] = [
      { id: "a", step: 1, toolName: "webSearch" },
      { id: "b", step: 2, toolName: "webSearch" },
    ];

    appendReflectionIfNeeded([], [tool("webSearch", healthy(0.6))], 2, trace);

    expect(trace[0].reflection).toBeUndefined();
    expect(trace[1].reflection).toContain("【结果自检】");
  });

  it("同时把事件推给前端，让用户看到 Agent 自己发现了问题", () => {
    const send = jest.fn();

    appendReflectionIfNeeded([], [tool("webSearch", healthy(0.6))], 3, [], send);

    expect(send).toHaveBeenCalledWith({
      type: "reflection",
      step: 3,
      content: expect.stringContaining("【结果自检】"),
    });
  });

  it("结果健康时不推事件（不打扰用户）", () => {
    const send = jest.fn();

    appendReflectionIfNeeded([], [tool("webSearch", healthy(0.9))], 1, [], send);

    expect(send).not.toHaveBeenCalled();
  });
});
