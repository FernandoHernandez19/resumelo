import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Página inicial", () => {
  it("muestra el nombre y la descripción", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Resúmelo" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/haz preguntas/i)).toBeInTheDocument();
    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getByTestId("privacy-notice")).toBeInTheDocument();
  });
});
