import "server-only";
import { GoogleGenAI } from "@google/genai";

/** Modelo por defecto (alias del SDK); se puede cambiar con GEMINI_MODEL. */
export const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

let client: GoogleGenAI | null = null;

/** Cliente de Gemini. La key solo se lee en el servidor y nunca se registra. */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Falta la variable de entorno GEMINI_API_KEY. Defínela en .env.local o en el panel de Vercel.",
    );
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}
