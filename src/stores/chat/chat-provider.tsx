/**
 * Chat provider - integrates chat store with React
 */

"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { type StoreApi, useStore } from "zustand";
import { createChatStore, type ChatState } from "./chat-store";

const ChatContext = createContext<StoreApi<ChatState> | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const storeRef = useRef<StoreApi<ChatState> | null>(null);

  if (!storeRef.current) {
    storeRef.current = createChatStore();
  }

  return (
    <ChatContext.Provider value={storeRef.current}>
      {children}
    </ChatContext.Provider>
  );
}

/**
 * Hook to access chat store with selector support
 */
export function useChatStore<T>(selector: (state: ChatState) => T): T {
  const store = useContext(ChatContext);

  if (!store) {
    throw new Error("useChatStore must be used within ChatProvider");
  }

  return useStore(store, selector);
}
