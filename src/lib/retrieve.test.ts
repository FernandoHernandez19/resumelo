import { describe, expect, it } from "vitest";
import { retrieveChunks, tokenize } from "./retrieve";
import type { Chunk } from "@/types/document";

const chunk = (id: number, text: string): Chunk => ({ id, page: 1, text });

describe("tokenize", () => {
  it("pasa a minúsculas y quita tildes", () => {
    expect(tokenize("Educación, ÁRBOL ñandú")).toEqual(["educacion", "arbol", "nandu"]);
  });
});

describe("retrieveChunks", () => {
  const chunks = [
    chunk(1, "La fotosíntesis ocurre en los cloroplastos de las plantas."),
    chunk(2, "El presupuesto anual se aprobó en marzo."),
    chunk(3, "Las plantas necesitan luz solar y agua."),
    chunk(4, "Historia de la empresa fundada en 1990."),
  ];

  it("ordena por relevancia pero devuelve en orden de id", () => {
    const result = retrieveChunks("fotosíntesis plantas", chunks);
    expect(result.map((c) => c.id)).toEqual([1, 3]);
  });

  it("ignora tildes y mayúsculas", () => {
    expect(retrieveChunks("FOTOSINTESIS", chunks).map((c) => c.id)).toEqual([1]);
  });

  it("ignora las palabras vacías", () => {
    // "de", "la", "en" aparecen en casi todo; solo cuenta "presupuesto".
    expect(retrieveChunks("¿Qué es lo de la en el presupuesto?", chunks).map((c) => c.id)).toEqual([2]);
  });

  it("da más peso a los términos poco frecuentes", () => {
    const many = [
      ...Array.from({ length: 7 }, (_, i) => chunk(i + 1, "común común")),
      chunk(8, "raro"),
    ];
    // El fragmento con el término raro entra entre los 6 mejores aunque tenga id alto.
    expect(retrieveChunks("común raro", many).map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 8]);
  });

  it("limita a 6 fragmentos", () => {
    const many = Array.from({ length: 10 }, (_, i) => chunk(i + 1, "tema común"));
    expect(retrieveChunks("tema", many)).toHaveLength(6);
  });

  it("se queda con los 6 mejores", () => {
    const many = [
      ...Array.from({ length: 8 }, (_, i) => chunk(i + 1, "relleno sin relación")),
      chunk(9, "gato gato gato"),
      chunk(10, "gato"),
    ];
    expect(retrieveChunks("gato", many).map((c) => c.id)).toEqual([9, 10]);
  });

  it("devuelve los 3 primeros si nada coincide", () => {
    expect(retrieveChunks("astronomía", chunks).map((c) => c.id)).toEqual([1, 2, 3]);
    expect(retrieveChunks("¿y el de la?", chunks).map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it("maneja listas vacías", () => {
    expect(retrieveChunks("hola", [])).toEqual([]);
  });
});
