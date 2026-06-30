"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/chat";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMain } from "@/components/chat/chat-main";

function ChatContent() {
  const loadConversations = useChatStore((s) => s.loadConversations);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <ChatSidebar />
      <ChatMain />
    </div>
  );
}

export default function ChatPage() {
  return <ChatContent />;
}
