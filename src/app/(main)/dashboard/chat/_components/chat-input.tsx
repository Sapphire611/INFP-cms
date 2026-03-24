/**
 * Chat input - message input area
 */

"use client";

import { useState } from "react";
import { useChatStore } from "@/stores/chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

export function ChatInput() {
  const [input, setInput] = useState("");
  const sendMessage = useChatStore((s) => s.sendMessage);
  const isLoading = useChatStore((s) => s.isLoading);
  const error = useChatStore((s) => s.error);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const messageToSend = input.trim();
    setInput("");

    try {
      await sendMessage(messageToSend);
    } catch (error) {
      // Error is handled in the store
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        className="min-h-[60px] max-h-[200px] resize-none"
        disabled={isLoading}
      />
      <Button
        onClick={handleSubmit}
        disabled={!input.trim() || isLoading}
        className="h-[60px] px-4"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
