"use client";

import { useId, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { useDocumentStore } from "@/store/useDocumentStore";

const PREVIEW_COUNT = 5;

export function ChunkPreview() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const chunks = useDocumentStore((s) => s.chunks);

  if (chunks.length === 0) return null;
  const visible = chunks.slice(0, PREVIEW_COUNT);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Fragmentos</h2>
          <Badge>{chunks.length}</Badge>
        </div>
        <Button
          variant="ghost"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Ocultar vista previa" : "Mostrar vista previa"}
        </Button>
      </div>
      <div id={panelId} hidden={!open}>
        <ol className="flex flex-col gap-3">
          {visible.map((chunk) => (
            <li key={chunk.id} className="flex flex-col gap-1 text-sm">
              <span className="font-medium">
                Fragmento [{chunk.id}]
                {chunk.page !== null && ` · pág. ${chunk.page}`}
              </span>
              <p className="line-clamp-4 break-words text-neutral-600 dark:text-neutral-400">
                {chunk.text}
              </p>
            </li>
          ))}
        </ol>
        {chunks.length > PREVIEW_COUNT && (
          <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
            Mostrando {PREVIEW_COUNT} de {chunks.length} fragmentos.
          </p>
        )}
      </div>
    </Card>
  );
}
