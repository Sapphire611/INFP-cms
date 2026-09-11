/**
 * chatService 的 Agent 循环测试。
 *
 * 背景：以前 chatService 调 streamText() 不传 stopWhen，AI SDK 默认
 * isStepCount(1) —— 只跑一轮，工具结果永远进不到第二轮生成，
 * 只能靠 generateForcedReply() 那个补丁硬塞。
 *
 * 这些用例锁死修复后的行为：
 *   1. 每轮显式传 stopWhen: isStepCount(1)，循环由 chatService 自己转
 *   2. 工具结果被回填进下一轮的 messages
 *   3. 模型不再调用工具 = 正常出口
 *   4. 步数上限只是安全网，触发时才强制收尾
 *   5. done 事件整圈只发一次
 *
 * @jest-environment node
 */

// ─── Mocks ─────────────────────────────────────────────────

jest.mock("ai", () => ({
  streamText: jest.fn(),
  generateText: jest.fn(async () => ({ text: "测试标题" })),
  isStepCount: jest.fn((n: number) => ({ __stepCount: n })),
}));

// 工具实现（cheerio 等）不在本测试的关注范围内，而且它们会拖进真实的 ai 模块
// （ESM，jest 不转换 node_modules）。这里只需要一个占位对象 —— 工具的执行
// 由上面 mock 的 streamText 用预置 chunk 模拟。
jest.mock("../../tools", () => ({ tools: {} }));

// 注意：这里必须用相对路径。next/jest 是在 transform 阶段改写 "@/..." 的，
// 而 jest.mock() 的字符串参数不在改写范围内 —— 写 "@/lib/ai-client" 会解析失败。
jest.mock("../../lib/ai-client", () => ({
  createModelClient: jest.fn(() => ({ chat: () => "fake-model" })),
}));

jest.mock("../../services/aiProviderService", () => ({
  resolveApiConfig: jest.fn(async () => ({
    apiKey: "test-key",
    baseURL: "http://test.local/v1",
    model: "test-model",
    source: "db",
  })),
}));

jest.mock("../../services/messageService", () => ({
  saveUserMessage: jest.fn(async () => {}),
  saveAssistantMessage: jest.fn(async () => {}),
}));

jest.mock("../../services/conversationService", () => ({
  updateConversationTimestamp: jest.fn(async () => {}),
  updateConversationTitle: jest.fn(async () => {}),
}));

jest.mock("../../services/summaryService", () => ({
  createSummary: jest.fn(async () => {}),
}));

import { streamText } from "ai";
import { streamChatResponse } from "@/services/chatService";
import { saveAssistantMessage } from "@/services/messageService";

const mockStreamText = streamText as unknown as jest.Mock;
const mockSaveAssistant = saveAssistantMessage as unknown as jest.Mock;

// ─── Helpers ───────────────────────────────────────────────

interface ScriptedTool {
  toolCallId: string;
  toolName: string;
  input: unknown;
  /** 工具返回值。默认是"一切正常"，要测反思就传低 confidence / 失败 */
  output?: unknown;
}

interface ScriptedStep {
  text?: string;
  toolCalls?: ScriptedTool[];
  finishReason?: string;
}

let scriptedSteps: ScriptedStep[] = [];

/**
 * 每次 streamText 调用收到的 messages 快照。
 * 必须快照 —— chatService 是原地 push 同一个数组的，
 * 直接读 mock.calls[i][0].messages 拿到的会是同一个（已变长的）引用。
 */
let messageSnapshots: any[][] = [];

const HEALTHY_OUTPUT = { success: true, metadata: { confidence: 0.9 } };

