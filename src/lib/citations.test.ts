import { describe, expect, it } from "vitest";
import { splitCitations } from "./citations";

const ids = [1, 2, 3, 4];

describe("splitCitations", () => {
  it("devuelve un solo segmento de texto si no hay citas", () => {
    expect(splitCitations("Sin citas aquí.", ids)).toEqual([
      { type: "text", value: "Sin citas aquí." },
    ]);
    expect(splitCitations("", ids)).toEqual([]);
  });

  it("entiende [2]", () => {
    expect(splitCitations("Dato [2].", ids)).toEqual([
      { type: "text", value: "Dato " },
      { type: "citation", id: 2 },
      { type: "text", value: "." },
    ]);
  });

  it("entiende [1][3]", () => {
    expect(splitCitations("Dato [1][3]", ids)).toEqual([
      { type: "text", value: "Dato " },
      { type: "citation", id: 1 },
      { type: "citation", id: 3 },
    ]);
  });

  it.each(["[1, 3]", "[1,3]", "[1 ,  3]"])("entiende %s", (group) => {
    expect(splitCitations(`A ${group}`, ids)).toEqual([
      { type: "text", value: "A " },
      { type: "citation", id: 1 },
      { type: "citation", id: 3 },
    ]);
  });

  it("deja como texto un id que no existe", () => {
    expect(splitCitations("Dato [9]", ids)).toEqual([
      { type: "text", value: "Dato [9]" },
    ]);
  });

  it("separa los ids válidos de los inválidos dentro de un grupo", () => {
    expect(splitCitations("[1, 9]", ids)).toEqual([
      { type: "citation", id: 1 },
      { type: "text", value: "[9]" },
    ]);
  });

  it("deja como texto un corchete incompleto (stream en curso)", () => {
    expect(splitCitations("Dato [1", ids)).toEqual([{ type: "text", value: "Dato [1" }]);
    expect(splitCitations("Dato [1, ", ids)).toEqual([{ type: "text", value: "Dato [1, " }]);
    expect(splitCitations("Dato [", ids)).toEqual([{ type: "text", value: "Dato [" }]);
  });

  it("no toca corchetes que no son citas", () => {
    expect(splitCitations("[a] y [1a]", ids)).toEqual([
      { type: "text", value: "[a] y [1a]" },
    ]);
  });

  it("acepta un Set de ids", () => {
    expect(splitCitations("[2]", new Set([2]))).toEqual([{ type: "citation", id: 2 }]);
  });
});
