"use client";

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { DocumentSummary } from "@/components/document/DocumentSummary";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { chunkPages } from "@/lib/chunk";
import { extractText, type ExtractProgress } from "@/lib/extractText";
import { validateFile } from "@/lib/validateFile";
import { useDocumentStore } from "@/store/useDocumentStore";

export function DocumentUploader() {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<ExtractProgress | null>(null);
  const [loadingExample, setLoadingExample] = useState(false);
  const currentRun = useRef(0);
  const file = useDocumentStore((s) => s.file);
  const status = useDocumentStore((s) => s.status);
  const error = useDocumentStore((s) => s.error);
  const text = useDocumentStore((s) => s.text);
  const pages = useDocumentStore((s) => s.pages);
  const setFile = useDocumentStore((s) => s.setFile);
  const startReading = useDocumentStore((s) => s.startReading);
  const setReady = useDocumentStore((s) => s.setReady);
  const setError = useDocumentStore((s) => s.setError);
  const reset = useDocumentStore((s) => s.reset);

  async function handleFile(candidate: File | undefined) {
    if (!candidate) return;
    const run = ++currentRun.current;
    const message = validateFile(candidate);
    if (message) {
      setError(message);
      return;
    }
    setFile(candidate);
    startReading();
    setProgress(null);
    try {
      const result = await extractText(candidate, (p) => {
        if (run === currentRun.current) setProgress(p);
      });
      if (run !== currentRun.current) return;
      setReady({ text: result.text, pages: result.pages, chunks: chunkPages(result.pages) });
    } catch (e) {
      if (run !== currentRun.current) return;
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    } finally {
      if (run === currentRun.current) setProgress(null);
    }
  }

  async function handleExample() {
    setLoadingExample(true);
    try {
      const response = await fetch("/ejemplo.txt");
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const content = await response.text();
      // Mismo flujo que una carga normal: validación, extracción y fragmentos.
      await handleFile(new File([content], "ejemplo.txt", { type: "text/plain" }));
    } catch {
      setError("No se pudo cargar el documento de ejemplo. Inténtalo de nuevo.");
    } finally {
      setLoadingExample(false);
    }
  }

  function handleRemove() {
    currentRun.current++;
    setProgress(null);
    reset();
  }

  if (status === "ready" && file) {
    const isPdf = file.type === "application/pdf";
    return (
      <DocumentSummary
        name={file.name}
        pages={isPdf ? pages.length : null}
        characters={text.length}
        onRemove={handleRemove}
      />
    );
  }

  if (status === "reading" && file) {
    return (
      <Card className="flex flex-col gap-1" aria-busy="true">
        <span className="break-all font-medium">{file.name}</span>
        <p role="status" className="text-sm text-neutral-600 dark:text-neutral-400">
          {progress
            ? `Leyendo página ${progress.current} de ${progress.total}`
            : "Leyendo documento…"}
        </p>
      </Card>
    );
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files[0]);
  }

  return (
    <Card className="flex flex-col gap-3">
      <input
        id={inputId}
        type="file"
        accept="application/pdf,text/plain,.pdf,.txt"
        className="peer sr-only"
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        onChange={handleChange}
      />
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-6 text-center text-sm",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-600",
          isDragging
            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950"
            : "border-neutral-300 dark:border-neutral-700",
        )}
      >
        <span className="font-medium">
          Arrastra tu documento aquí o haz clic para seleccionarlo
        </span>
        <span className="text-neutral-600 dark:text-neutral-400">
          PDF o TXT, máximo 5 MB
        </span>
      </label>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <div>
        <Button variant="secondary" loading={loadingExample} onClick={() => void handleExample()}>
          Probar con un documento de ejemplo
        </Button>
      </div>
    </Card>
  );
}