/** 造一个假的 streamText 返回值，形状对齐 AI SDK v7 的 StreamTextResult */
function buildStepResult(step: ScriptedStep) {
  const calls = step.toolCalls ?? [];
  const chunks: any[] = [];

  if (step.text) {
    chunks.push({ type: "text-delta", text: step.text });
  }

  for (const tc of calls) {
    chunks.push({
      type: "tool-call",
      toolCallId: tc.toolCallId,
      toolName: tc.toolName,
      input: tc.input,
    });
    chunks.push({
      type: "tool-result",
      toolCallId: tc.toolCallId,
      toolName: tc.toolName,
      output: tc.output ?? HEALTHY_OUTPUT,
    });
  }

  chunks.push({ type: "finish", finishReason: step.finishReason ?? "stop" });

  return {
    fullStream: (async function* () {
      for (const c of chunks) yield c;
    })(),
    toolCalls: Promise.resolve(calls),
    // chatService 的反思步骤从这里读工具返回值
    toolResults: Promise.resolve(
      calls.map((tc) => ({
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        input: tc.input,
        output: tc.output ?? HEALTHY_OUTPUT,
      })),
    ),
    // 有工具调用时才产出可回填的消息（对齐 SDK 行为）
    responseMessages: Promise.resolve(
      calls.length > 0
        ? [
            { role: "assistant", content: [] },
            ...calls.map((tc) => ({
              role: "tool",
              content: [{ toolCallId: tc.toolCallId }],
            })),
          ]
        : [],
    ),
    finishReason: Promise.resolve(step.finishReason ?? "stop"),
  };
}

/** 读完 SSE 流，解析成事件数组 */
async function collectEvents(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let raw = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }

  return raw
    .split("\n\n")
    .filter((block) => block.startsWith("data: "))
    .map((block) => JSON.parse(block.slice("data: ".length)));
}

function runChat() {
  return streamChatResponse("conv-1", "user-1", "北京天气怎么样", "default", []);
}

beforeEach(() => {
  scriptedSteps = [];
  messageSnapshots = [];
  mockStreamText.mockImplementation((opts: any) => {
    messageSnapshots.push([...(opts.messages ?? [])]);
    return buildStepResult(scriptedSteps.shift() ?? {});
  });
});

// ─── Tests ─────────────────────────────────────────────────

