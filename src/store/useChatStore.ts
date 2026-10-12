import { create } from "zustand";

export type ChatRole = "user" | "assistant";
export type MessageStatus = "streaming" | "done" | "stopped" | "error";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  status: MessageStatus;
  /** Mensaje de error amigable cuando status === "error". */
  error?: string;
}

interface ChatState {
  messages: ChatMessage[];
}

interface ChatActions {
  addMessage: (message: Omit<ChatMessage, "id">) => string;
  appendToMessage: (id: string, text: string) => void;
  updateMessage: (id: string, patch: Partial<Omit<ChatMessage, "id">>) => void;
  clear: () => void;
}

let counter = 0;

// Los mensajes viven solo en memoria.
export const useChatStore = create<ChatState & ChatActions>()((set) => ({
  messages: [],
  addMessage: (message) => {
    const id = `m${++counter}`;
    set((state) => ({ messages: [...state.messages, { ...message, id }] }));
    return id;
  },
  appendToMessage: (id, text) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + text } : m,
      ),
    })),
  updateMessage: (id, patch) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  clear: () => set({ messages: [] }),
}));
