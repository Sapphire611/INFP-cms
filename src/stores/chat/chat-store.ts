/**
 * Chat store - manages chat state with Zustand
 * Supports streaming responses with tool call visibility
 */

import { createStore } from "zustand/vanilla";
import type { Message, ToolCallRecord, ChatStreamEvent } from "@/types/chat";
import type { Conversation } from "@/types/chat";

export type ChatState = {
  conversations: Conversation[];
  currentConversationId: string | null;
  currentMessages: Message[];
  currentAgentId: string;
  isLoading: boolean;
  error: string | null;

  setCurrentAgent: (agentId: string) => void;
  setCurrentConversation: (id: string | null) => void;
  createConversation: (title?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  clearCurrentConversation: () => void;
  setError: (error: string | null) => void;

  syncToLocalStorage: () => void;
  loadFromLocalStorage: (conversationId: string) => void;
};

export const createChatStore = (init?: Partial<ChatState>) =>
  createStore<ChatState>()((set, get) => ({
    conversations: init?.conversations ?? [],
    currentConversationId: init?.currentConversationId ?? null,
    currentMessages: init?.currentMessages ?? [],
    currentAgentId: init?.currentAgentId ?? "default",
    isLoading: false,
    error: null,

    setCurrentAgent: (agentId: string) => {
      set({ currentAgentId: agentId, currentConversationId: null, currentMessages: [] });
    },

    setCurrentConversation: (id: string | null) => {
      set({ currentConversationId: id, error: null });
      if (id) {
        get().loadFromLocalStorage(id);
      } else {
        set({ currentMessages: [] });
      }
    },

    createConversation: async (title = "新对话") => {
      const { currentAgentId } = get();
      set({ isLoading: true, error: null });
      try {
        const response = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, agentId: currentAgentId }),
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
        await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });

        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId:
            state.currentConversationId === id ? null : state.currentConversationId,
          currentMessages:
            state.currentConversationId === id ? [] : state.currentMessages,
          isLoading: false,
        }));

        localStorage.removeItem(`chat_messages_${id}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete conversation";
        set({ error: message, isLoading: false });
        throw error;
      }
    },

    sendMessage: async (content: string) => {
      const { currentConversationId, currentMessages, currentAgentId } = get();

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
        isLoading: true,
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
                    // Create assistant message (first text chunk)
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
                    // Update existing assistant message in-place
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
                  // If assistant message exists, update toolCalls
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
                  // Update the matching tool call record
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
                  // Streaming complete
                  break;

                case "error":
                  set({ error: event.error });
                  break;
              }
            } catch {
              // Skip malformed SSE events
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
          isLoading: false,
        }));

        get().syncToLocalStorage();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to send message";
        set({ error: message, isLoading: false });

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
        // Strip isStreaming flag before saving
        const toSave = currentMessages.map(({ isStreaming, ...rest }) => rest);
        localStorage.setItem(
          `chat_messages_${currentConversationId}`,
          JSON.stringify(toSave)
        );
      }
    },

    loadFromLocalStorage: (conversationId: string) => {
      try {
        const stored = localStorage.getItem(`chat_messages_${conversationId}`);
        const messages: Message[] = stored ? JSON.parse(stored) : [];
        set({ currentMessages: messages });
      } catch {
        set({ currentMessages: [] });
      }
    },
  }));