describe("streamChatResponse — Agent 循环", () => {
  it("每轮都显式传 stopWhen: isStepCount(1)，循环由 chatService 控制", async () => {
    scriptedSteps = [{ text: "直接回答" }];

    await collectEvents(await runChat());

    expect(mockStreamText).toHaveBeenCalledTimes(1);
    expect(mockStreamText.mock.calls[0][0].stopWhen).toEqual({
      __stepCount: 1,
    });
  });

  it("模型调完工具后，工具结果被回填进下一轮（ReAct 的 observation）", async () => {
    scriptedSteps = [
      {
        text: "正在搜索…",
        toolCalls: [{ toolCallId: "t1", toolName: "webSearch", input: { query: "北京天气" } }],
      },
      { text: "北京今天 22 度。" },
    ];

    const events = await collectEvents(await runChat());

    // 跑了两轮：第一轮调工具，第二轮产出最终答案
    expect(mockStreamText).toHaveBeenCalledTimes(2);

    // 关键断言：第二轮拿到的 messages 比第一轮长，且多出来的正是工具结果消息
    expect(messageSnapshots[1].length).toBeGreaterThan(messageSnapshots[0].length);
    expect(messageSnapshots[0].some((m: any) => m.role === "tool")).toBe(false);
    expect(messageSnapshots[1].some((m: any) => m.role === "tool")).toBe(true);

    // 两轮的文本都推给了前端
    const text = events
      .filter((e) => e.type === "text")
      .map((e) => e.content)
      .join("");
    expect(text).toBe("正在搜索…北京今天 22 度。");

    // 落库的是完整内容（两轮拼接）
    expect(mockSaveAssistant).toHaveBeenCalledWith("conv-1", "正在搜索…北京今天 22 度。", expect.any(Array));
  });

  it("模型不再调用工具时结束循环（正常出口，不是步数限制）", async () => {
    scriptedSteps = [
      { text: "先搜一下。", toolCalls: [{ toolCallId: "t1", toolName: "webSearch", input: {} }] },
      { text: "再查个天气。", toolCalls: [{ toolCallId: "t2", toolName: "getWeather", input: {} }] },
      { text: "好了，答案是……" },
    ];

    const events = await collectEvents(await runChat());

    expect(mockStreamText).toHaveBeenCalledTimes(3);

    // 三个工具调用的记录都推给了前端
    const toolCalls = events.filter((e) => e.type === "tool-call");
    expect(toolCalls.map((e) => e.toolName)).toEqual(["webSearch", "getWeather"]);
  });

  it("done 事件整圈只发一次（中间轮次不发，否则前端会提前结束）", async () => {
    scriptedSteps = [
      { text: "搜…", toolCalls: [{ toolCallId: "t1", toolName: "webSearch", input: {} }] },
      { text: "再搜…", toolCalls: [{ toolCallId: "t2", toolName: "fetchWebPage", input: {} }] },
      { text: "答案。" },
    ];

    const events = await collectEvents(await runChat());

    expect(events.filter((e) => e.type === "done")).toHaveLength(1);
    // done 必须是最后一个事件
    expect(events[events.length - 1].type).toBe("done");
  });

  it("safe net：模型一直调工具停不下来时，跑满上限后强制收尾", async () => {
    // 12 轮全都在调工具（MAX_STEPS），第 13 次调用是安全网收尾
    scriptedSteps = [
      ...Array.from({ length: 12 }, (_, i) => ({
        text: `第${i + 1}轮 `,
        toolCalls: [{ toolCallId: `t${i}`, toolName: "webSearch", input: { q: i } }],
      })),
      { text: "已尽力，这是最终答案。" },
    ];

    const events = await collectEvents(await runChat());

    // 12 轮循环 + 1 次收尾 = 13
    expect(mockStreamText).toHaveBeenCalledTimes(13);

    const text = events
      .filter((e) => e.type === "text")
      .map((e) => e.content)
      .join("");
    expect(text).toContain("已尽力，这是最终答案。");
    expect(events.filter((e) => e.type === "done")).toHaveLength(1);
  });

  it("模型一个字都没产出时，返回兜底文案而不是空白气泡", async () => {
    scriptedSteps = [{}];

    const events = await collectEvents(await runChat());

    const text = events
      .filter((e) => e.type === "text")
      .map((e) => e.content)
      .join("");
    expect(text).toBe("抱歉，未能生成有效回复。请尝试换个方式提问。");
  });
});

describe("streamChatResponse — 反思（Reflect）", () => {
  /** 只找到 1-2 条结果的 webSearch —— 对应 0.7 / 0.6 那档 */
  const weakSearch: ScriptedTool = {
    toolCallId: "t1",
    toolName: "webSearch",
    input: { query: "褪黑素" },
    output: {
      success: true,
      metadata: { source: "DuckDuckGo", confidence: 0.6, latencyMs: 12 },
    },
  };

  function findReflection(snapshot: any[]) {
    return snapshot.find(
      (m: any) =>
        typeof m.content === "string" && m.content.includes("【结果自检】")
    );
  }

  it("工具结果健康时，不插入自检提示", async () => {
    scriptedSteps = [
      {
        text: "搜…",
        toolCalls: [{ toolCallId: "t1", toolName: "webSearch", input: {} }],
      },
      { text: "答案。" },
    ];

    await collectEvents(await runChat());

    expect(findReflection(messageSnapshots[1])).toBeUndefined();
  });

  it("结果可信度低时，把自检提示追加进下一轮上下文（且排在工具结果之后）", async () => {
    scriptedSteps = [
      { text: "搜…", toolCalls: [weakSearch] },
      { text: "答案。" },
    ];

    await collectEvents(await runChat());

    const reflection = findReflection(messageSnapshots[1]);
    expect(reflection).toBeDefined();
    expect(reflection.content).toContain("webSearch");
    expect(reflection.content).toContain("0.60");

    // 必须是最后一条 —— 排在 tool 结果后面，模型才看得到
    expect(messageSnapshots[1][messageSnapshots[1].length - 1]).toBe(reflection);
  });

  it("工具调用失败时，把错误码和可重试性告诉模型", async () => {
    scriptedSteps = [
      {
        text: "查…",
        toolCalls: [
          {
            toolCallId: "t1",
            toolName: "getWeather",
            input: { city: "Beijing" },
            output: {
              success: false,
              data: null,
              metadata: { source: "error", confidence: 0, latencyMs: 8000 },
              error: { code: "TIMEOUT", message: "超时", retryable: true },
            },
          },
        ],
      },
      { text: "没查到，换个方式。" },
    ];

    await collectEvents(await runChat());

    const reflection = findReflection(messageSnapshots[1]);
    expect(reflection).toBeDefined();
    expect(reflection.content).toContain("TIMEOUT");
    expect(reflection.content).toContain("换参数重试");
  });
});

