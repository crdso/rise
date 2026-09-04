import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/rise/EmptyState";

export default function EscolaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Escola</h1>
          <p className="text-sm text-[var(--muted-foreground)]">3º ano · Ensino Médio — arquiva automaticamente em 15/12/2026</p>
        </div>
        <Badge>Ativo</Badge>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Card><CardContent className="p-5"><p className="text-xs text-[var(--faint)]">Não iniciado</p><p className="text-xl font-bold">3</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-[var(--faint)]">Em andamento</p><p className="text-xl font-bold">2</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-[var(--faint)]">Concluído</p><p className="text-xl font-bold">12</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Atividades</CardTitle></CardHeader>
        <CardContent><EmptyState title="Workspace pronto" desc="Adicione disciplinas e atividades. Em 15/12/2026 o workspace será arquivado em ‘Arquivados’ sem apagar dados." /></CardContent>
      </Card>
    </div>
  );
}
