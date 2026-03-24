/**
 * Chat page - main entry point for AI chat feature
 */

"use client";

import { useEffect } from "react";
import { ChatProvider, useChatStore } from "@/stores/chat";
import { ChatSidebar } from "./_components/chat-sidebar";
import { ChatMain } from "./_components/chat-main";

function ChatContent() {
  const loadConversations = useChatStore((s) => s.loadConversations);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <ChatSidebar />
      <ChatMain />
    </div>
  );
}

export default function ChatPage() {
  return (
    <ChatProvider>
      <ChatContent />
    </ChatProvider>
  );
}
