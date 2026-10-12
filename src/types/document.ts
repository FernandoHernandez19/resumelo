export interface PageText {
  /** Número de página (desde 1). En TXT es siempre 1. */
  page: number;
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
