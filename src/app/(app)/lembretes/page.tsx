"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Check, RotateCcw, Archive, Pencil, Repeat, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/rise/EmptyState";
import { ReminderDialog } from "@/components/rise/ReminderDialog";
import { useToast } from "@/components/ui/toast";
import { reminderService } from "@/lib/services/reminderService";
import {
  useReminderStore,
  groupReminders,
  reminderViewStatus,
  type ReminderBucket,
} from "@/lib/store/reminderStore";
import { saoPauloTodayKey, saoPauloDateKey, formatDateKey } from "@/lib/timezone";
import type { Reminder, ReminderInput } from "@/types/reminder";
import { PRIORITY_COLOR, PRIORITY_LABEL, RECURRENCE_LABEL } from "@/types/reminder";

const TABS: Array<{ id: ReminderBucket; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "upcoming", label: "Próximos" },
  { id: "undated", label: "Sem data" },
  { id: "done", label: "Concluídos" },
  { id: "archived", label: "Arquivados" },
];

function formatDue(iso: string, todayKey: string) {
  const key = saoPauloDateKey(iso);
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
  if (key === todayKey) return `Hoje · ${time}`;
  return `${formatDateKey(key, { day: "2-digit", month: "short" })} · ${time}`;
}

export default function LembretesPage() {
  const { reminders } = useReminderStore();
  const { push } = useToast();
  const [tab, setTab] = useState<ReminderBucket>("today");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Como "atrasado" é derivado da passagem do tempo, revalidamos de minuto em minuto.
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const todayKey = saoPauloTodayKey();
  const groups = useMemo(() => groupReminders(reminders, todayKey), [reminders, todayKey]);
  const visible = groups[tab];

  const overdueCount = useMemo(
    () => groups.today.filter((r) => reminderViewStatus(r) === "overdue").length,
    [groups.today]
  );

  const handleSave = async (data: ReminderInput) => {
    try {
      if (editing) await reminderService.update(editing.id, data);
      else await reminderService.create(data);
      push({ title: editing ? "Lembrete atualizado" : "Lembrete criado" });
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" });
      throw e; // mantém o dialog aberto com os dados preenchidos
    }
  };

  const runAction = async (id: string, action: "complete" | "reopen" | "archive", okTitle: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await reminderService[action](id);
      push({ title: okTitle });
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const emptyCopy: Record<ReminderBucket, { title: string; desc: string }> = {
    today: { title: "Tudo em dia", desc: "Nenhum lembrete para hoje. Crie um com horário, prioridade ou recorrência." },
    upcoming: { title: "Nada à frente", desc: "Nenhum lembrete agendado para os próximos dias." },
    undated: { title: "Sem pendências soltas", desc: "Lembretes sem data aparecem aqui." },
    done: { title: "Nada concluído ainda", desc: "Os lembretes que você concluir ficam registrados aqui." },
    archived: { title: "Nenhum arquivado", desc: "Arquivar é a forma de tirar um lembrete da lista sem apagar o histórico." },
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Lembretes</h1>
          {overdueCount > 0 && (
            <p className="text-xs text-[var(--negative)] mt-1">
              {overdueCount} {overdueCount === 1 ? "atrasado" : "atrasados"}
            </p>
          )}
        </div>
        <Button
          size="sm"
          className="rounded-full"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Lembrete
        </Button>
      </div>

      {/* Filtros: roláveis no mobile, sem quebrar o layout */}
      <div className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto">
        <div className="inline-flex gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--card)] min-w-max">
          {TABS.map((t) => {
            const count = groups[t.id].length;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${tab === t.id ? "bg-[var(--accent)] text-white" : "text-[var(--muted-foreground)]"}`}
              >
                {t.label}
                {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={emptyCopy[tab].title}
          desc={emptyCopy[tab].desc}
          action={
            tab === "today" || tab === "upcoming" || tab === "undated" ? (
              <Button size="sm" variant="soft" className="rounded-full" onClick={() => { setEditing(null); setOpen(true); }}>
                <Plus className="h-3.5 w-3.5" /> Criar lembrete
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden">
          {visible.map((r) => {
            const status = reminderViewStatus(r);
            const isOverdue = status === "overdue";
            const isHistory = !!r.parent_id;
            const busy = busyId === r.id;
            return (
              <div key={r.id} className="p-4 flex gap-3 items-start">
                {/* prioridade discreta */}
                <span
                  className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                  style={{ background: PRIORITY_COLOR[r.priority] }}
                  title={`Prioridade ${PRIORITY_LABEL[r.priority].toLowerCase()}`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium leading-tight break-words ${r.status === "done" ? "line-through text-[var(--muted-foreground)]" : ""}`}>
                    {r.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted-foreground)]">
                    {r.due_at ? (
                      <span className={isOverdue ? "text-[var(--negative)] font-medium" : ""}>
                        <CalendarClock className="inline h-3 w-3 mr-1 -mt-0.5" />
                        {formatDue(r.due_at, todayKey)}
                        {isOverdue ? " · atrasado" : ""}
                      </span>
                    ) : (
                      <span>Sem data</span>
                    )}
                    {r.recurrence && (
                      <span className="inline-flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {RECURRENCE_LABEL[r.recurrence]}
                      </span>
                    )}
                    {isHistory && <span className="opacity-70">ocorrência concluída</span>}
                  </div>
                  {r.notes && <p className="mt-1 text-xs text-[var(--muted-foreground)] break-words">{r.notes}</p>}
                </div>

                <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                  {r.status === "pending" && (
                    <Button size="sm" variant="soft" className="rounded-full h-8 px-3" disabled={busy} onClick={() => runAction(r.id, "complete", "Lembrete concluído")}>
                      <Check className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Concluir</span>
                    </Button>
                  )}
                  {r.status !== "pending" && !isHistory && (
                    <Button size="sm" variant="ghost" className="rounded-full h-8 px-3" disabled={busy} onClick={() => runAction(r.id, "reopen", "Lembrete reaberto")}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Reabrir</span>
                    </Button>
                  )}
                  {!isHistory && (
                    <Button size="sm" variant="ghost" className="rounded-full h-8 px-3" disabled={busy} onClick={() => { setEditing(r); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="sr-only">Editar</span>
                    </Button>
                  )}
                  {r.status !== "archived" && (
                    <Button size="sm" variant="ghost" className="rounded-full h-8 px-3" disabled={busy} onClick={() => runAction(r.id, "archive", "Lembrete arquivado")}>
                      <Archive className="h-3.5 w-3.5" />
                      <span className="sr-only">Arquivar</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReminderDialog open={open} onClose={() => { setOpen(false); setEditing(null); }} onSave={handleSave} initial={editing} />
    </div>
  );
}
