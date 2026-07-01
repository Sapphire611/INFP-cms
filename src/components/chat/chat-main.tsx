/**
 * Chat main - main chat area with message list and input
 */

"use client";

import { useChatStore } from "@/stores/chat";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { MessageSquare } from "lucide-react";

export function ChatMain() {
  const currentMessages = useChatStore((s) => s.currentMessages);
  const isSending = useChatStore((s) => s.isSending);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="max-w-3xl mx-auto space-y-3">
          {isLoadingMessages ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-5 w-5 border-2 border-muted-foreground border-t-transparent rounded-full" />
            </div>
          ) : currentMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">开始对话吧！在下方输入你的问题...</p>
            </div>
          ) : (
            currentMessages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}

          {/* AI thinking indicator */}
          {isSending && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                <span className="text-sm">AI正在思考...</span>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t bg-background p-3 shrink-0">
        <div className="max-w-3xl mx-auto">
          <ChatInput />
        </div>
      </div>
    </div>
  );
}
