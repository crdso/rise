"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCalendarStore } from "@/lib/store/calendarStore";
import { calendarService } from "@/lib/services/calendarService";
import { EventDialog } from "@/components/rise/EventDialog";
import { useToast } from "@/components/ui/toast";
import { MonthGrid } from "@/components/rise/calendar/MonthGrid";
import { WeekGrid, DayTimeline, DayList, AgendaView } from "@/components/rise/calendar/WeekGrid";
import { CAT_COLOR, CAT_LABEL, eventFullTime, sortEvents } from "@/components/rise/calendar/shared";
import {
  saoPauloDateKey,
  saoPauloTodayKey,
  startOfWeekKey,
  addDaysToDateKey,
  addMonthsToDateKey,
  formatDateKey,
  relativeDayLabel,
} from "@/lib/timezone";
import type { CalendarEvent } from "@/types/calendar";

type View = "month" | "week" | "day" | "agenda";

export default function CalendarioPage() {
  const { events } = useCalendarStore();
  const { push } = useToast();

  const todayKey = saoPauloTodayKey();
  const [cursorKey, setCursorKey] = useState<string>(todayKey);
  const [selectedKey, setSelectedKey] = useState<string>(todayKey);
  const [view, setView] = useState<View>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [initialDate, setInitialDate] = useState<string | null>(null);
  const [initialTime, setInitialTime] = useState<string | null>(null);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

  const [year, month] = useMemo(() => {
    const [y, m] = cursorKey.split("-").map(Number);
    return [y, m - 1] as const;
  }, [cursorKey]);

  /** Índice por dia civil de São Paulo — única forma de agrupar por data no RISE. */
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const k = saoPauloDateKey(e.starts_at);
      (map[k] ||= []).push(e);
    }
    for (const k of Object.keys(map)) map[k].sort(sortEvents);
    return map;
  }, [events]);

  const weekKeys = useMemo(() => {
    const start = startOfWeekKey(cursorKey);
    return Array.from({ length: 7 }, (_, i) => addDaysToDateKey(start, i));
  }, [cursorKey]);

  const title = useMemo(() => {
    if (view === "agenda") return "Agenda";
    if (view === "day") return formatDateKey(cursorKey, { day: "2-digit", month: "long", year: "numeric" });
    if (view === "week") {
      const a = weekKeys[0];
      const b = weekKeys[6];
      const sameMonth = a.slice(0, 7) === b.slice(0, 7);
      return sameMonth
        ? formatDateKey(a, { month: "long", year: "numeric" })
        : `${formatDateKey(a, { day: "2-digit", month: "short" })} – ${formatDateKey(b, { day: "2-digit", month: "short" })}`;
    }
    return formatDateKey(cursorKey, { month: "long", year: "numeric" });
  }, [view, cursorKey, weekKeys]);

  const goPrev = () =>
    setCursorKey((k) =>
      view === "day"
        ? addDaysToDateKey(k, -1)
        : view === "week"
          ? addDaysToDateKey(k, -7)
          : addMonthsToDateKey(`${k.slice(0, 8)}01`, -1)
    );
  const goNext = () =>
    setCursorKey((k) =>
      view === "day"
        ? addDaysToDateKey(k, 1)
        : view === "week"
          ? addDaysToDateKey(k, 7)
          : addMonthsToDateKey(`${k.slice(0, 8)}01`, 1)
    );
  const goToday = () => {
    setCursorKey(todayKey);
    setSelectedKey(todayKey);
  };

  const openCreate = (key: string, time?: string) => {
    setEditing(null);
    setInitialDate(key);
    setInitialTime(time ?? null);
    setDialogOpen(true);
  };
  const openEdit = (ev: CalendarEvent) => {
    setEditing(ev);
    setInitialDate(null);
    setInitialTime(null);
    setDetail(null);
    setDialogOpen(true);
  };

  /**
   * Contrato com o EventDialog: mostramos o toast E propagamos o erro.
   * Sem o rethrow o dialog acharia que salvou, fecharia, e o formulário
   * preenchido seria perdido.
   */
  const handleSave = async (data: Omit<CalendarEvent, "id" | "user_id" | "created_at" | "updated_at">) => {
    try {
      if (editing) await calendarService.update(editing.id, data);
      else await calendarService.create(data);
      push({ title: editing ? "Evento atualizado" : "Evento criado" });
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" });
      throw e;
    }
  };

  const handleDelete = async (ev: CalendarEvent) => {
    if (!confirm(`Excluir "${ev.title}"?`)) return;
    try {
      await calendarService.remove(ev.id);
      push({ title: "Evento excluído" });
      setDetail(null);
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" });
    }
  };

  /** Botão "Evento" do topo: hoje quando visível no período, senão o cursor. */
  const defaultCreateKey = useMemo(() => {
    if (view === "agenda") return todayKey;
    if (view === "month") return todayKey.slice(0, 7) === cursorKey.slice(0, 7) ? todayKey : selectedKey;
    if (view === "week") return weekKeys.includes(todayKey) ? todayKey : weekKeys[0];
    return cursorKey;
  }, [view, todayKey, cursorKey, selectedKey, weekKeys]);

  const VIEWS: Array<{ id: View; label: string; mobile: boolean }> = [
    { id: "month", label: "Mês", mobile: true },
    { id: "week", label: "Semana", mobile: false },
    { id: "day", label: "Dia", mobile: true },
    { id: "agenda", label: "Agenda", mobile: true },
  ];

  return (
    <div className="space-y-4">
      {/* ---------- barra de controle ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[21px] sm:text-[24px] font-semibold tracking-[-0.02em] first-letter:uppercase">{title}</h1>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex gap-0.5 p-0.5 rounded-full border border-[var(--border)] bg-[var(--card)]">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                aria-pressed={view === v.id}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  v.mobile ? "" : "hidden sm:block"
                } ${
                  view === v.id
                    ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {view !== "agenda" && (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={goPrev}
                aria-label="Período anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={goToday}>
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={goNext}
                aria-label="Próximo período"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button size="sm" className="rounded-full" onClick={() => openCreate(defaultCreateKey)}>
            <Plus className="h-3.5 w-3.5" /> Evento
          </Button>
        </div>
      </div>

      {/* ---------- visões ---------- */}
      {view === "month" && (
        <div className="space-y-4">
          <MonthGrid
            year={year}
            month={month}
            todayKey={todayKey}
            selectedKey={selectedKey}
            eventsByDate={eventsByDate}
            onSelect={setSelectedKey}
            onCreate={(k) => openCreate(k)}
            onOpenEvent={setDetail}
          />
          {/* no mobile a grade só marca os dias; a leitura acontece nesta lista */}
          <div className="sm:hidden">
            <DayList
              dateKey={selectedKey}
              events={eventsByDate[selectedKey] || []}
              onOpenEvent={setDetail}
              onCreate={(k) => openCreate(k)}
            />
          </div>
        </div>
      )}

      {view === "week" && (
        <WeekGrid
          weekKeys={weekKeys}
          todayKey={todayKey}
          eventsByDate={eventsByDate}
          onCreate={(k, t) => openCreate(k, t)}
          onOpenEvent={setDetail}
        />
      )}

      {view === "day" && (
        <DayTimeline
          dateKey={cursorKey}
          todayKey={todayKey}
          events={eventsByDate[cursorKey] || []}
          onCreate={(k, t) => openCreate(k, t)}
          onOpenEvent={setDetail}
        />
      )}

      {view === "agenda" && <AgendaView events={events} todayKey={todayKey} onOpenEvent={setDetail} />}

      {/* ---------- criação / edição ---------- */}
      <EventDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
          setInitialDate(null);
          setInitialTime(null);
        }}
        onSave={handleSave}
        initial={editing}
        initialDate={initialDate}
        initialTime={initialTime}
      />

      {/* ---------- detalhe ---------- */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetail(null)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[440px] max-h-[86dvh] overflow-auto rounded-t-[22px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--elevated)] p-5 pb-[calc(1.25rem+var(--sab))] shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
            >
              <div className="mx-auto lg:hidden h-1 w-9 rounded-full bg-[var(--border-strong)] mb-4" />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                    style={{
                      background: `color-mix(in srgb, ${CAT_COLOR[detail.category]} 22%, transparent)`,
                      color: "var(--foreground)",
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: CAT_COLOR[detail.category] }} />
                    {CAT_LABEL[detail.category]}
                  </span>
                  <h3 className="mt-2 text-[17px] font-semibold leading-tight break-words">{detail.title}</h3>
                  <p className="mt-1.5 text-[12.5px] text-[var(--muted-foreground)]">
                    {detail.all_day
                      ? `Dia inteiro · ${formatDateKey(saoPauloDateKey(detail.starts_at), {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                        })}`
                      : `${eventFullTime(detail.starts_at)}${detail.ends_at ? ` → ${eventFullTime(detail.ends_at)}` : ""}`}
                  </p>
                  {(() => {
                    const rel = relativeDayLabel(saoPauloDateKey(detail.starts_at), todayKey);
                    return rel ? (
                      <span className="mt-2 inline-block rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--accent)]">
                        {rel}
                      </span>
                    ) : null;
                  })()}
                  {detail.description && <p className="mt-3 text-[13.5px] leading-relaxed">{detail.description}</p>}
                </div>
                <button
                  onClick={() => setDetail(null)}
                  className="h-8 w-8 shrink-0 rounded-full bg-[var(--card-soft)] grid place-items-center hover:bg-[var(--muted)]"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 flex gap-2">
                <Button size="sm" variant="soft" className="rounded-full flex-1" onClick={() => openEdit(detail)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-[var(--negative)]"
                  onClick={() => handleDelete(detail)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