describe("streamChatResponse — trace（供界面回放）", () => {
  const weatherOutput = {
    success: true,
    data: { temp: 22 },
    metadata: { source: "wttr.in", confidence: 0.92, latencyMs: 320 },
  };

  it("工具调用被标上轮次、可信度、耗时和模型当时的思考", async () => {
    scriptedSteps = [
      {
        text: "我需要先查一下天气。",
        toolCalls: [
          {
            toolCallId: "t1",
            toolName: "getWeather",
            input: { city: "Beijing" },
            output: weatherOutput,
          },
        ],
      },
      { text: "北京今天 22 度。" },
    ];

    await collectEvents(await runChat());

    const records = mockSaveAssistant.mock.calls[0][2];
    expect(records[0]).toMatchObject({
      step: 1,
      confidence: 0.92,
      latencyMs: 320,
      thought: "我需要先查一下天气。",
    });
  });

  it("同轮并行调用的工具共享同一个 step（界面据此分组）", async () => {
    scriptedSteps = [
      {
        text: "中英文各搜一次。",
        toolCalls: [
          { toolCallId: "t1", toolName: "webSearch", input: { query: "甲钴胺" }, output: weatherOutput },
          { toolCallId: "t2", toolName: "webSearch", input: { query: "mecobalamin" }, output: weatherOutput },
        ],
      },
      { text: "答案是……" },
    ];

    await collectEvents(await runChat());

    const records = mockSaveAssistant.mock.calls[0][2];
    expect(records.map((r: any) => r.step)).toEqual([1, 1]);
  });

  it("SSE 事件带上 trace 字段，否则前端拿不到过程", async () => {
    scriptedSteps = [
      {
        text: "查一下。",
        toolCalls: [
          { toolCallId: "t1", toolName: "getWeather", input: {}, output: weatherOutput },
        ],
      },
      { text: "好了。" },
    ];

    const events = await collectEvents(await runChat());

    const call = events.find((e) => e.type === "tool-call");
    expect(call).toMatchObject({ step: 1, thought: "查一下。" });

    const result = events.find((e) => e.type === "tool-result");
    expect(result).toMatchObject({ confidence: 0.92, latencyMs: 320 });
  });

  it("反思触发时，结论写进 trace 且推 reflection 事件", async () => {
    scriptedSteps = [
      {
        text: "搜…",
        toolCalls: [
          {
            toolCallId: "t1",
            toolName: "webSearch",
            input: {},
            output: {
              success: true,
              metadata: { source: "Bing (DuckDuckGo 降级)", confidence: 0.75, latencyMs: 8100 },
            },
          },
        ],
      },
      { text: "答案。" },
    ];

    const events = await collectEvents(await runChat());

    const records = mockSaveAssistant.mock.calls[0][2];
    expect(records[0].reflection).toContain("【结果自检】");

    const reflectionEvents = events.filter((e) => e.type === "reflection");
    expect(reflectionEvents).toHaveLength(1);
    expect(reflectionEvents[0]).toMatchObject({ step: 1 });
  });
});
