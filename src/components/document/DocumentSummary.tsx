import { Badge, Button, Card } from "@/components/ui";

interface DocumentSummaryProps {
  name: string;
  pages: number | null;
  characters: number;
  onRemove: () => void;
}

export function DocumentSummary({
  name,
  pages,
  characters,
  onRemove,
}: DocumentSummaryProps) {
  const format = new Intl.NumberFormat("es");
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="success">Listo</Badge>
        <span className="break-all font-medium">{name}</span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {pages !== null && (
          <div>
            <dt className="text-neutral-600 dark:text-neutral-400">Páginas</dt>
            <dd className="font-medium">{format.format(pages)}</dd>
          </div>
        )}
        <div>
          <dt className="text-neutral-600 dark:text-neutral-400">Caracteres</dt>
          <dd className="font-medium">{format.format(characters)}</dd>
        </div>
      </dl>
      <div>
        <Button variant="secondary" onClick={onRemove}>
          Quitar documento
        </Button>
      </div>
    </Card>
  );
}
