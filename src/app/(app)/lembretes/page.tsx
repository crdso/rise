import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/rise/EmptyState";
import { Button } from "@/components/ui/button";

export default function LembretesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Lembretes</h1>
      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Pendentes</CardTitle><Button size="sm">Novo lembrete</Button></CardHeader>
        <CardContent><EmptyState title="Tudo em dia" desc="Nenhum lembrete pendente. Crie um com horário, prioridade ou recorrência." /></CardContent>
      </Card>
    </div>
  );
}
