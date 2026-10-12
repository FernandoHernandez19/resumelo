"use client";

import { useId, useState, type ChangeEvent, type DragEvent } from "react";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { validateFile } from "@/lib/validateFile";
import { useDocumentStore } from "@/store/useDocumentStore";

export function DocumentUploader() {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [isDragging, setIsDragging] = useState(false);
  const file = useDocumentStore((s) => s.file);
  const error = useDocumentStore((s) => s.error);
  const setFile = useDocumentStore((s) => s.setFile);
  const setError = useDocumentStore((s) => s.setError);

  function handleFile(candidate: File | undefined) {
    if (!candidate) return;
    const message = validateFile(candidate);
    if (message) {
      setError(message);
      return;
    }
    setFile(candidate);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
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
      {file && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <Badge>Archivo</Badge>
          <span className="break-all">{file.name}</span>
        </p>
      )}
    </Card>
  );
}
