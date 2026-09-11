/**
 * Chat message - displays a single message with tool call visualization and sources
 */

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Bot,
  User,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Brain,
  ShieldAlert,
} from "lucide-react";
import type { Message, ToolCallRecord } from "@/types/chat";

interface ChatMessageProps {
  message: Message;
}

/** 与 agentReflection 的阈值保持一致：低于此值前端也标出来 */
const CONFIDENCE_FLOOR = 0.8;

/** Human-readable tool name */
const TOOL_LABELS: Record<string, string> = {
  getWeather: "查询天气",
  getCurrentTime: "获取时间",
  calculate: "数学计算",
  webSearch: "联网搜索",
  fetchWebPage: "读取网页",
};

/** Format tool args for display */
function formatToolArgs(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "getWeather":
      return `城市: ${args.city}`;
    case "getCurrentTime":
      return `时区: ${args.timezone || "Asia/Shanghai"}`;
    case "calculate":
      return `表达式: ${args.expression}`;
    case "webSearch":
      return `搜索: ${args.query}`;
    case "fetchWebPage":
      return `页面: ${args.url}`;
    default:
      return JSON.stringify(args);
  }
}

/**
 * 把散落的工具调用按 Agent 轮次分组 —— 同一轮里的并行调用归到一组。
 * 循环每一轮就是 ReAct 的一步，分组之后过程才读得出来。
 */
function groupByStep(records: ToolCallRecord[]) {
  const groups: Array<{ step: number; records: ToolCallRecord[] }> = [];

  for (const record of records) {
    const step = record.step ?? 1;
    const last = groups[groups.length - 1];
    if (last && last.step === step) last.records.push(record);
    else groups.push({ step, records: [record] });
  }

  return groups;
}

/** 工具自报的可信度 / 耗时。可信度过低时标黄，和右侧的反思告示呼应 */
function ToolMeta({
  confidence,
  latencyMs,
}: {
  confidence?: number;
  latencyMs?: number;
}) {
  const hasConfidence = typeof confidence === "number";
  if (!hasConfidence && !latencyMs) return null;

  const low = hasConfidence && confidence < CONFIDENCE_FLOOR;

  return (
    <div
      className={`mt-0.5 text-[10px] ${
        low ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground/60"
      }`}
    >
      {hasConfidence && `可信度 ${(confidence * 100).toFixed(0)}%`}
      {hasConfidence && latencyMs ? " · " : ""}
      {latencyMs ? `${latencyMs}ms` : ""}
    </div>
  );
}

function ToolCallBubble({ tc }: { tc: ToolCallRecord }) {
  const label = TOOL_LABELS[tc.toolName] || tc.toolName;
  const isCalling = tc.status === "calling";
  const isError = tc.status === "error";
  const hasArgs = tc.args && Object.keys(tc.args).length > 0;

  return (
    <div
      className={`flex items-start gap-2 px-2 py-1.5 rounded-md text-xs border ${
        isError
          ? "bg-destructive/5 border-destructive/20 text-destructive"
          : "bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-800/30"
      }`}
    >
      {isCalling ? (
        <Loader2 className="h-3.5 w-3.5 mt-0.5 animate-spin text-blue-500 shrink-0" />
      ) : isError ? (
        <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div>
          <span className="font-medium text-muted-foreground">
            {isCalling ? "正在" : isError ? "失败" : "已"}
            {label}
          </span>
          {hasArgs && (
            <span className="text-muted-foreground/70 ml-1">
              {formatToolArgs(tc.toolName, tc.args)}
            </span>
          )}
        </div>
        {!isCalling && (
          <ToolMeta confidence={tc.confidence} latencyMs={tc.latencyMs} />
        )}
      </div>
    </div>
  );
}

/** 结果自检发现问题时，Agent 自己贴出来的告示 */
function ReflectionNote({ content }: { content: string }) {
  const [headline, ...detail] = content.split("\n");

  return (
    <div className="rounded-md border border-amber-200/60 bg-amber-50/60 px-2 py-1.5 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex items-start gap-1.5 font-medium text-amber-700 dark:text-amber-400">
        <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>{headline}</span>
      </div>
      {detail.length > 0 && (
        <div className="mt-1 pl-5 whitespace-pre-wrap text-muted-foreground">
          {detail.join("\n").trim()}
        </div>
      )}
    </div>
  );
}

/** Agent 循环的一轮：思考 → 行动 → 观察 → 反思 */
function AgentStepGroup({
  step,
  records,
  showHeader,
}: {
  step: number;
  records: ToolCallRecord[];
  showHeader: boolean;
}) {
  const thought = records.find((r) => r.thought)?.thought;
  const reflection = records.find((r) => r.reflection)?.reflection;

  return (
    <div className="flex flex-col gap-1 rounded-md border border-dashed border-border/70 p-1.5">
      {showHeader && (
        <div className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          第 {step} 轮
        </div>
      )}
      {thought && (
        <div className="flex items-start gap-1.5 px-1 text-xs italic text-muted-foreground/80">
          <Brain className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{thought}</span>
        </div>
      )}
      {records.map((tc) => (
        <ToolCallBubble key={tc.id} tc={tc} />
      ))}
      {reflection && <ReflectionNote content={reflection} />}
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const stepGroups = hasToolCalls ? groupByStep(message.toolCalls!) : [];
  // 只有一轮时不显示"第 1 轮"——那是噪声，不是信息
  const showStepHeaders = stepGroups.length > 1;

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={isUser ? "bg-primary text-primary-foreground" : "bg-muted"}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col max-w-[80%] gap-1.5">
        {/* Agent 执行过程（按轮次分组，assistant only） */}
        {hasToolCalls && (
          <div className="flex flex-col gap-1.5">
            {stepGroups.map((group) => (
              <AgentStepGroup
                key={`${group.step}-${group.records[0].id}`}
                step={group.step}
                records={group.records}
                showHeader={showStepHeaders}
              />
            ))}
          </div>
        )}

        {/* Message content */}
        {message.content && (
          <Card
            className={`px-3 py-2 ${
              isUser ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:bg-black/10 [&_pre]:rounded [&_pre]:p-3 [&_pre]:overflow-x-auto [&_code]:text-sm [&_table]:border-collapse [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:opacity-70">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
                {message.isStreaming && (
                  <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            )}
          </Card>
        )}

        {/* Streaming placeholder (tool calls only, no content yet) */}
        {!message.content && hasToolCalls && message.isStreaming && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>正在处理...</span>
          </div>
        )}

        {/* Search sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-0.5 space-y-0.5">
            <span className="text-xs text-muted-foreground font-medium">参考来源：</span>
            {message.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {s.title}
              </a>
            ))}
          </div>
        )}

        <div
          className={`text-xs mt-0.5 opacity-70 ${
            isUser
              ? "text-primary-foreground/70 text-right"
              : "text-muted-foreground"
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
