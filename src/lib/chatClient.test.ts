import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatRequestError, getFriendlyError, streamChat } from "./chatClient";

const encoder = new TextEncoder();

function streamOf(...parts: Uint8Array[]): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        parts.forEach((part) => controller.enqueue(part));
        controller.close();
      },
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("streamChat", () => {
  it("lee el stream y entrega el texto por trozos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamOf(encoder.encode("Hola "), encoder.encode("mundo"))));
    const pieces: string[] = [];
    await streamChat({ question: "q", chunks: [], onText: (t) => pieces.push(t) });
    expect(pieces.join("")).toBe("Hola mundo");
  });

  it("decodifica caracteres multibyte partidos entre trozos", async () => {
    const bytes = encoder.encode("canción");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamOf(bytes.slice(0, 5), bytes.slice(5))),
    );
    let text = "";
    await streamChat({ question: "q", chunks: [], onText: (t) => (text += t) });
    expect(text).toBe("canción");
  });

  it("envía solo la pregunta y los fragmentos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamOf());
    vi.stubGlobal("fetch", fetchMock);
    await streamChat({ question: "hola", chunks: [{ id: 1, page: null, text: "t" }], onText: () => undefined });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(Object.keys(JSON.parse(init.body))).toEqual(["question", "chunks"]);
  });

  it("lanza ChatRequestError con el status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("busy", { status: 429 })));
    await expect(
      streamChat({ question: "q", chunks: [], onText: () => undefined }),
    ).rejects.toMatchObject({ name: "ChatRequestError", status: 429 });
  });

  it("aborta la lectura con AbortSignal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode("parcial"));
            init.signal?.addEventListener("abort", () =>
              controller.error(new DOMException("Aborted", "AbortError")),
            );
          },
        });
        return Promise.resolve(new Response(body));
      }),
    );
    const controller = new AbortController();
    let text = "";
    const promise = streamChat({
      question: "q",
      chunks: [],
      signal: controller.signal,
      onText: (t) => {
        text += t;
        controller.abort();
      },
    });
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(text).toBe("parcial");
  });
});

describe("getFriendlyError", () => {
  it("traduce cada tipo de fallo", () => {
    expect(getFriendlyError(new ChatRequestError(429, "x"))).toMatch(/ocupado/);
    expect(getFriendlyError(new ChatRequestError(500, "x"))).toBe("No pudimos generar la respuesta.");
    expect(getFriendlyError(new ChatRequestError(400, "Escribe una pregunta."))).toBe("Escribe una pregunta.");
    expect(getFriendlyError(new TypeError("Failed to fetch"))).toMatch(/conexión/);
  });
});
