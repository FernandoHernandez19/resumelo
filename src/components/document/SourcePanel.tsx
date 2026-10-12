"use client";

import { useEffect, useRef } from "react";
import { Button, Card } from "@/components/ui";
import { useDocumentStore } from "@/store/useDocumentStore";

export function SourcePanel() {
  const activeChunkId = useDocumentStore((s) => s.activeChunkId);
  const chunk = useDocumentStore((s) =>
    s.activeChunkId === null
      ? undefined
      : s.chunks.find((c) => c.id === s.activeChunkId),
  );
  const setActiveChunk = useDocumentStore((s) => s.setActiveChunk);
  const panelRef = useRef<HTMLElement | null>(null);
  const opened = chunk !== undefined;

  useEffect(() => {
    if (!opened) return;
    const opener = document.activeElement;
    const panel = panelRef.current;
    panel?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    panel?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveChunk(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Devuelve el foco a la cita que abrió el panel, si sigue en pantalla.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [opened, activeChunkId, setActiveChunk]);

  if (!chunk) return null;
  const title =
    chunk.page === null
      ? `Fuente [${chunk.id}]`
      : `Fuente [${chunk.id}] · pág. ${chunk.page}`;

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby="source-panel-title"
      className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="source-panel-title" className="font-semibold">
            {title}
          </h2>
          <Button variant="secondary" onClick={() => setActiveChunk(null)}>
            Cerrar
          </Button>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-neutral-700 dark:text-neutral-300">
          {chunk.text}
        </p>
      </Card>
    </section>
  );
}
