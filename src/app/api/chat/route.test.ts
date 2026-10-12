import { ApiError } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_QUESTION_LENGTH,
  MAX_TOTAL_CHUNK_CHARS,
} from "@/lib/chatLimits";
import { POST } from "./route";

const generateContentStream = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/gemini", () => ({
  getGeminiModel: () => "modelo-de-prueba",
  getGeminiClient: () => ({ models: { generateContentStream } }),
}));

const chunk = (id: number, text = "texto") => ({ id, page: 1, text });

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function* stream(...parts: string[]) {
  for (const text of parts) yield { text };
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    generateContentStream.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  describe("validación (400)", () => {
    it.each([
      ["JSON inválido", "{no es json"],
      ["sin pregunta", { chunks: [chunk(1)] }],
      ["pregunta vacía", { question: "   ", chunks: [chunk(1)] }],
      [
        "pregunta demasiado larga",
        { question: "a".repeat(MAX_QUESTION_LENGTH + 1), chunks: [chunk(1)] },
      ],
      ["sin fragmentos", { question: "hola", chunks: [] }],
      [
        "más de 8 fragmentos",
        { question: "hola", chunks: Array.from({ length: 9 }, (_, i) => chunk(i + 1)) },
      ],
      [
        "más de 12 000 caracteres",
        {
          question: "hola",
          chunks: [chunk(1, "a".repeat(MAX_TOTAL_CHUNK_CHARS)), chunk(2, "b")],
        },
      ],
      ["fragmento con formato inválido", { question: "hola", chunks: [{ id: "1" }] }],
    ])("rechaza %s", async (_name, body) => {
      const response = await post(body);
      expect(response.status).toBe(400);
      expect((await response.text()).length).toBeGreaterThan(0);
      expect(generateContentStream).not.toHaveBeenCalled();
    });

    it("acepta exactamente los límites", async () => {
      generateContentStream.mockResolvedValue(stream("ok"));
      const chunks = Array.from({ length: 8 }, (_, i) =>
        chunk(i + 1, "a".repeat(MAX_TOTAL_CHUNK_CHARS / 8)),
      );
      const response = await post({
        question: "a".repeat(MAX_QUESTION_LENGTH),
        chunks,
      });
      expect(response.status).toBe(200);
    });
  });

  it("reenvía los trozos de Gemini como texto plano", async () => {
    generateContentStream.mockResolvedValue(stream("Hola ", "mundo [1]"));
    const response = await post({ question: "¿Qué dice?", chunks: [chunk(1, "Contenido")] });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toBe("Hola mundo [1]");

    const call = generateContentStream.mock.calls[0][0];
    expect(call.model).toBe("modelo-de-prueba");
    expect(call.contents).toContain("[1]");
    expect(call.contents).toContain("¿Qué dice?");
    expect(call.config.systemInstruction).toContain("No encontré esa información en el documento");
  });

  it("responde 429 cuando Gemini limita la cuota", async () => {
    generateContentStream.mockRejectedValue(new ApiError({ message: "cuota", status: 429 }));
    const response = await post({ question: "hola", chunks: [chunk(1)] });
    expect(response.status).toBe(429);
    expect(await response.text()).toBe("El servicio está ocupado, intenta en unos segundos.");
  });

  it("responde 500 en otros errores sin filtrar el detalle", async () => {
    generateContentStream.mockRejectedValue(new Error("detalle secreto"));
    const response = await post({ question: "hola", chunks: [chunk(1)] });
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe("No pudimos generar la respuesta.");
    expect(text).not.toContain("secreto");
    expect(console.error).toHaveBeenCalled();
  });

  it("responde 500 si el primer trozo falla", async () => {
    async function* failing() {
      throw new Error("falló");
    }
    generateContentStream.mockResolvedValue(failing());
    const response = await post({ question: "hola", chunks: [chunk(1)] });
    expect(response.status).toBe(500);
  });
});

describe("POST /api/chat con task «summary»", () => {
  beforeEach(() => {
    generateContentStream.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("responde 200 sin pregunta y usa la instrucción del resumen", async () => {
    generateContentStream.mockResolvedValue(stream("- Punto [1]"));
    const response = await post({ task: "summary", chunks: [chunk(1, "Contenido")] });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("- Punto [1]");
    const call = generateContentStream.mock.calls[0][0];
    expect(call.config.systemInstruction).toContain("4 a 6 viñetas");
    expect(call.contents).toContain("Resume el documento.");
  });

  it("ignora una pregunta enviada junto con la tarea", async () => {
    generateContentStream.mockResolvedValue(stream("ok"));
    await post({ task: "summary", question: "otra cosa", chunks: [chunk(1)] });
    expect(generateContentStream.mock.calls[0][0].contents).not.toContain("otra cosa");
  });

  it.each([
    ["sin fragmentos", { task: "summary", chunks: [] }],
    [
      "más de 8 fragmentos",
      { task: "summary", chunks: Array.from({ length: 9 }, (_, i) => chunk(i + 1)) },
    ],
    [
      "más de 12 000 caracteres",
      {
        task: "summary",
        chunks: [chunk(1, "a".repeat(MAX_TOTAL_CHUNK_CHARS)), chunk(2, "b")],
      },
    ],
    ["tarea desconocida", { task: "otra", question: "hola", chunks: [chunk(1)] }],
  ])("mantiene los límites (400): %s", async (_name, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(generateContentStream).not.toHaveBeenCalled();
  });

  it("devuelve 429 y 500 igual que el chat", async () => {
    generateContentStream.mockRejectedValueOnce(new ApiError({ message: "cuota", status: 429 }));
    expect((await post({ task: "summary", chunks: [chunk(1)] })).status).toBe(429);
    generateContentStream.mockRejectedValueOnce(new Error("x"));
    expect((await post({ task: "summary", chunks: [chunk(1)] })).status).toBe(500);
  });

  it("sin task, la pregunta sigue siendo obligatoria y se usa la instrucción normal", async () => {
    expect((await post({ chunks: [chunk(1)] })).status).toBe(400);
    generateContentStream.mockResolvedValue(stream("ok"));
    await post({ question: "¿Qué?", chunks: [chunk(1)] });
    const call = generateContentStream.mock.calls[0][0];
    expect(call.config.systemInstruction).not.toContain("4 a 6 viñetas");
    expect(call.contents).toContain("¿Qué?");
  });
});
