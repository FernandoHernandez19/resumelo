import { Badge, Card } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Resúmelo</h1>
          <Badge>Fase 1</Badge>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400">
          Sube un documento, haz preguntas y obtén respuestas con citas del texto.
        </p>
      </header>
      <Card>
        <p className="text-sm">Aquí podrás cargar tu documento.</p>
      </Card>
    </main>
  );
}
