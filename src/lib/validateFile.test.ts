import { describe, expect, it } from "vitest";
import {
  FILE_ERRORS,
  MAX_FILE_SIZE_BYTES,
  validateFile,
} from "./validateFile";

const make = (size: number, type: string) =>
  new File([new Uint8Array(size)], "doc", { type });

describe("validateFile", () => {
  it("acepta PDF y TXT válidos", () => {
    expect(validateFile(make(10, "application/pdf"))).toBeNull();
    expect(validateFile(make(10, "text/plain"))).toBeNull();
  });

  it("rechaza tipos no permitidos", () => {
    expect(validateFile(make(10, "image/png"))).toBe(FILE_ERRORS.type);
    expect(validateFile(make(10, ""))).toBe(FILE_ERRORS.type);
  });

  it("rechaza archivos vacíos", () => {
    expect(validateFile(make(0, "text/plain"))).toBe(FILE_ERRORS.empty);
  });

  it("rechaza archivos de más de 5 MB y acepta el límite exacto", () => {
    expect(validateFile(make(MAX_FILE_SIZE_BYTES + 1, "application/pdf"))).toBe(
      FILE_ERRORS.size,
    );
    expect(validateFile(make(MAX_FILE_SIZE_BYTES, "application/pdf"))).toBeNull();
  });
});
