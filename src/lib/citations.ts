export type CitationSegment =
  | { type: "text"; value: string }
  | { type: "citation"; id: number };

// [2], [1, 3] y [1,3]. Un "[1" incompleto no coincide y queda como texto.
const CITATION_GROUP = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

/**
 * Separa el texto de una respuesta en texto plano y citas [n].
 * Los ids que no existen en `validIds` se conservan como texto.
 */
export function splitCitations(
  text: string,
  validIds: Iterable<number>,
): CitationSegment[] {
  const valid = new Set(validIds);
  const segments: CitationSegment[] = [];

  const pushText = (value: string) => {
    if (!value) return;
    const last = segments[segments.length - 1];
    if (last?.type === "text") last.value += value;
    else segments.push({ type: "text", value });
  };

  let cursor = 0;
  for (const match of text.matchAll(CITATION_GROUP)) {
    pushText(text.slice(cursor, match.index));
    for (const raw of match[1].split(",")) {
      const id = Number(raw.trim());
      if (valid.has(id)) segments.push({ type: "citation", id });
      else pushText(`[${raw.trim()}]`);
    }
    cursor = match.index + match[0].length;
  }
  pushText(text.slice(cursor));
  return segments;
}
