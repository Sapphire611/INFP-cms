/**
 * Chat message - displays a single message with tool call visualization and sources
 */

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Bot, User, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { Message, ToolCallRecord } from "@/types/chat";

interface ChatMessageProps {
  message: Message;
}

/** Human-readable tool name */
const TOOL_LABELS: Record<string, string> = {
  getWeather: "查询天气",
  getCurrentTime: "获取时间",
  calculate: "数学计算",
  webSearch: "联网搜索",
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
    default:
      return JSON.stringify(args);
  }
}

function ToolCallBubble({ tc }: { tc: ToolCallRecord }) {
  const label = TOOL_LABELS[tc.toolName] || tc.toolName;
  const isCalling = tc.status === "calling";
  const isError = tc.status === "error";

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
        <span className="font-medium text-muted-foreground">
          {isCalling ? "正在" : isError ? "失败" : "已"}
          {label}
        </span>
        {tc.args && Object.keys(tc.args).length > 0 && (
          <span className="text-muted-foreground/70 ml-1">
            {formatToolArgs(tc.toolName, tc.args)}
          </span>
        )}
      </div>
    </div>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;

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
        {/* Tool call indicators (assistant only) */}
        {hasToolCalls && (
          <div className="flex flex-col gap-1">
            {message.toolCalls!.map((tc) => (
              <ToolCallBubble key={tc.id} tc={tc} />
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
