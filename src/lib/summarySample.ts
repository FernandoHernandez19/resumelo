import { MAX_REQUEST_CHUNKS, MAX_TOTAL_CHUNK_CHARS } from "@/lib/chatLimits";
import type { Chunk } from "@/types/document";

export interface SummarySample {
  chunks: Chunk[];
  /** Fragmentos totales del documento. */
  total: number;
  /** Fragmentos incluidos en la muestra. */
  used: number;
  /** true si la muestra no cubre todo el documento. */
  sampled: boolean;
}

const sumChars = (chunks: Chunk[]) =>
  chunks.reduce((sum, chunk) => sum + chunk.text.length, 0);

/**
 * Elige los fragmentos que se envían para resumir. Si todo cabe en los límites
 * del servidor se envía entero; si no, se toma una muestra repartida de forma
 * uniforme (siempre con el primero y el último) sin pasar del límite de caracteres.
 */
export function selectSummaryChunks(chunks: Chunk[]): SummarySample {
  const total = chunks.length;
  if (total <= MAX_REQUEST_CHUNKS && sumChars(chunks) <= MAX_TOTAL_CHUNK_CHARS) {
    return { chunks, total, used: total, sampled: false };
  }

  const wanted = Math.min(MAX_REQUEST_CHUNKS, total);
  const indices = new Set<number>();
  for (let i = 0; i < wanted; i++) {
    indices.add(wanted === 1 ? 0 : Math.round((i * (total - 1)) / (wanted - 1)));
  }

  const selected: Chunk[] = [];
  let chars = 0;
  for (const index of [...indices].sort((a, b) => a - b)) {
    const chunk = chunks[index];
    if (chars + chunk.text.length > MAX_TOTAL_CHUNK_CHARS) continue;
    selected.push(chunk);
    chars += chunk.text.length;
  }
  selected.sort((a, b) => a.id - b.id);

  return {
    chunks: selected,
    total,
    used: selected.length,
    sampled: selected.length < total,
  };
}
