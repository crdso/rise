"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, Reorder, useDragControls } from "framer-motion";
import { LayoutGrid, Check, RotateCcw, Maximize2, Minimize2, Sparkles, Loader2 } from "lucide-react";
import { greeting, headerDate } from "@/lib/utils";
import { useFinanceStore } from "@/lib/store/financeStore";
import { useFinanceSummary } from "@/lib/finance/useFinanceSummary";
import { useDebtStore, debtRemaining, debtStatus } from "@/lib/store/debtStore";
import { useCalendarStore } from "@/lib/store/calendarStore";
import { useReminderStore, remindersForToday, remindersUpcoming, reminderViewStatus } from "@/lib/store/reminderStore";
import { useImportantStore, pinnedItems } from "@/lib/store/importantStore";
import { useSchoolStore, upcomingTasks, taskViewStatus } from "@/lib/store/schoolStore";
import { useDashboardStore, resolveOrder, WIDGET_META, type WidgetId } from "@/lib/store/dashboardStore";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { settingsService } from "@/lib/services/settingsService";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { WidgetShell } from "@/components/rise/dashboard/WidgetShell";
import {
  SpendWidget,
  CategoriesWidget,
  TodayWidget,
  UpcomingWidget,
  DebtsWidget,
  ImportantWidget,
  SchoolWidget,
  WidgetLink,
  type AgendaEntry,
  type UpcomingEntry,
} from "@/components/rise/dashboard/widgets";
import {
  categoryBreakdown,
  currentMonthKey,
  lastNDays,
  monthStats,
  pctChange,
  previousMonthKey,
  totalBalance,
} from "@/lib/finance/analytics";
import { saoPauloDateKey, saoPauloTodayKey, addDaysToDateKey } from "@/lib/timezone";

const UPCOMING_DAYS = 7;

