/**
 * Chat sidebar - displays conversation list
 */

"use client";

import { useChatStore } from "@/stores/chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2 } from "lucide-react";
import { ConversationItem } from "./conversation-item";

export function ChatSidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const createConversation = useChatStore((s) => s.createConversation);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const isLoading = useChatStore((s) => s.isLoading);

  return (
    <div className="w-80 border-r bg-muted/10 flex flex-col">
      <div className="p-4 border-b">
        <Button
          className="w-full"
          onClick={() => createConversation()}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              创建中...
            </>
          ) : (
            <>
              <MessageSquare className="mr-2 h-4 w-4" />
              新对话
            </>
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === currentConversationId}
              onSelect={() => setCurrentConversation(conversation.id)}
              onDelete={() => deleteConversation(conversation.id)}
            />
          ))}

          {conversations.length === 0 && !isLoading && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              点击上方按钮创建新对话
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
