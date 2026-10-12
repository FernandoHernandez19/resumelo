import type { Chunk } from "@/types/document";

export interface StreamChatOptions {
  question: string;
  chunks: Chunk[];
  signal?: AbortSignal;
  onText: (text: string) => void;
}

/**
 * Envía la pregunta y los fragmentos elegidos (nunca el documento completo) y
 * entrega el texto a medida que llega. Un AbortSignal cancela la lectura.
 */
export async function streamChat({
  question,
  chunks,
  signal,
  onText,
}: StreamChatOptions): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, chunks }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Error ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      if (text) onText(text);
    }
    const rest = decoder.decode();
    if (rest) onText(rest);
  } finally {
    reader.releaseLock();
  }
}
