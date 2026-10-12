import { describe, expect, it } from "vitest";
import { chunkPages } from "./chunk";

const words = (n: number) =>
  Array.from({ length: n }, (_, i) => `w${String(i).padStart(4, "0")}`);
const longText = words(600).join(" ");

describe("chunkPages", () => {
  it("devuelve un arreglo vacío con texto vacío o solo espacios", () => {
    expect(chunkPages([])).toEqual([]);
    expect(chunkPages([{ page: 1, text: "   \n\n " }])).toEqual([]);
  });

  it("mantiene un texto corto en un solo fragmento", () => {
    expect(chunkPages([{ page: null, text: "Hola mundo" }])).toEqual([
      { id: 1, page: null, text: "Hola mundo" },
    ]);
  });

  it("respeta el tamaño máximo de ~1000 caracteres", () => {
    const chunks = chunkPages([{ page: 1, text: longText }]);
    expect(chunks.length).toBeGreaterThan(3);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(1000);
    }
  });

  it("numera los fragmentos de forma consecutiva desde 1", () => {
    const chunks = chunkPages([
      { page: 1, text: longText },
      { page: 2, text: longText },
    ]);
    expect(chunks.map((c) => c.id)).toEqual(chunks.map((_, i) => i + 1));
  });

  it("solapa fragmentos consecutivos unos 150 caracteres", () => {
    const chunks = chunkPages([{ page: 1, text: longText }]);
    for (let i = 0; i < chunks.length - 1; i++) {
      const next = chunks[i + 1].text;
      const firstWord = next.split(" ")[0];
      const at = chunks[i].text.indexOf(firstWord);
      expect(at).toBeGreaterThanOrEqual(0);
      const shared = chunks[i].text.length - at;
      expect(shared).toBeGreaterThan(100);
      expect(shared).toBeLessThanOrEqual(160);
    }
  });

  it("no corta palabras", () => {
    const valid = new Set(words(600));
    const chunks = chunkPages([{ page: 1, text: longText }]);
    for (const chunk of chunks) {
      for (const token of chunk.text.split(/\s+/)) {
        expect(valid.has(token)).toBe(true);
      }
    }
  });

  it("prefiere cortar en saltos de párrafo", () => {
    const paragraph = (c: string) => `${c} `.repeat(300).trim();
    const text = `${paragraph("a")}\n\n${paragraph("b")}\n\n${paragraph("c")}`;
    const [first] = chunkPages([{ page: 1, text }]);
    expect(first.text).toMatch(/^(a )*a$/);
  });

  it("asigna la página de origen y no mezcla páginas", () => {
    const chunks = chunkPages([
      { page: 3, text: longText },
      { page: 4, text: "Texto de la página cuatro" },
    ]);
    expect(chunks.at(-1)).toMatchObject({ page: 4, text: "Texto de la página cuatro" });
    expect(chunks.slice(0, -1).every((c) => c.page === 3)).toBe(true);
  });

  it("corta una palabra gigante sin espacios sin entrar en bucle", () => {
    const chunks = chunkPages([{ page: 1, text: "x".repeat(2500) }]);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.every((c) => c.text.length <= 1000)).toBe(true);
  });

  it("rechaza un solapamiento inválido", () => {
    expect(() => chunkPages([], { size: 100, overlap: 80 })).toThrow(RangeError);
  });
});
