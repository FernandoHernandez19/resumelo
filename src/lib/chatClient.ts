import type { Chunk } from "@/types/document";

export class ChatRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ChatRequestError";
    this.status = status;
  }
}

/** Mensaje amigable según el tipo de fallo. */
export function getFriendlyError(error: unknown): string {
  if (error instanceof ChatRequestError) {
    if (error.status === 400) return error.message;
    if (error.status === 429) {
      return "El servicio está ocupado, intenta en unos segundos.";
    }
    return "No pudimos generar la respuesta.";
  }
  if (error instanceof TypeError) {
    return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  }
  return "No pudimos generar la respuesta.";
}

export type ChatTask = "summary";

export interface StreamChatOptions {
  question: string;
  /** Sin task es una pregunta normal; con "summary" el servidor usa su pregunta fija. */
  task?: ChatTask;
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
  task,
  chunks,
  signal,
  onText,
}: StreamChatOptions): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(task === "summary" ? { task, chunks } : { question, chunks }),
    signal,
  });

  if (!response.ok || !response.body) {
    const detail = response.status === 400 ? await response.text() : "";
    throw new ChatRequestError(
      response.status,
      detail || "Tu pregunta no es válida. Revísala e inténtalo de nuevo.",
    );
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
