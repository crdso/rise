import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LOGS = [
  { icon: "🤖", actor: "Assistente", action: "adicionou um gasto", detail: "R$ 38,00 · Alimentação · Nubank", time: "12:31", origin: "ai" },
  { icon: "💳", actor: "Você", action: "editou uma transação", detail: "R$ 32,00 → R$ 38,00", time: "12:34", origin: "web" },
  { icon: "📅", actor: "Você", action: "criou um evento", detail: "Prova de Química", time: "14:20", origin: "web" },
  { icon: "⚙️", actor: "Sistema", action: "arquivou uma atividade automaticamente", detail: "23:59", time: "23:59", origin: "system" },
];

export default function AuditoriaPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
      <div className="flex gap-2 flex-wrap">
        {["Tudo", "Finanças", "Calendário", "Escola", "IA", "Sistema", "Configurações"].map((f) => (
          <Badge key={f} className="cursor-pointer">{f}</Badge>
        ))}
      </div>
      <div className="space-y-3">
        {LOGS.map((l, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex gap-3">
              <span className="text-lg">{l.icon}</span>
              <div className="flex-1">
                <p className="text-sm"><span className="font-semibold">{l.actor}</span> <span className="text-[var(--muted-foreground)]">{l.action}</span></p>
                <p className="text-sm text-[var(--muted-foreground)]">{l.detail}</p>
              </div>
              <span className="text-xs text-[var(--faint)]">{l.time} · {l.origin}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-[var(--faint)]">Imutável: criação apenas via server actions. Sem edição/exclusão pela UI.</p>
    </div>
  );
}
