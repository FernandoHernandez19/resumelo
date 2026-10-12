"use client";

import { useMemo } from "react";
import { splitCitations } from "@/lib/citations";
import { useDocumentStore } from "@/store/useDocumentStore";

export function AssistantText({ text }: { text: string }) {
  const chunks = useDocumentStore((s) => s.chunks);
  const setActiveChunk = useDocumentStore((s) => s.setActiveChunk);

  const segments = useMemo(
    () => splitCitations(text, chunks.map((chunk) => chunk.id)),
    [text, chunks],
  );

  return (
    <p className="whitespace-pre-wrap break-words">
      {segments.map((segment, index) => {
        if (segment.type === "text") return segment.value;
        const page = chunks.find((chunk) => chunk.id === segment.id)?.page ?? null;
        const label =
          page === null
            ? `Ver fuente ${segment.id}`
            : `Ver fuente ${segment.id}, página ${page}`;
        return (
          <button
            key={`${index}-${segment.id}`}
            type="button"
            aria-label={label}
            onClick={() => setActiveChunk(segment.id)}
            className="mx-0.5 rounded bg-indigo-100 px-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-200 dark:hover:bg-indigo-900"
          >
            [{segment.id}]
          </button>
        );
      })}
    </p>
  );
}
