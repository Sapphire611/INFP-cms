/**
 * Chat sidebar - displays conversation list with agent selector
 */

"use client";

import { useChatStore } from "@/stores/chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageSquare, Loader2, Bot, Brain, Search } from "lucide-react";
import { ConversationItem } from "./conversation-item";
import agents from "@/config/agents";

const iconMap: Record<string, typeof Bot> = {
  Bot,
  Brain,
  Search,
};

export function ChatSidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const setCurrentAgent = useChatStore((s) => s.setCurrentAgent);
  const createConversation = useChatStore((s) => s.createConversation);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const isLoading = useChatStore((s) => s.isLoading);

  const currentAgent = agents.find((a) => a.id === currentAgentId);

  return (
    <div className="w-80 border-r bg-muted/10 flex flex-col">
      {/* Agent selector */}
      <div className="p-3 border-b space-y-2">
        <div className="flex flex-wrap gap-1">
          {agents.map((agent) => {
            const Icon = iconMap[agent.icon] || Bot;
            return (
              <Button
                key={agent.id}
                variant={currentAgentId === agent.id ? "default" : "ghost"}
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setCurrentAgent(agent.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {agent.name}
              </Button>
            );
          })}
        </div>
        <Button
          className="w-full"
          size="sm"
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

      {/* Current agent indicator */}
      {currentAgent && (
        <div className="px-4 py-2 border-b text-xs text-muted-foreground flex items-center gap-1.5">
          {(() => {
            const Icon = iconMap[currentAgent.icon] || Bot;
            return <Icon className="h-3 w-3" />;
          })()}
          当前：{currentAgent.name}
        </div>
      )}

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
              选择上方 Agent 后创建新对话
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
