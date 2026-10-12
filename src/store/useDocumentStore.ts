import { create } from "zustand";
import type { Chunk, DocumentStatus, PageText } from "@/types/document";

interface DocumentState {
  file: File | null;
  status: DocumentStatus;
  error: string | null;
  text: string;
  pages: PageText[];
  chunks: Chunk[];
  activeChunkId: number | null;
}

interface DocumentActions {
  setFile: (file: File) => void;
  startReading: () => void;
  setReady: (data: { text: string; pages: PageText[]; chunks: Chunk[] }) => void;
  setError: (message: string) => void;
  setActiveChunk: (id: number | null) => void;
  reset: () => void;
}

export type DocumentStore = DocumentState & DocumentActions;

const initialState: DocumentState = {
  file: null,
  status: "idle",
  error: null,
  text: "",
  pages: [],
  chunks: [],
  activeChunkId: null,
};

// El contenido del documento vive solo en memoria: no se persiste ni se envía.
export const useDocumentStore = create<DocumentStore>()((set) => ({
  ...initialState,
  setFile: (file) => set({ ...initialState, file }),
  startReading: () => set({ status: "reading", error: null }),
  setReady: ({ text, pages, chunks }) =>
    set({ status: "ready", error: null, text, pages, chunks }),
  setError: (message) =>
    set({ ...initialState, status: "error", error: message }),
  setActiveChunk: (id) => set({ activeChunkId: id }),
  reset: () => set({ ...initialState }),
}));