function timeSP(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export default function Dashboard() {
  const { accounts, transactions, categories } = useFinanceStore();
  const { debts, payments, installments } = useDebtStore();
  const { events } = useCalendarStore();
  const { reminders } = useReminderStore();
  const { items: importantItems } = useImportantStore();
  const { tasks: schoolTasks } = useSchoolStore();
  const { order, hidden, spans, editing, setOrder, toggleHidden, toggleSpan, setEditing, reset } = useDashboardStore();
  const { push } = useToast();

  const [seeding, setSeeding] = useState(false);
  const isDemo = !isSupabaseConfigured();
  const todayKey = saoPauloTodayKey();
  const monthKey = currentMonthKey();
  const financeSummary = useFinanceSummary(monthKey);

  const todayLabel = useMemo(() => headerDate(new Date()), []);
  const greet = useMemo(() => greeting("Ezequias"), []);

  /* ---------- números reais, sem fixture ---------- */
  const finance = useMemo(() => {
    const current = monthStats(transactions, monthKey);
    const previous = monthStats(transactions, previousMonthKey(monthKey));
    const { total, slices } = categoryBreakdown(transactions, categories, monthKey);
    return {
      expense: financeSummary?.month.expense ?? current.expense,
      income: financeSummary?.month.income ?? current.income,
      pct: pctChange(current.expense, previous.expense),
      series: lastNDays(transactions, 30, "expense"),
      slices,
      categoryTotal: total,
      topCategory: slices[0]?.name ?? null,
      totalBalance: financeSummary?.totalBalance ?? totalBalance(accounts, transactions),
      hasData: transactions.length > 0,
    };
  }, [accounts, transactions, categories, monthKey, financeSummary]);

  const todayEntries = useMemo<AgendaEntry[]>(() => {
    const evs: AgendaEntry[] = events
      .filter((e) => saoPauloDateKey(e.starts_at) === todayKey)
      .map((e) => ({
        id: `ev-${e.id}`,
        kind: e.category === "school" ? "school" : "event",
        title: e.title,
        time: e.all_day ? "dia inteiro" : timeSP(e.starts_at),
        meta:
          e.category === "school"
            ? "Escola"
            : e.category === "finance"
              ? "Financeiro"
              : e.category === "important"
                ? "Importante"
                : "Pessoal",
        sortAt: e.all_day ? 0 : +new Date(e.starts_at),
      }));

    const rems: AgendaEntry[] = remindersForToday(reminders, todayKey).map((r) => {
      const overdue = reminderViewStatus(r) === "overdue";
      return {
        id: `rm-${r.id}`,
        kind: "reminder" as const,
        title: r.title,
        time: r.due_at ? timeSP(r.due_at) : "sem hora",
        meta: overdue ? "Lembrete atrasado" : "Lembrete",
        overdue,
        sortAt: r.due_at ? +new Date(r.due_at) : 0,
      };
    });

    return [...evs, ...rems].sort((a, b) => a.sortAt - b.sortAt);
  }, [events, reminders, todayKey]);

  const upcomingEntries = useMemo<UpcomingEntry[]>(() => {
    const limit = addDaysToDateKey(todayKey, UPCOMING_DAYS);
    const evs: UpcomingEntry[] = events
      .filter((e) => {
        const k = saoPauloDateKey(e.starts_at);
        return k > todayKey && k <= limit;
      })
      .map((e) => ({
        id: `ev-${e.id}`,
        kind: "event" as const,
        title: e.title,
        dateKey: saoPauloDateKey(e.starts_at),
        at: +new Date(e.starts_at),
      }));
    const rems: UpcomingEntry[] = remindersUpcoming(reminders, UPCOMING_DAYS, todayKey).map((r) => ({
      id: `rm-${r.id}`,
      kind: "reminder" as const,
      title: r.title,
      dateKey: saoPauloDateKey(r.due_at as string),
      at: +new Date(r.due_at as string),
    }));
    return [...evs, ...rems].sort((a, b) => a.at - b.at).slice(0, 6);
  }, [events, reminders, todayKey]);

  const visibleOrder = useMemo(() => resolveOrder(order), [order]);

  // Sincroniza o layout com o servidor. O primeiro render é ignorado: ele é
  // apenas a hidratação do localStorage, não uma escolha do usuário.
  const firstLayoutRender = useRef(true);
  useEffect(() => {
    if (firstLayoutRender.current) {
      firstLayoutRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      void settingsService.save({ dashboard: { order, hidden, spans } }).catch(() => console.warn("[rise-settings] dashboard sync failed."));
    }, 700);
    return () => clearTimeout(t);
  }, [order, hidden, spans]);
  const isEmpty =
    transactions.length === 0 &&
    accounts.length === 0 &&
    events.length === 0 &&
    reminders.length === 0 &&
    importantItems.length === 0 &&
    schoolTasks.length === 0 &&
    debts.length === 0;

  const loadDemo = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const { seedDemoData } = await import("@/lib/fixtures");
      await seedDemoData();
      push({ title: "Dados de demonstração carregados" });
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" });
    } finally {
      setSeeding(false);
    }
  };

  /* ---------- corpo de cada widget ---------- */
  const renderBody = (id: WidgetId) => {
    switch (id) {
      case "spend":
        return (
          <SpendWidget
            expense={finance.expense}
            income={finance.income}
            pct={finance.pct}
            series={finance.series}
            topCategory={finance.topCategory}
            totalBalance={finance.totalBalance}
            hasData={finance.hasData}
          />
        );
      case "categories":
        return <CategoriesWidget slices={finance.slices} total={finance.categoryTotal} />;
      case "today":
        return <TodayWidget entries={todayEntries} />;
      case "upcoming":
        return <UpcomingWidget entries={upcomingEntries} days={UPCOMING_DAYS} />;
      case "debts":
        return (
          <DebtsWidget
            debts={debts}
            payments={payments}
            installments={installments}
            statusOf={debtStatus}
            remainingOf={debtRemaining}
          />
        );
      case "important":
        return <ImportantWidget items={pinnedItems(importantItems)} />;
      case "school":
        return (
          <SchoolWidget
            tasks={upcomingTasks(schoolTasks, UPCOMING_DAYS, todayKey)}
            overdueOf={(t) => taskViewStatus(t) === "overdue"}
          />
        );
      default:
        return null;
    }
  };

  const actionFor = (id: WidgetId) => {
    switch (id) {
      case "spend":
      case "categories":
        return <WidgetLink href="/financas" label="Finanças" />;
      case "today":
      case "upcoming":
        return <WidgetLink href="/calendario" label="Calendário" />;
      case "debts":
        return <WidgetLink href="/financas/dividas" label="Dívidas" />;
      case "important":
        return <WidgetLink href="/importantes" label="Ver todos" />;
      case "school":
        return <WidgetLink href="/escola" label="Escola" />;
      default:
        return null;
    }
  };

  const spanOf = (id: WidgetId) => spans[id] ?? WIDGET_META[id].span;

  return (
    <div className="space-y-6">
      {/* cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-[25px] sm:text-[29px] font-semibold tracking-[-0.02em] leading-none">{greet}</h1>
          <p className="text-[13px] text-[var(--muted-foreground)] mt-2 first-letter:uppercase">{todayLabel}</p>
        </motion.div>

        <div className="flex items-center gap-2">
          {editing && (
            <Button variant="ghost" size="sm" className="rounded-full" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Restaurar
            </Button>
          )}
          <Button
            variant={editing ? "default" : "muted"}
            size="sm"
            className="rounded-full"
            onClick={() => setEditing(!editing)}
          >
            {editing ? (
              <>
                <Check className="h-3.5 w-3.5" /> Concluir
              </>
            ) : (
              <>
                <LayoutGrid className="h-3.5 w-3.5" /> Editar painel
              </>
            )}
          </Button>
        </div>
      </div>

      {/* primeiro uso no modo demonstração */}
      {isDemo && isEmpty && (
        <div className="rounded-[18px] border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-6 text-center">
          <p className="text-[15px] font-semibold">Seu painel está vazio</p>
          <p className="mt-1.5 text-[13px] text-[var(--muted-foreground)] max-w-[46ch] mx-auto">
            Adicione seus próprios lançamentos, ou carregue um conjunto de exemplo para ver o RISE com dados. Nada é
            criado automaticamente.
          </p>
          <Button size="sm" variant="soft" className="rounded-full mt-4" onClick={loadDemo} disabled={seeding}>
            {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {seeding ? "Carregando…" : "Carregar dados de demonstração"}
          </Button>
        </div>
      )}

      {editing ? (
        <>
          <p className="text-[12.5px] text-[var(--muted-foreground)]">
            Arraste pela alça para reordenar. Toque em Visível para ocultar um bloco.
          </p>
          <Reorder.Group axis="y" values={visibleOrder} onReorder={setOrder} className="space-y-3">
            {visibleOrder.map((id) => (
              <EditableWidget
                key={id}
                id={id}
                hidden={hidden.includes(id)}
                span={spanOf(id)}
                onToggleHidden={() => toggleHidden(id)}
                onToggleSpan={() => toggleSpan(id)}
              />
            ))}
          </Reorder.Group>
        </>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          {visibleOrder
            .filter((id) => !hidden.includes(id))
            .map((id) => (
              <WidgetShell
                key={id}
                title={WIDGET_META[id].title}
                action={actionFor(id)}
                className={spanOf(id) === "wide" ? "lg:col-span-2" : ""}
              >
                {renderBody(id)}
              </WidgetShell>
            ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item arrastável do modo de edição.
   Mostra só o resumo do bloco — arrastar conteúdo pesado é ruim de usar
   e caro de animar.                                                    */
/* ------------------------------------------------------------------ */
function EditableWidget({
  id,
  hidden,
  span,
  onToggleHidden,
  onToggleSpan,
}: {
  id: WidgetId;
  hidden: boolean;
  span: "wide" | "narrow";
  onToggleHidden: () => void;
  onToggleSpan: () => void;
}) {
  const controls = useDragControls();
  const meta = WIDGET_META[id];

  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls} className="list-none">
      <WidgetShell title={meta.title} editing hidden={hidden} onToggleHidden={onToggleHidden} dragControls={controls}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12.5px] text-[var(--muted-foreground)]">{meta.desc}</p>
          <button
            type="button"
            onClick={onToggleSpan}
            className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-1 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {span === "wide" ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {span === "wide" ? "Largura total" : "Meia largura"}
          </button>
        </div>
      </WidgetShell>
    </Reorder.Item>
  );
}
