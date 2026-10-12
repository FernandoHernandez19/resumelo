export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["application/pdf", "text/plain"] as const;

export const FILE_ERRORS = {
  type: "Tipo de archivo no permitido. Sube un PDF o un archivo TXT.",
  size: "El archivo es muy grande. El tamaño máximo es de 5 MB.",
  empty: "El archivo está vacío.",
} as const;

/** Devuelve un mensaje de error en español, o null si el archivo es válido. */
export function validateFile(file: File): string | null {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return FILE_ERRORS.type;
  }
  if (file.size === 0) return FILE_ERRORS.empty;
  if (file.size > MAX_FILE_SIZE_BYTES) return FILE_ERRORS.size;
  return null;
}
