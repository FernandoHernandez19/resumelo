import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resúmelo",
  description:
    "Sube un PDF o TXT, haz preguntas y obtén respuestas con citas del documento.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
