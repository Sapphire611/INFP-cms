/**
 * Chat store - manages chat state with Zustand
 */

import { createStore } from "zustand/vanilla";
import type { Message, Conversation } from "@/types/chat";

export type ChatState = {
  // State
  conversations: Conversation[];
  currentConversationId: string | null;
  currentMessages: Message[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentConversation: (id: string | null) => void;
  createConversation: (title?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  clearCurrentConversation: () => void;
  setError: (error: string | null) => void;

  // LocalStorage sync
  syncToLocalStorage: () => void;
  loadFromLocalStorage: (conversationId: string) => void;
};

export const createChatStore = (init?: Partial<ChatState>) =>
  createStore<ChatState>()((set, get) => ({
    conversations: init?.conversations ?? [],
    currentConversationId: init?.currentConversationId ?? null,
    currentMessages: init?.currentMessages ?? [],
    isLoading: false,
    error: null,

    setCurrentConversation: (id: string | null) => {
      set({ currentConversationId: id, error: null });
      if (id) {
        get().loadFromLocalStorage(id);
      } else {
        set({ currentMessages: [] });
      }
    },

    createConversation: async (title = "新对话") => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create conversation");
        }

        const conversation = await response.json();

        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: conversation.id,
          currentMessages: [],
          isLoading: false,
        }));

        // Initialize localStorage for new conversation
        localStorage.setItem(
          `chat_messages_${conversation.id}`,
          JSON.stringify([])
        );

        return conversation;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create conversation";
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    deleteConversation: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        await fetch(`/api/chat/conversations/${id}`, {
          method: "DELETE",
        });

        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId:
            state.currentConversationId === id ? null : state.currentConversationId,
          currentMessages:
            state.currentConversationId === id ? [] : state.currentMessages,
          isLoading: false,
        }));

        // Remove from localStorage
        localStorage.removeItem(`chat_messages_${id}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete conversation";
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    sendMessage: async (content: string) => {
      const { currentConversationId, currentMessages } = get();

      // Create conversation if none exists
      if (!currentConversationId) {
        await get().createConversation();
      }

      const newConversationId = get().currentConversationId;
      if (!newConversationId) {
        throw new Error("Failed to create conversation");
      }

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      set((state) => ({
        currentMessages: [...state.currentMessages, userMessage],
        isLoading: true,
        error: null,
      }));

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: newConversationId,
            message: content,
            conversationHistory: get().currentMessages,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send message");
        }

        const data = await response.json();
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
        };

        set((state) => ({
          currentMessages: [...state.currentMessages, assistantMessage],
          isLoading: false,
        }));

        // Sync to localStorage
        get().syncToLocalStorage();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to send message";
        set({ error: message, isLoading: false });

        // Remove failed user message
        set((state) => ({
          currentMessages: state.currentMessages.filter((m) => m.id !== userMessage.id),
        }));

        throw error;
      }
    },

    loadConversations: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch("/api/chat/conversations");
        if (!response.ok) {
          throw new Error("Failed to load conversations");
        }

        const { data } = await response.json();
        set({ conversations: data, isLoading: false });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load conversations";
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    clearCurrentConversation: () => {
      set({ currentConversationId: null, currentMessages: [] });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    syncToLocalStorage: () => {
      const { currentConversationId, currentMessages } = get();
      if (currentConversationId) {
        localStorage.setItem(
          `chat_messages_${currentConversationId}`,
          JSON.stringify(currentMessages)
        );
      }
    },

    loadFromLocalStorage: (conversationId: string) => {
      try {
        const stored = localStorage.getItem(`chat_messages_${conversationId}`);
        const messages: Message[] = stored ? JSON.parse(stored) : [];
        set({ currentMessages: messages });
      } catch (error) {
        console.error("Error loading from localStorage:", error);
        set({ currentMessages: [] });
      }
    },
  }));
