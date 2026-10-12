import { describe, expect, it } from "vitest";
import { MAX_REQUEST_CHUNKS, MAX_TOTAL_CHUNK_CHARS } from "./chatLimits";
import { selectSummaryChunks } from "./summarySample";
import type { Chunk } from "@/types/document";

const make = (n: number, size = 100): Chunk[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    page: 1,
    text: "x".repeat(size),
  }));

const chars = (chunks: Chunk[]) => chunks.reduce((sum, c) => sum + c.text.length, 0);

describe("selectSummaryChunks", () => {
  it("devuelve todo un documento corto", () => {
    const chunks = make(5);
    expect(selectSummaryChunks(chunks)).toEqual({
      chunks,
      total: 5,
      used: 5,
      sampled: false,
    });
  });

  it("acepta exactamente 8 fragmentos y 12 000 caracteres", () => {
    const chunks = make(8, MAX_TOTAL_CHUNK_CHARS / 8);
    expect(selectSummaryChunks(chunks).sampled).toBe(false);
  });

  it("maneja un documento sin fragmentos", () => {
    expect(selectSummaryChunks([])).toEqual({ chunks: [], total: 0, used: 0, sampled: false });
  });

  it("toma una muestra uniforme de un documento largo", () => {
    const result = selectSummaryChunks(make(50));
    expect(result.sampled).toBe(true);
    expect(result.total).toBe(50);
    expect(result.used).toBe(MAX_REQUEST_CHUNKS);
    expect(result.chunks.map((c) => c.id)).toEqual([1, 8, 15, 22, 29, 36, 43, 50]);
  });

  it("siempre incluye el primero y el último", () => {
    for (const n of [9, 10, 13, 100, 1001]) {
      const ids = selectSummaryChunks(make(n)).chunks.map((c) => c.id);
      expect(ids[0]).toBe(1);
      expect(ids.at(-1)).toBe(n);
    }
  });

  it("mantiene el orden por id y no repite fragmentos", () => {
    const ids = selectSummaryChunks(make(9)).chunks.map((c) => c.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respeta el límite de 12 000 caracteres", () => {
    // 20 fragmentos de 3 000: caben como mucho 4.
    const result = selectSummaryChunks(make(20, 3000));
    expect(result.sampled).toBe(true);
    expect(chars(result.chunks)).toBeLessThanOrEqual(MAX_TOTAL_CHUNK_CHARS);
    expect(result.used).toBe(result.chunks.length);
    expect(result.used).toBeLessThanOrEqual(4);
  });

  it("marca muestra si pocos fragmentos exceden los caracteres", () => {
    const result = selectSummaryChunks(make(5, 3000));
    expect(result.sampled).toBe(true);
    expect(chars(result.chunks)).toBeLessThanOrEqual(MAX_TOTAL_CHUNK_CHARS);
  });
});
