/**
 * Chat main - main chat area with message list and input
 */

"use client";

import { useChatStore } from "@/stores/chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { MessageSquare } from "lucide-react";

export function ChatMain() {
  const currentMessages = useChatStore((s) => s.currentMessages);
  const isLoading = useChatStore((s) => s.isLoading);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const error = useChatStore((s) => s.error);

  if (!currentConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/5">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">开始新对话</p>
          <p className="text-sm mt-2">点击左侧"新对话"按钮开始聊天</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {currentMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>开始对话吧！在下方输入你的问题...</p>
            </div>
          ) : (
            currentMessages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                <span className="text-sm">AI正在思考...</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput />
        </div>
      </div>
    </div>
  );
}
