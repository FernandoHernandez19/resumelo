export interface PageText {
  /** Número de página (desde 1), o null en archivos sin páginas (TXT). */
  page: number | null;
  text: string;
}

export interface Chunk {
  /** Identificador consecutivo desde 1. */
  id: number;
  /** Página de origen, o null si no se conoce. */
  page: number | null;
  text: string;
}

export type DocumentStatus = "idle" | "reading" | "ready" | "error";
