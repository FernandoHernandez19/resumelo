import { ChatPanel } from "@/components/chat/ChatPanel";
import { SourcePanel } from "@/components/document/SourcePanel";
import { ChunkPreview } from "@/components/document/ChunkPreview";
import { DocumentUploader } from "@/components/document/DocumentUploader";
import { PrivacyNotice } from "@/components/document/PrivacyNotice";
import { Badge } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Resúmelo</h1>
          <Badge>Demo</Badge>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400">
          Sube un PDF o TXT, haz preguntas y obtén respuestas con citas del documento.
        </p>
      </header>
      <DocumentUploader />
      <PrivacyNotice />
      <ChunkPreview />
      <ChatPanel />
      <SourcePanel />
    </main>
  );
}
