"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AssistantText } from "@/components/chat/AssistantText";
import { Button, Card, Input } from "@/components/ui";
import { getFriendlyError, streamChat } from "@/lib/chatClient";
import { MAX_QUESTION_LENGTH } from "@/lib/chatLimits";
import { retrieveChunks } from "@/lib/retrieve";
import { useChatStore, type ChatMessage } from "@/store/useChatStore";
import { useDocumentStore } from "@/store/useDocumentStore";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function ChatPanel() {
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const status = useDocumentStore((s) => s.status);
  const chunks = useDocumentStore((s) => s.chunks);
  const messages = useChatStore((s) => s.messages);
  const { addMessage, appendToMessage, updateMessage, clear } = useChatStore.getState();

  const ready = status === "ready" && chunks.length > 0;

  // Al quitar o cambiar el documento se cancela la respuesta y se limpia el chat.
  useEffect(() => {
    if (!ready) {
      controllerRef.current?.abort();
      clear();
    }
  }, [ready, clear]);

  async function run(assistantId: string, text: string) {
    const controller = new AbortController();
    controllerRef.current = controller;
    setStreaming(true);
    try {
      await streamChat({
        question: text,
        chunks: retrieveChunks(text, chunks),
        signal: controller.signal,
        onText: (piece) => appendToMessage(assistantId, piece),
      });
      updateMessage(assistantId, { status: "done" });
    } catch (error) {
      if (isAbortError(error)) {
        updateMessage(assistantId, { status: "stopped" });
      } else {
        updateMessage(assistantId, {
          status: "error",
          error: getFriendlyError(error),
        });
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setStreaming(false);
    }
  }

  function handleRetry(assistantId: string) {
    if (streaming || !ready) return;
    const list = useChatStore.getState().messages;
    const index = list.findIndex((m) => m.id === assistantId);
    const asked = list[index - 1];
    if (!asked || asked.role !== "user") return;
    updateMessage(assistantId, { content: "", status: "streaming", error: undefined });
    void run(assistantId, asked.content);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = question.trim();
    if (!text || !ready || streaming) return;
    setQuestion("");
    addMessage({ role: "user", content: text, status: "done" });
    const assistantId = addMessage({
      role: "assistant",
      content: "",
      status: "streaming",
    });
    void run(assistantId, text);
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-semibold">Pregunta sobre tu documento</h2>

      <div
        aria-live="polite"
        aria-label="Conversación"
        className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto"
      >
        {messages.length === 0 && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {ready
              ? "Escribe una pregunta y te responderé con citas del documento."
              : "Carga un documento para empezar a preguntar."}
          </p>
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            canRetry={!streaming && message.id === messages[messages.length - 1]?.id}
            onRetry={() => handleRetry(message.id)}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Tu pregunta"
          value={question}
          maxLength={MAX_QUESTION_LENGTH}
          disabled={!ready}
          onChange={(e) => setQuestion(e.target.value)}
          hint={ready ? undefined : "Disponible cuando el documento esté listo."}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!ready || streaming || !question.trim()}>
            Preguntar
          </Button>
          {streaming && (
            <Button variant="secondary" onClick={() => controllerRef.current?.abort()}>
              Detener
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  canRetry: boolean;
  onRetry: () => void;
}

function MessageBubble({ message, canRetry, onRetry }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <div
      className={
        isUser
          ? "self-end rounded-xl bg-indigo-600 px-3 py-2 text-sm text-white"
          : "self-start rounded-xl bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800"
      }
    >
      <span className="sr-only">{isUser ? "Tú: " : "Asistente: "}</span>
      {isUser ? (
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      ) : (
        <AssistantText text={message.content} />
      )}
      {message.status === "streaming" && (
        <p className="mt-1 text-xs italic opacity-70">Escribiendo…</p>
      )}
      {message.status === "error" && (
        <div className="mt-1 flex flex-col items-start gap-2">
          <p role="alert" className="text-red-700 dark:text-red-400">
            {message.error}
          </p>
          {canRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Reintentar
            </Button>
          )}
        </div>
      )}
      {message.status === "stopped" && (
        <p className="mt-1 text-xs italic opacity-70">Respuesta detenida.</p>
      )}
    </div>
  );
}
