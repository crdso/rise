"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  let start = first.getDay(); // 0 Sun
  start = start === 0 ? 6 : start - 1; // Mon 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ d: number | null; isToday: boolean }> = [];
  const today = new Date();
  for (let i = 0; i < start; i++) cells.push({ d: null, isToday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    cells.push({ d, isToday });
  }
  while (cells.length % 7 !== 0 || cells.length < 35) cells.push({ d: null, isToday: false });
  return cells.slice(0, 35);
}

export default function CalendarioPage() {
  const [cursor, setCursor] = useState(new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => getMonthGrid(year, month), [year, month]);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(cursor);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold tracking-tight capitalize">{label}</h1>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCursor(new Date())}>Hoje</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" className="rounded-full ml-2"><Plus className="h-3.5 w-3.5" /> Evento</Button>
        </div>
      </div>

      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--card-soft)]">
          {WEEK.map((w) => <div key={w} className="py-2.5 text-center text-[11px] tracking-wide font-medium text-[var(--faint)] uppercase">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 auto-rows-[96px] sm:auto-rows-[108px] divide-x divide-y divide-[var(--border)]">
          {cells.map((c, i) => (
            <div key={i} className="p-2 flex flex-col gap-1 bg-[var(--card)] hover:bg-[var(--card-soft)] transition-colors">
              {c.d ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className={`h-6 w-6 grid place-items-center rounded-full text-xs font-medium ${c.isToday ? "bg-[var(--accent)] text-white" : "text-[var(--foreground)]"}`}>{c.d}</span>
                    {c.isToday && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
                  </div>
                  <div className="space-y-1 mt-1">
                    {c.d === 5 && <div className="rounded-full bg-[var(--accent-soft)] border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium truncate text-[var(--accent)]">História · trabalho</div>}
                    {c.d === 8 && <div className="rounded-full bg-amber-500/10 border border-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium truncate">08:00 Química</div>}
                    {c.d === 12 && <div className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] truncate">Fatura Nubank</div>}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
