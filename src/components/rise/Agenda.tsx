// (componente legado — substituído pelos widgets do painel; marcado para remoção)
import { GraduationCap, CalendarDays, Bell } from "lucide-react";

const kindIcon = { school: GraduationCap, event: CalendarDays, reminder: Bell };

export function AgendaItem({ time, title, meta, kind }: { time: string; title: string; meta: string; kind: "school" | "event" | "reminder" }) {
  const Icon = kindIcon[kind];
  return (
    <div className="flex gap-3 py-3.5 group">
      <div className="w-[52px] shrink-0 text-right">
        <p className="text-xs font-semibold tracking-tight">{time}</p>
        <p className="text-[11px] text-[var(--faint)]">{kind === "school" ? "Escola" : kind === "reminder" ? "Lembrete" : "Evento"}</p>
      </div>
      <div className="flex-1 flex gap-3 rounded-xl border border-transparent group-hover:border-[var(--border)] group-hover:bg-[var(--card-soft)] px-3 py-2 -my-2 transition-colors">
        <div className="h-8 w-8 rounded-lg bg-[var(--card)] border border-[var(--border)] grid place-items-center text-[var(--accent)] shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{title}</p>
          <p className="text-xs text-[var(--muted-foreground)] truncate">{meta}</p>
        </div>
      </div>
    </div>
  );
}

export function AgendaList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-[var(--border)]">{children}</div>;
}
