"use client";

import { ChatProvider } from "@/stores/chat";
import { IconSidebar } from "./_components/icon-sidebar";
import { ChatHeader } from "./_components/chat-header";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <div className="flex h-screen flex-col">
        <ChatHeader />
        <div className="flex flex-1 overflow-hidden">
          <IconSidebar />
          {children}
        </div>
      </div>
    </ChatProvider>
  );
}
