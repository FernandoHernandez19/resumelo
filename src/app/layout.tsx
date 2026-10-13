import type { Metadata } from "next";
import "./globals.css";

const description =
  "Sube un PDF o TXT, haz preguntas y obtén respuestas con citas del documento.";

export const metadata: Metadata = {
  metadataBase: new URL("https://resumelo-eta.vercel.app"),
  title: {
    default: "Resúmelo",
    template: "%s · Resúmelo",
  },
  description,
  openGraph: {
    title: "Resúmelo",
    description,
    type: "website",
    locale: "es_PE",
  },
  twitter: {
    card: "summary",
    title: "Resúmelo",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
