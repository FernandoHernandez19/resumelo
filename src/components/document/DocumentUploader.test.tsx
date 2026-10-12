import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChunkPreview } from "./ChunkPreview";
import { DocumentUploader } from "./DocumentUploader";
import { NO_TEXT_ERROR } from "@/lib/extractText";
import { FILE_ERRORS, MAX_FILE_SIZE_BYTES } from "@/lib/validateFile";
import { useDocumentStore } from "@/store/useDocumentStore";

const pdfPages = vi.hoisted(() => ({ value: [] as string[] }));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => {
    const promise = Promise.resolve({
      numPages: pdfPages.value.length,
      getPage: async (n: number) => ({
        getTextContent: async () => ({
          items: [{ str: pdfPages.value[n - 1], hasEOL: false }],
        }),
        cleanup: () => undefined,
      }),
    });
    return { promise, destroy: async () => undefined };
  },
}));

const user = userEvent.setup({ applyAccept: false });

function renderApp() {
  render(
    <>
      <DocumentUploader />
      <ChunkPreview />
    </>,
  );
}

const upload = (file: File) =>
  user.upload(screen.getByLabelText(/arrastra tu documento/i), file);

describe("DocumentUploader", () => {
  beforeEach(() => {
    useDocumentStore.getState().reset();
    pdfPages.value = [];
  });

  it("muestra el error de tipo no permitido asociado al campo", async () => {
    renderApp();
    await upload(new File(["x"], "foto.png", { type: "image/png" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(FILE_ERRORS.type);
    expect(screen.getByLabelText(/arrastra tu documento/i)).toHaveAttribute(
      "aria-describedby",
      alert.id,
    );
  });

  it("muestra el error de archivo muy grande", async () => {
    renderApp();
    await upload(
      new File([new Uint8Array(MAX_FILE_SIZE_BYTES + 1)], "a.pdf", {
        type: "application/pdf",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(FILE_ERRORS.size);
  });

  it("muestra el error de archivo vacío", async () => {
    renderApp();
    await upload(new File([], "vacio.txt", { type: "text/plain" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(FILE_ERRORS.empty);
  });

  it("lee un TXT y muestra nombre, caracteres y fragmentos", async () => {
    renderApp();
    await upload(new File(["Hola mundo desde Resúmelo"], "nota.txt", { type: "text/plain" }));
    expect(await screen.findByText("nota.txt")).toBeInTheDocument();
    expect(screen.getByText("Listo")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.queryByText("Páginas")).not.toBeInTheDocument();
  });

  it("lee un PDF simulado y muestra páginas y vista previa colapsable", async () => {
    pdfPages.value = ["Primera página", "Segunda página"];
    renderApp();
    await upload(new File(["%PDF"], "informe.pdf", { type: "application/pdf" }));
    expect(await screen.findByText("informe.pdf")).toBeInTheDocument();
    expect(screen.getByText("Páginas").nextSibling).toHaveTextContent("2");

    const toggle = screen.getByRole("button", { name: /mostrar vista previa/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Fragmento \[2\] · pág\. 2/)).toBeVisible();
  });

  it("avisa cuando el PDF no tiene texto seleccionable", async () => {
    pdfPages.value = ["   ", ""];
    renderApp();
    await upload(new File(["%PDF"], "escaneo.pdf", { type: "application/pdf" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(NO_TEXT_ERROR);
  });

  it("quita el documento y limpia el estado", async () => {
    renderApp();
    await upload(new File(["contenido"], "a.txt", { type: "text/plain" }));
    await user.click(await screen.findByRole("button", { name: "Quitar documento" }));
    expect(useDocumentStore.getState()).toMatchObject({
      file: null,
      status: "idle",
      text: "",
      chunks: [],
    });
    expect(screen.getByLabelText(/arrastra tu documento/i)).toBeInTheDocument();
  });
});
