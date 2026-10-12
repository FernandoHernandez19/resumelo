import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPanel } from "./ChatPanel";
import { SourcePanel } from "@/components/document/SourcePanel";
import { useChatStore } from "@/store/useChatStore";
import { useDocumentStore } from "@/store/useDocumentStore";
import type { Chunk } from "@/types/document";

function setReady(chunks: Chunk[]) {
  useDocumentStore.getState().setReady({ text: "t", pages: [{ page: 1, text: "t" }], chunks });
}

function renderApp() {
  render(
    <>
      <ChatPanel />
      <SourcePanel />
    </>,
  );
}

const many = (n: number, size = 100): Chunk[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, page: i + 1, text: "x".repeat(size) }));

beforeEach(() => {
  useDocumentStore.getState().reset();
  useChatStore.getState().clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("citas clicables y panel de fuente", () => {
  const chunks: Chunk[] = [
    { id: 1, page: 2, text: "Primer fragmento del documento." },
    { id: 2, page: 4, text: "Segundo fragmento con el dato." },
    { id: 3, page: null, text: "Tercero sin página." },
  ];

  async function ask() {
    setReady(chunks);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("El dato está aquí [2] y también [3].")),
    );
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByLabelText("Tu pregunta"), "¿Dónde?");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));
    return user;
  }

  it("abre el panel con el texto y la página de la cita", async () => {
    const user = await ask();
    await user.click(await screen.findByRole("button", { name: "Ver fuente 2, página 4" }));

    const panel = screen.getByRole("region", { name: "Fuente [2] · pág. 4" });
    expect(panel).toHaveTextContent("Segundo fragmento con el dato.");
    expect(panel).toHaveFocus();
  });

  it("omite la página cuando es null", async () => {
    const user = await ask();
    await user.click(await screen.findByRole("button", { name: "Ver fuente 3" }));
    expect(screen.getByRole("region", { name: "Fuente [3]" })).toHaveTextContent("Tercero sin página.");
  });

  it("cierra con Escape y devuelve el foco a la cita", async () => {
    const user = await ask();
    const citation = await screen.findByRole("button", { name: "Ver fuente 2, página 4" });
    await user.click(citation);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: /Fuente/ })).not.toBeInTheDocument();
    expect(citation).toHaveFocus();
  });

  it("cierra con el botón «Cerrar»", async () => {
    const user = await ask();
    await user.click(await screen.findByRole("button", { name: "Ver fuente 2, página 4" }));
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("region", { name: /Fuente/ })).not.toBeInTheDocument();
  });

  it("no muestra el panel si el fragmento ya no existe", () => {
    setReady(chunks);
    useDocumentStore.getState().setActiveChunk(99);
    renderApp();
    expect(screen.queryByRole("region", { name: /Fuente/ })).not.toBeInTheDocument();
  });

  it("no convierte en botones las citas del texto del usuario", async () => {
    setReady(chunks);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByLabelText("Tu pregunta"), "¿Qué dice [[1]?");
    await user.click(screen.getByRole("button", { name: "Preguntar" }));
    await screen.findByText("ok");
    expect(screen.getByText("¿Qué dice [1]?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ver fuente/ })).not.toBeInTheDocument();
  });
});

describe("Resumir documento", () => {
  it("muestra la nota cuando el resumen usa una muestra", async () => {
    setReady(many(20));
    const fetchMock = vi.fn().mockResolvedValue(new Response("- Resumen [1]"));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Resumir documento" }));

    expect(await screen.findByText("Resumen basado en 8 de 20 fragmentos del documento")).toBeInTheDocument();
    expect(screen.getByText("Resume el documento")).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.task).toBe("summary");
    expect(body.chunks).toHaveLength(8);
    expect(body.chunks[0].id).toBe(1);
    expect(body.chunks[7].id).toBe(20);
  });

  it("no muestra nota si el documento cabe entero", async () => {
    setReady(many(3));
    const fetchMock = vi.fn().mockResolvedValue(new Response("- Resumen"));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Resumir documento" }));
    await screen.findByText("- Resumen");
    await waitFor(() => expect(screen.queryByText("Escribiendo…")).not.toBeInTheDocument());
    expect(screen.queryByText(/Resumen basado en/)).not.toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).chunks).toHaveLength(3);
  });

  it("está deshabilitado sin documento listo", () => {
    renderApp();
    expect(screen.getByRole("button", { name: "Resumir documento" })).toBeDisabled();
  });

  it("permite reintentar un resumen fallido", async () => {
    setReady(many(3));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(new Response("- Listo"));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: "Resumir documento" }));
    await user.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("- Listo")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).task).toBe("summary");
  });
});
