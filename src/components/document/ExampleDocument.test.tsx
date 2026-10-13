import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentUploader } from "./DocumentUploader";
import { PrivacyNotice } from "./PrivacyNotice";
import { useDocumentStore } from "@/store/useDocumentStore";

beforeEach(() => useDocumentStore.getState().reset());
afterEach(() => vi.unstubAllGlobals());

const exampleButton = () =>
  screen.getByRole("button", { name: "Probar con un documento de ejemplo" });

describe("documento de ejemplo", () => {
  it("lo carga por el flujo normal y deja el documento listo", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("Guía breve para estudiar mejor.\n\nPlanificar ayuda."));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DocumentUploader />);

    await user.click(exampleButton());

    expect(await screen.findByText("ejemplo.txt")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/ejemplo.txt");
    const state = useDocumentStore.getState();
    expect(state.status).toBe("ready");
    expect(state.file?.name).toBe("ejemplo.txt");
    expect(state.chunks.length).toBeGreaterThan(0);
    expect(state.text).toContain("Planificar ayuda");
  });

  it("muestra un error amigable si el fetch falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = userEvent.setup();
    render(<DocumentUploader />);

    await user.click(exampleButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cargar el documento de ejemplo. Inténtalo de nuevo.",
    );
    expect(useDocumentStore.getState().status).toBe("error");
  });

  it("muestra un error amigable si el servidor responde con error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 404 })));
    const user = userEvent.setup();
    render(<DocumentUploader />);
    await user.click(exampleButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(/documento de ejemplo/);
  });
});

describe("aviso de privacidad", () => {
  it("explica qué se envía y qué no", () => {
    render(<PrivacyNotice />);
    const notice = screen.getByTestId("privacy-notice");
    expect(notice).toHaveTextContent("se lee en tu navegador");
    expect(notice).toHaveTextContent("solo se envían tu pregunta y los fragmentos relevantes a Gemini");
    expect(notice).toHaveTextContent("no guarda nada");
  });
});
