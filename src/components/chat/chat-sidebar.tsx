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
  const isCreating = useChatStore((s) => s.isCreating);
  const isDeleting = useChatStore((s) => s.isDeleting);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);

  return (
    <div className="w-80 border-r bg-muted/10 flex flex-col">
      {/* New conversation button */}
      <div className="p-3 border-b">
        <Button
          className="w-full"
          size="sm"
          onClick={() => createConversation()}
          disabled={isCreating || isDeleting}
        >
          {isCreating ? (
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
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === currentConversationId}
                onSelect={() => {
                  if (!isLoadingMessages) setCurrentConversation(conversation.id);
                }}
                onDelete={() => deleteConversation(conversation.id)}
              />
            ))
          )}

          {conversations.length === 0 && !isLoading && !isCreating && (
            <div className="text-center text-muted-foreground py-8 text-sm">
              点击上方按钮创建新对话
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
