import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/rise/EmptyState";
import { Wallet, TrendingUp, Plus } from "lucide-react";

export default function FinancasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finanças</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Gastos e receitas — fonte da verdade são as transações.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm"><Plus className="h-4 w-4" /> Gasto</Button>
          <Button size="sm" variant="soft"><TrendingUp className="h-4 w-4" /> Receita</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-[var(--faint)]">Gasto mês</p><p className="text-xl font-bold mt-1">R$ 2.483,72</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-[var(--faint)]">Receita mês</p><p className="text-xl font-bold mt-1">R$ 3.200,00</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-[var(--faint)]">Saldo</p><p className="text-xl font-bold mt-1 text-[var(--accent)]">+ R$ 716,28</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Transações</CardTitle><Button variant="ghost" size="sm">Filtros</Button></CardHeader>
        <CardContent>
          <EmptyState title="Sem transações ainda" desc="Comece adicionando um gasto ou receita. Você também pode usar ✨ Adicionar com IA." action={<Button size="sm"><Wallet className="h-4 w-4" /> Adicionar gasto</Button>} />
        </CardContent>
      </Card>
    </div>
  );
}
