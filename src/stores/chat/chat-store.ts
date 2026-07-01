/**
 * Chat store - manages chat state with Zustand
 * Supports streaming responses with tool call visibility
 * Persistence: messages stored in Supabase (not localStorage)
 */

import { createStore } from "zustand/vanilla";
import type { Message, ToolCallRecord, ChatStreamEvent } from "@/types/chat";
import type { Conversation } from "@/types/chat";

export type ChatState = {
  conversations: Conversation[];
  currentConversationId: string | null;
  currentMessages: Message[];
  isLoading: boolean;       // Loading conversation list
  isCreating: boolean;      // Creating new conversation
  isDeleting: boolean;      // Deleting a conversation (per-item state)
  isLoadingMessages: boolean; // Loading messages from API
  isSending: boolean;       // AI is generating a response (SSE streaming)
  error: string | null;

  setCurrentConversation: (id: string | null) => void;
  createConversation: (title?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  clearCurrentConversation: () => void;
  setError: (error: string | null) => void;
};

export const createChatStore = (init?: Partial<ChatState>) =>
  createStore<ChatState>()((set, get) => ({
    conversations: init?.conversations ?? [],
    currentConversationId: init?.currentConversationId ?? null,
    currentMessages: init?.currentMessages ?? [],
    isLoading: false,
    isCreating: false,
    isDeleting: false,
    isLoadingMessages: false,
    isSending: false,
    error: null,

    setCurrentConversation: (id: string | null) => {
      set({ currentConversationId: id, error: null });
      if (id) {
        get().loadMessages(id);
      } else {
        set({ currentMessages: [] });
      }
    },

    loadMessages: async (conversationId: string) => {
      set({ isLoadingMessages: true });
      try {
        const response = await fetch(
          `/api/chat/conversations/${conversationId}/messages?limit=100`
        );
        if (!response.ok) {
          set({ currentMessages: [], isLoadingMessages: false });
          return;
        }

        const data = await response.json();
        const messages: Message[] = (data.messages ?? []).map(
          (m: Message & { timestamp?: string }) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            toolCalls: m.toolCalls ?? [],
          })
        );

        set({ currentMessages: messages, isLoadingMessages: false });
      } catch {
        set({ currentMessages: [], isLoadingMessages: false });
      }
    },

    createConversation: async (title = "新对话") => {
      set({ isCreating: true, error: null });
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
          isCreating: false,
        }));

        return conversation;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create conversation";
        set({ error: message, isCreating: false });
        throw error;
      }
    },

    deleteConversation: async (id: string) => {
      set({ isDeleting: true, error: null });
      try {
        await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });

        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId:
            state.currentConversationId === id ? null : state.currentConversationId,
          currentMessages:
            state.currentConversationId === id ? [] : state.currentMessages,
          isDeleting: false,
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete conversation";
        set({ error: message, isDeleting: false });
        throw error;
      }
    },

    sendMessage: async (content: string) => {
      const { currentConversationId, currentMessages } = get();

      if (!currentConversationId) {
        await get().createConversation();
      }

      const newConversationId = get().currentConversationId;
      if (!newConversationId) {
        throw new Error("Failed to create conversation");
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      const messagesBeforeSend = get().currentMessages;

      set((state) => ({
        currentMessages: [...state.currentMessages, userMessage],
        isSending: true,
        error: null,
      }));

      // Create a placeholder assistant message for streaming
      const assistantId = crypto.randomUUID();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: newConversationId,
            message: content,
            agentId: "default",
            conversationHistory: messagesBeforeSend,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send message");
        }

        // Read SSE stream
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantContent = "";
        const toolCallRecords: ToolCallRecord[] = [];
        let hasAssistantMessage = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (separated by \n\n)
          const lines = buffer.split("\n\n");
          // Keep incomplete last chunk in buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.slice(6);
            if (!jsonStr) continue;

            try {
              const event: ChatStreamEvent = JSON.parse(jsonStr);

              switch (event.type) {
                case "text":
                  assistantContent += event.content;
                  if (!hasAssistantMessage) {
                    set((state) => ({
                      currentMessages: [
                        ...state.currentMessages,
                        {
                          id: assistantId,
                          role: "assistant",
                          content: assistantContent,
                          timestamp: new Date(),
                          toolCalls: toolCallRecords,
                          isStreaming: true,
                        },
                      ],
                    }));
                    hasAssistantMessage = true;
                  } else {
                    set((state) => ({
                      currentMessages: state.currentMessages.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: assistantContent, toolCalls: toolCallRecords }
                          : m
                      ),
                    }));
                  }
                  break;

                case "tool-call":
                  toolCallRecords.push({
                    id: event.toolCallId,
                    toolName: event.toolName,
                    args: event.args,
                    status: "calling",
                  });
                  if (hasAssistantMessage) {
                    set((state) => ({
                      currentMessages: state.currentMessages.map((m) =>
                        m.id === assistantId
                          ? { ...m, toolCalls: [...toolCallRecords] }
                          : m
                      ),
                    }));
                  }
                  break;

                case "tool-result":
                  const tcIndex = toolCallRecords.findIndex(
                    (tc) => tc.id === event.toolCallId
                  );
                  if (tcIndex !== -1) {
                    toolCallRecords[tcIndex] = {
                      ...toolCallRecords[tcIndex],
                      result: event.result,
                      status: "done",
                    };
                  } else {
                    toolCallRecords.push({
                      id: event.toolCallId,
                      toolName: event.toolName,
                      args: {},
                      result: event.result,
                      status: "done",
                    });
                  }
                  if (hasAssistantMessage) {
                    set((state) => ({
                      currentMessages: state.currentMessages.map((m) =>
                        m.id === assistantId
                          ? { ...m, toolCalls: [...toolCallRecords] }
                          : m
                      ),
                    }));
                  }
                  break;

                case "tool-error":
                  toolCallRecords.push({
                    id: event.toolCallId,
                    toolName: event.toolName,
                    args: {},
                    result: event.error,
                    status: "error",
                  });
                  if (hasAssistantMessage) {
                    set((state) => ({
                      currentMessages: state.currentMessages.map((m) =>
                        m.id === assistantId
                          ? { ...m, toolCalls: [...toolCallRecords] }
                          : m
                      ),
                    }));
                  }
                  break;

                case "done":
                  // Server saves the complete message to Supabase
                  break;

                case "error":
                  set({ error: event.error });
                  break;
              }
            } catch {
              console.warn("Malformed SSE event:", jsonStr);
            }
          }
        }

        // Finalize assistant message (mark streaming complete)
        set((state) => ({
          currentMessages: state.currentMessages.map((m) =>
            m.id === assistantId
              ? { ...m, content: assistantContent, toolCalls: toolCallRecords, isStreaming: false }
              : m
          ),
          isSending: false,
        }));

        // Move current conversation to top immediately (instant feedback)
        set((state) => {
          const idx = state.conversations.findIndex(
            (c) => c.id === newConversationId
          );
          if (idx > 0) {
            const convos = [...state.conversations];
            const [moved] = convos.splice(idx, 1);
            convos.unshift({ ...moved, updatedAt: new Date() });
            return { conversations: convos };
          }
          if (idx === 0) {
            return {
              conversations: state.conversations.map((c, i) =>
                i === 0 ? { ...c, updatedAt: new Date() } : c
              ),
            };
          }
          return {};
        });

        // After a delay, refresh conversation list to pick up server-generated title
        // (SSE title event gives instant feedback; this is the safety net)
        // Refresh after a delay to pick up server-generated title
        // (title is generated asynchronously after stream closes)
        setTimeout(() => {
          get().loadConversations();
        }, 5000);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to send message";
        set({ error: message, isSending: false });

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

    updateConversationTitle: async (id: string, title: string) => {
      // Optimistic update
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, title } : c
        ),
      }));

      try {
        await fetch(`/api/chat/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
      } catch (error) {
        console.error("Failed to update conversation title:", error);
      }
    },

    clearCurrentConversation: () => {
      set({ currentConversationId: null, currentMessages: [] });
    },

    setError: (error: string | null) => {
      set({ error });
    },
  }));
