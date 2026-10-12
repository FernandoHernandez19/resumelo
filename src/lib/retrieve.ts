import type { Chunk } from "@/types/document";

export const MAX_RELEVANT_CHUNKS = 6;
export const FALLBACK_CHUNKS = 3;

const STOP_WORDS = new Set(
  (
    "a al algo algunas algunos ante antes como con contra cual cuales cuando cuanto de del desde donde " +
    "durante e el ella ellas ellos en entre era eran es esa esas ese eso esos esta estaba estan estar este " +
    "esto estos fue fueron ha han hasta hay la las le les lo los me mi mis mucho muy ni no nos o otra otro " +
    "para pero por porque que quien quienes se sea segun ser si sin sobre son su sus tambien te tiene tienen " +
    "todo todos tu tus un una unas uno unos y ya yo"
  ).split(" "),
);

/** Minúsculas, sin tildes y separado en palabras. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function queryTerms(question: string): string[] {
  const terms = tokenize(question).filter(
    (word) => word.length > 1 && !STOP_WORDS.has(word),
  );
  return [...new Set(terms)];
}

/**
 * Elige los fragmentos más relevantes para una pregunta (TF-IDF simple).
 * Devuelve hasta 6 en orden de id; si ninguno coincide, los 3 primeros.
 */
export function retrieveChunks(question: string, chunks: Chunk[]): Chunk[] {
  const terms = queryTerms(question);
  const counts = chunks.map((chunk) => {
    const map = new Map<string, number>();
    for (const token of tokenize(chunk.text)) {
      map.set(token, (map.get(token) ?? 0) + 1);
    }
    return map;
  });

  const idf = new Map<string, number>();
  for (const term of terms) {
    const df = counts.filter((map) => map.has(term)).length;
    idf.set(term, Math.log(1 + chunks.length / Math.max(df, 1)));
  }

  const scored = chunks
    .map((chunk, index) => {
      let score = 0;
      for (const term of terms) {
        const tf = counts[index].get(term) ?? 0;
        if (tf > 0) score += (1 + Math.log(tf)) * (idf.get(term) ?? 0);
      }
      return { chunk, score };
    })
    .filter((entry) => entry.score > 0);

  if (scored.length === 0) return chunks.slice(0, FALLBACK_CHUNKS);

  return scored
    .sort((a, b) => b.score - a.score || a.chunk.id - b.chunk.id)
    .slice(0, MAX_RELEVANT_CHUNKS)
    .map((entry) => entry.chunk)
    .sort((a, b) => a.id - b.id);
}
