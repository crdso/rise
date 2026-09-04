"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Check, RotateCcw, Archive, Pencil, CalendarClock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/rise/EmptyState";
import { SchoolTaskDialog } from "@/components/rise/SchoolTaskDialog";
import { useToast } from "@/components/ui/toast";
import { schoolService } from "@/lib/services/schoolService";
import { useSchoolStore, groupTasks, taskViewStatus, type SchoolBucket } from "@/lib/store/schoolStore";
import { saoPauloTodayKey, saoPauloDateKey, formatDateKey } from "@/lib/timezone";
import {
  TYPE_LABEL,
  STATUS_LABEL,
  SCHOOL_PRIORITY_COLOR,
  SCHOOL_PRIORITY_LABEL,
  type SchoolTask,
  type SchoolTaskInput,
} from "@/types/school";

const TABS: Array<{ id: SchoolBucket; label: string }> = [
  { id: "overdue", label: "Atrasadas" },
  { id: "today", label: "Hoje" },
  { id: "upcoming", label: "Próximas" },
  { id: "undated", label: "Sem data" },
  { id: "done", label: "Concluídas" },
  { id: "archived", label: "Arquivadas" },
];

function dueLabel(iso: string, todayKey: string) {
  const key = saoPauloDateKey(iso);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
  if (key === todayKey) return `Hoje · ${time}`;
  return `${formatDateKey(key, { day: "2-digit", month: "short" })} · ${time}`;
}

export default function EscolaPage() {
  const { tasks, workspace } = useSchoolStore();
  const { push } = useToast();
  const [tab, setTab] = useState<SchoolBucket>("today");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolTask | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // "atrasada" depende da passagem do tempo, não dos dados
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const todayKey = saoPauloTodayKey();
  const groups = useMemo(() => groupTasks(tasks, todayKey), [tasks, todayKey]);
  const visible = groups[tab];
  const subjects = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.subject).filter((s): s is string => !!s))).sort(),
    [tasks]
  );

  const handleSave = async (data: SchoolTaskInput) => {
    try {
      if (editing) await schoolService.update(editing.id, data);
      else await schoolService.create(data);
      push({ title: editing ? "Atividade atualizada" : "Atividade criada" });
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" });
      throw e;
    }
  };

  const run = async (id: string, fn: () => Promise<unknown>, okTitle: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await fn();
      push({ title: okTitle });
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const emptyCopy: Record<SchoolBucket, { title: string; desc: string }> = {
    overdue: { title: "Nada atrasado", desc: "Entregas vencidas apareceriam aqui." },
    today: { title: "Nada para hoje", desc: "Nenhuma entrega marcada para hoje." },
    upcoming: { title: "Nada à frente", desc: "Sem entregas agendadas." },
    undated: { title: "Sem pendências soltas", desc: "Atividades sem data aparecem aqui." },
    done: { title: "Nada concluído ainda", desc: "As atividades que você concluir ficam registradas aqui." },
    archived: { title: "Nada arquivado", desc: "Arquivar tira da lista sem apagar o histórico." },
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Escola</h1>
          <p className="text-[12.5px] text-[var(--muted-foreground)] mt-1">
            {workspace ? `${workspace.name} · ${workspace.year}` : "Ensino Médio — 3º ano · 2026"}
            {" · arquiva em 15/12/2026"}
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Atividade
        </Button>
      </div>

      {/* resumo real, contado dos dados */}
      <div className="grid grid-cols-3 gap-2.5">
        {(
          [
            { label: "A fazer", value: groups.overdue.length + groups.today.length + groups.upcoming.length + groups.undated.length },
            { label: "Atrasadas", value: groups.overdue.length },
            { label: "Concluídas", value: groups.done.length },
          ] as const
        ).map((s) => (
          <div key={s.label} className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">{s.label}</p>
            <p className={`text-[20px] font-semibold tnum mt-1 ${s.label === "Atrasadas" && s.value > 0 ? "text-[var(--negative)]" : ""}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar">
        <div className="inline-flex gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--card)] min-w-max">
          {TABS.map((t) => {
            const count = groups[t.id].length;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  tab === t.id ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted-foreground)]"
                }`}
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
            tab !== "done" && tab !== "archived" ? (
              <Button
                size="sm"
                variant="soft"
                className="rounded-full"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Nova atividade
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden">
          {visible.map((t) => {
            const status = taskViewStatus(t);
            const overdue = status === "overdue";
            const busy = busyId === t.id;
            return (
              <li key={t.id} className="p-4 flex gap-3 items-start">
                <span
                  className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                  style={{ background: SCHOOL_PRIORITY_COLOR[t.priority] }}
                  title={`Prioridade ${SCHOOL_PRIORITY_LABEL[t.priority].toLowerCase()}`}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[14px] font-medium leading-tight break-words ${
                      t.status === "done" ? "line-through text-[var(--muted-foreground)]" : ""
                    }`}
                  >
                    {t.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[var(--muted-foreground)]">
                    {t.subject && (
                      <span className="rounded-full bg-[var(--card-soft)] border border-[var(--border)] px-2 py-0.5">
                        {t.subject}
                      </span>
                    )}
                    <span>{TYPE_LABEL[t.type]}</span>
                    {t.due_at ? (
                      <span className={overdue ? "text-[var(--negative)] font-medium" : ""}>
                        <CalendarClock className="inline h-3 w-3 mr-1 -mt-0.5" />
                        {dueLabel(t.due_at, todayKey)}
                        {overdue ? " · atrasada" : ""}
                      </span>
                    ) : (
                      <span>Sem data</span>
                    )}
                    {t.status === "in_progress" && <span className="text-[var(--accent)]">{STATUS_LABEL.in_progress}</span>}
                  </div>
                  {t.description && (
                    <p className="mt-1.5 text-[12px] text-[var(--muted-foreground)] break-words">{t.description}</p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-1 shrink-0">
                  {t.status === "not_started" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full h-8 px-2.5"
                      disabled={busy}
                      onClick={() => run(t.id, () => schoolService.setStatus(t.id, "in_progress"), "Marcada em andamento")}
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span className="sr-only">Começar</span>
                    </Button>
                  )}
                  {t.status !== "done" && t.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="soft"
                      className="rounded-full h-8 px-3"
                      disabled={busy}
                      onClick={() => run(t.id, () => schoolService.setStatus(t.id, "done"), "Atividade concluída")}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Concluir</span>
                    </Button>
                  )}
                  {(t.status === "done" || t.status === "archived") && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full h-8 px-2.5"
                      disabled={busy}
                      onClick={() => run(t.id, () => schoolService.setStatus(t.id, "not_started"), "Reaberta")}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span className="sr-only">Reabrir</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full h-8 px-2.5"
                    disabled={busy}
                    onClick={() => {
                      setEditing(t);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Editar</span>
                  </Button>
                  {t.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full h-8 px-2.5"
                      disabled={busy}
                      onClick={() => run(t.id, () => schoolService.setStatus(t.id, "archived"), "Arquivada")}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span className="sr-only">Arquivar</span>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SchoolTaskDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        initial={editing}
        subjects={subjects}
      />
    </div>
  );
}
