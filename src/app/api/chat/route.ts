import { ApiError } from "@google/genai";
import {
  MAX_QUESTION_LENGTH,
  MAX_REQUEST_CHUNKS,
  MAX_TOTAL_CHUNK_CHARS,
} from "@/lib/chatLimits";
import { getGeminiClient, getGeminiModel } from "@/lib/server/gemini";
import {
  buildPrompt,
  SUMMARY_INSTRUCTION,
  SUMMARY_QUESTION,
  SYSTEM_INSTRUCTION,
} from "@/lib/server/chatPrompt";
import type { Chunk } from "@/types/document";

// Runtime Node.js (el predeterminado). `export const runtime` es incompatible con
// `cacheComponents`, así que no se declara explícitamente.

const MAX_BODY_BYTES = 100_000;
const BUSY_MESSAGE = "El servicio está ocupado, intenta en unos segundos.";
const FAILURE_MESSAGE = "No pudimos generar la respuesta.";

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type Parsed =
  | { ok: true; task: "chat" | "summary"; question: string; chunks: Chunk[] }
  | { ok: false; message: string };

function parseBody(body: unknown): Parsed {
  if (!isRecord(body)) return { ok: false, message: "Solicitud inválida." };
  const { chunks } = body;
  if (body.task !== undefined && body.task !== "summary") {
    return { ok: false, message: "Tarea inválida." };
  }
  const task = body.task === "summary" ? "summary" : "chat";
  const question = task === "summary" ? SUMMARY_QUESTION : body.question;

  if (typeof question !== "string" || question.trim().length === 0) {
    return { ok: false, message: "Escribe una pregunta." };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      message: `La pregunta no puede superar los ${MAX_QUESTION_LENGTH} caracteres.`,
    };
  }
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return { ok: false, message: "Se necesita al menos un fragmento del documento." };
  }
  if (chunks.length > MAX_REQUEST_CHUNKS) {
    return {
      ok: false,
      message: `Se permiten como máximo ${MAX_REQUEST_CHUNKS} fragmentos.`,
    };
  }

  const parsed: Chunk[] = [];
  let total = 0;
  for (const item of chunks as unknown[]) {
    if (
      !isRecord(item) ||
      typeof item.id !== "number" ||
      !Number.isInteger(item.id) ||
      item.id < 1 ||
      (item.page !== null && typeof item.page !== "number") ||
      typeof item.text !== "string" ||
      item.text.trim().length === 0
    ) {
      return { ok: false, message: "Los fragmentos tienen un formato inválido." };
    }
    total += item.text.length;
    parsed.push({ id: item.id, page: item.page, text: item.text });
  }
  if (total > MAX_TOTAL_CHUNK_CHARS) {
    return {
      ok: false,
      message: `Los fragmentos no pueden superar ${MAX_TOTAL_CHUNK_CHARS} caracteres en total.`,
    };
  }
  return { ok: true, task, question: question.trim(), chunks: parsed };
}

function isQuotaError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 429;
  return isRecord(error) && error.status === 429;
}

function logError(error: unknown): void {
  // Solo nombre, estado y mensaje: nunca la configuración ni la API key.
  if (error instanceof Error) {
    const status = isRecord(error) ? error.status : undefined;
    console.error("[api/chat]", error.name, status ?? "", error.message);
  } else {
    console.error("[api/chat] error desconocido");
  }
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return textResponse("La solicitud es demasiado grande.", 400);
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return textResponse("Solicitud inválida.", 400);
  }
  const parsed = parseBody(body);
  if (!parsed.ok) return textResponse(parsed.message, 400);

  try {
    const stream = await getGeminiClient().models.generateContentStream({
      model: getGeminiModel(),
      contents: buildPrompt(parsed.question, parsed.chunks),
      config: {
        systemInstruction:
          parsed.task === "summary" ? SUMMARY_INSTRUCTION : SYSTEM_INSTRUCTION,
        abortSignal: request.signal,
      },
    });

    // Se pide el primer trozo antes de responder para poder devolver 429/500 reales.
    const iterator = stream[Symbol.asyncIterator]();
    const first = await iterator.next();
    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          let result = first;
          while (!result.done) {
            const text = result.value.text;
            if (text) controller.enqueue(encoder.encode(text));
            result = await iterator.next();
          }
          controller.close();
        } catch (error) {
          logError(error);
          controller.error(error);
        }
      },
      async cancel() {
        await iterator.return?.(undefined);
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logError(error);
    return isQuotaError(error)
      ? textResponse(BUSY_MESSAGE, 429)
      : textResponse(FAILURE_MESSAGE, 500);
  }
}
