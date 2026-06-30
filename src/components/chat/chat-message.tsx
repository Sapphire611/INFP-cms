/**
 * Chat message - displays a single message with optional sources
 */

"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Bot, User, ExternalLink } from "lucide-react";
import type { Message } from "@/types/chat";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-muted"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col max-w-[80%]">
        <Card
          className={`px-3 py-2 ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        </Card>

        {/* Search sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
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
            isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground"
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
