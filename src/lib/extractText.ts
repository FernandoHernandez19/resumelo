import type { PageText } from "@/types/document";

export const NO_TEXT_ERROR =
  "Este PDF no contiene texto seleccionable. Prueba con un PDF digital o un archivo TXT.";
export const READ_ERROR =
  "No se pudo leer el archivo. Comprueba que no esté dañado o protegido con contraseña.";

export interface ExtractProgress {
  current: number;
  total: number;
}

export interface ExtractResult {
  text: string;
  pages: PageText[];
}

export class ExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractError";
  }
}

function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdf(
  file: File,
  onProgress?: (progress: ExtractProgress) => void,
): Promise<ExtractResult> {
  // Import dinámico: pdfjs-dist solo se carga en el navegador.
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages: PageText[] = [];

  try {
    for (let number = 1; number <= pdf.numPages; number++) {
      onProgress?.({ current: number, total: pdf.numPages });
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      let raw = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        raw += item.str;
        raw += item.hasEOL ? "\n" : " ";
      }
      page.cleanup();
      const text = normalize(raw);
      if (text) pages.push({ page: number, text });
    }
  } finally {
    await loadingTask.destroy();
  }

  if (pages.length === 0) throw new ExtractError(NO_TEXT_ERROR);
  return { text: pages.map((p) => p.text).join("\n\n"), pages };
}

export async function extractText(
  file: File,
  onProgress?: (progress: ExtractProgress) => void,
): Promise<ExtractResult> {
  try {
    if (file.type === "application/pdf") return await extractPdf(file, onProgress);
    const text = normalize(await file.text());
    if (!text) throw new ExtractError("El archivo no contiene texto.");
    return { text, pages: [{ page: null, text }] };
  } catch (error) {
    if (error instanceof ExtractError) throw error;
    throw new ExtractError(READ_ERROR);
  }
}
