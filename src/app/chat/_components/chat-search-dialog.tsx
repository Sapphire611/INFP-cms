"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useChatStore } from "@/stores/chat";
import type { Conversation } from "@/types/chat";

interface ChatSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatSearchDialog({ open, onOpenChange }: ChatSearchDialogProps) {
  const conversations = useChatStore((s) => s.conversations);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);

  // Cmd+K / Ctrl+K shortcut
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const handleSelect = (conversation: Conversation) => {
    setCurrentConversation(conversation.id);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="搜索历史对话..." />
      <CommandList>
        <CommandEmpty>未找到匹配的对话</CommandEmpty>
        {conversations.length > 0 && (
          <CommandGroup heading="对话历史">
            {conversations.map((conv) => (
              <CommandItem
                key={conv.id}
                value={conv.title}
                onSelect={() => handleSelect(conv)}
                className="!py-2"
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{conv.title}</span>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {new Date(conv.updatedAt).toLocaleDateString("zh-CN", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
