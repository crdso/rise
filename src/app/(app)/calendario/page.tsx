import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/rise/EmptyState";

export default function CalendarioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendário</h1>
        <div className="flex gap-2">
          <Button variant="muted" size="sm">Mês</Button>
          <Button variant="ghost" size="sm">Semana</Button>
          <Button variant="ghost" size="sm">Agenda</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Setembro 2026</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <div key={d} className="py-2 font-medium text-[var(--faint)]">{d}</div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => {
              const day = i - 1;
              const isToday = i === 4;
              return (
                <div key={i} className={`aspect-square rounded-xl border p-2 text-left ${isToday ? "bg-[var(--accent)] text-white border-transparent" : "bg-[var(--card-soft)] border-[var(--border)]"}`}>
                  <span className="text-xs font-medium">{day > 0 && day <= 30 ? day : ""}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-6">
            <EmptyState title="Dia vazio" desc="Clique em um dia para ver eventos, lembretes e provas daquele dia." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
