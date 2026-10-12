import type { Chunk, PageText } from "@/types/document";

export interface ChunkOptions {
  /** Tamaño objetivo de cada fragmento, en caracteres. */
  size?: number;
  /** Caracteres compartidos entre fragmentos consecutivos. */
  overlap?: number;
}

const DEFAULT_SIZE = 1000;
const DEFAULT_OVERLAP = 150;

const isSpace = (char: string | undefined): boolean =>
  char === undefined || /\s/.test(char);

/** Busca dónde cortar: prefiere un salto de párrafo y luego un espacio. */
function findCut(text: string, start: number, limit: number, minLength: number) {
  const window = text.slice(start, limit);
  const paragraph = window.lastIndexOf("\n\n");
  if (paragraph >= minLength) return start + paragraph;
  for (let i = window.length - 1; i >= minLength; i--) {
    if (isSpace(window[i])) return start + i;
  }
  return limit; // palabra gigante sin espacios: corte duro
}

/** Avanza hasta el inicio de la siguiente palabra para no empezar a mitad de una. */
function alignToWord(text: string, position: number, max: number): number {
  let i = position;
  if (!isSpace(text[i - 1]) && !isSpace(text[i])) {
    while (i < max && !isSpace(text[i])) i++;
  }
  while (i < max && isSpace(text[i])) i++;
  return i;
}

function splitText(text: string, size: number, overlap: number): string[] {
  const pieces: string[] = [];
  const minLength = Math.floor(size / 2);
  let start = 0;
  while (start < text.length) {
    const limit = Math.min(start + size, text.length);
    const end = limit === text.length ? limit : findCut(text, start, limit, minLength);
    const piece = text.slice(start, end).trim();
    if (piece) pieces.push(piece);
    if (end >= text.length) break;
    start = alignToWord(text, Math.max(end - overlap, start + 1), end);
  }
  return pieces;
}

/**
 * Divide el texto de cada página en fragmentos de ~`size` caracteres con
 * solapamiento. Los fragmentos nunca cruzan páginas, así la cita es exacta.
 */
export function chunkPages(
  pages: PageText[],
  { size = DEFAULT_SIZE, overlap = DEFAULT_OVERLAP }: ChunkOptions = {},
): Chunk[] {
  if (size <= 0 || overlap < 0 || overlap >= size / 2) {
    throw new RangeError("El solapamiento debe ser menor que la mitad del tamaño.");
  }
  const chunks: Chunk[] = [];
  for (const { page, text } of pages) {
    for (const piece of splitText(text.trim(), size, overlap)) {
      chunks.push({ id: chunks.length + 1, page, text: piece });
    }
  }
  return chunks;
}
