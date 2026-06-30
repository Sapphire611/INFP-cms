/**
 * Conversation item - displays a single conversation in the sidebar
 */

"use client";

import { MessageSquare, Trash2, Bot, Brain, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAgent } from "@/config/agents";
import type { Conversation } from "@/types/chat";

const iconMap: Record<string, typeof Bot> = { Bot, Brain, Search };

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const agent = getAgent(conversation.agentId);
  const AgentIcon = agent ? (iconMap[agent.icon] || Bot) : MessageSquare;

  return (
    <div
      className={cn(
        "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isActive && "bg-muted"
      )}
      onClick={onSelect}
    >
      <AgentIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{conversation.title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          {agent && <span>{agent.name}</span>}
          {agent && <span>·</span>}
          <span>
            {new Date(conversation.updatedAt).toLocaleDateString("zh-CN", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
