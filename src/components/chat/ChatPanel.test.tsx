import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";
import { useChatStore } from "@/store/useChatStore";
import { useDocumentStore } from "@/store/useDocumentStore";

const encoder = new TextEncoder();

interface Controlled {
  push: (text: string) => void;
  close: () => void;
  response: Response;
}

/** Respuesta cuyo stream se controla a mano y respeta el AbortSignal. */
function controlledResponse(signal?: AbortSignal | null): Controlled {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      signal?.addEventListener("abort", () =>
        c.error(new DOMException("Aborted", "AbortError")),
      );
    },
  });
  return {
    push: (text) => controller.enqueue(encoder.encode(text)),
    close: () => controller.close(),
    response: new Response(body),
  };
}

function setReady() {
  useDocumentStore.getState().setReady({
    text: "Contenido",
    pages: [{ page: 1, text: "Contenido" }],
    chunks: [{ id: 1, page: 1, text: "Contenido del documento" }],
  });
}

beforeEach(() => {
  useDocumentStore.getState().reset();
  useChatStore.getState().clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("ChatPanel", () => {
  it("deshabilita la pregunta si no hay documento listo", () => {
    render(<ChatPanel />);
    expect(screen.getByLabelText("Tu pregunta")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Preguntar" })).toBeDisabled();
  });

  it("muestra «Escribiendo…», acumula el texto y termina", async () => {
    setReady();
    let current!: Controlled;
    vi.stubGlobal(
      "fetch",
      vi.fn((_u: string, init: RequestInit) => {
        current = controlledResponse(init.signal);
        return Promise.resolve(current.response);
      }),
    );
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.type(screen.getByLabelText("Tu pregunta"), "¿Qué dice?");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));

    expect(await screen.findByText("Escribiendo…")).toBeInTheDocument();
    await act(async () => current.push("Dice "));
    await act(async () => current.push("hola [1]"));
    expect(await screen.findByText("Dice hola [1]")).toBeInTheDocument();

    await act(async () => current.close());
    await waitFor(() => expect(screen.queryByText("Escribiendo…")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Conversación")).toHaveAttribute("aria-live", "polite");
  });

  it("«Detener» corta la respuesta y conserva el texto recibido", async () => {
    setReady();
    let current!: Controlled;
    vi.stubGlobal(
      "fetch",
      vi.fn((_u: string, init: RequestInit) => {
        current = controlledResponse(init.signal);
        return Promise.resolve(current.response);
      }),
    );
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.type(screen.getByLabelText("Tu pregunta"), "hola");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));
    await screen.findByText("Escribiendo…");
    await act(async () => current.push("Texto parcial"));
    await screen.findByText("Texto parcial");

    await user.click(screen.getByRole("button", { name: "Detener" }));

    expect(await screen.findByText("Respuesta detenida.")).toBeInTheDocument();
    expect(screen.getByText("Texto parcial")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Detener" })).not.toBeInTheDocument();
  });

  it("muestra el error de cuota y permite reintentar", async () => {
    setReady();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockImplementationOnce(() => {
        const ok = controlledResponse();
        ok.push("Ya funciona");
        ok.close();
        return Promise.resolve(ok.response);
      });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<ChatPanel />);

    await user.type(screen.getByLabelText("Tu pregunta"), "hola");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El servicio está ocupado, intenta en unos segundos.",
    );

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Ya funciona")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("muestra el mensaje de sin conexión", async () => {
    setReady();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = userEvent.setup();
    render(<ChatPanel />);
    await user.type(screen.getByLabelText("Tu pregunta"), "hola");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/No hay conexión/);
  });
});
