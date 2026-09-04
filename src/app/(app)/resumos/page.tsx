"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Wallet, CalendarDays, CheckCircle2, GraduationCap, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/utils";
import { CategoryBars } from "@/components/rise/charts/CategoryBars";
import { Sparkline } from "@/components/rise/charts/Sparkline";
import { DeltaChip } from "@/components/rise/charts/DeltaChip";
import { useFinanceStore } from "@/lib/store/financeStore";
import { useDebtStore } from "@/lib/store/debtStore";
import { useCalendarStore } from "@/lib/store/calendarStore";
import { useReminderStore } from "@/lib/store/reminderStore";
import { useSchoolStore } from "@/lib/store/schoolStore";
import {
  biggestDay,
  biggestExpense,
  categoryBreakdown,
  currentMonthKey,
  dailyAverage,
  dailySeries,
  monthStats,
  mostUsedAccount,
  pctChange,
  previousMonthKey,
} from "@/lib/finance/analytics";
import { saoPauloMonthKey, formatDateKey, addMonthsToDateKey } from "@/lib/timezone";

/** Rótulo "setembro de 2026" a partir de "2026-09". */
function monthLabel(monthKey: string) {
  return formatDateKey(`${monthKey}-01`, { month: "long", year: "numeric" });
}

function nextMonthKey(monthKey: string) {
  return addMonthsToDateKey(`${monthKey}-01`, 1).slice(0, 7);
}

export default function ResumosPage() {
  const thisMonth = currentMonthKey();
  const [monthKey, setMonthKey] = useState(thisMonth);

  const { transactions, categories, accounts } = useFinanceStore();
  const { payments, debts } = useDebtStore();
  const { events } = useCalendarStore();
  const { reminders } = useReminderStore();
  const { tasks } = useSchoolStore();

  const stats = useMemo(() => {
    const current = monthStats(transactions, monthKey);
    const previous = monthStats(transactions, previousMonthKey(monthKey));
    const { total, slices } = categoryBreakdown(transactions, categories, monthKey);
    const days = new Date(Date.UTC(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0)).getUTCDate();
    const series = dailySeries(transactions, `${monthKey}-01`, `${monthKey}-${String(days).padStart(2, "0")}`, "expense");

    const monthPayments = payments.filter((p) => saoPauloMonthKey(p.paid_at) === monthKey);
    const paidOwed = monthPayments
      .filter((p) => debts.find((d) => d.id === p.debt_id)?.kind === "owed")
      .reduce((s, p) => s + p.amount, 0);
    const receivedFrom = monthPayments
      .filter((p) => debts.find((d) => d.id === p.debt_id)?.kind === "receivable")
      .reduce((s, p) => s + p.amount, 0);

    return {
      current,
      previous,
      pct: pctChange(current.expense, previous.expense),
      incomePct: pctChange(current.income, previous.income),
      categoryTotal: total,
      slices,
      series,
      average: dailyAverage(transactions, monthKey),
      topExpense: biggestExpense(transactions, monthKey),
      topDay: biggestDay(transactions, monthKey),
      account: mostUsedAccount(transactions, accounts, monthKey),
      paidOwed,
      receivedFrom,
      eventsCount: events.filter((e) => saoPauloMonthKey(e.starts_at) === monthKey).length,
      remindersDone: reminders.filter(
        (r) => r.status === "done" && r.completed_at && saoPauloMonthKey(r.completed_at) === monthKey
      ).length,
      tasksDone: tasks.filter(
        (t) => t.status === "done" && t.completed_at && saoPauloMonthKey(t.completed_at) === monthKey
      ).length,
    };
  }, [transactions, categories, accounts, payments, debts, events, reminders, tasks, monthKey]);

  const hasData =
    stats.current.count > 0 ||
    stats.eventsCount > 0 ||
    stats.remindersDone > 0 ||
    stats.tasksDone > 0 ||
    stats.paidOwed > 0 ||
    stats.receivedFrom > 0;

  const isFuture = monthKey >= thisMonth;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] first-letter:uppercase">{monthLabel(monthKey)}</h1>
          <p className="text-[12.5px] text-[var(--muted-foreground)] mt-1">
            Tudo calculado dos seus lançamentos — nada é estimado.
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setMonthKey((k) => previousMonthKey(k))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={() => setMonthKey(thisMonth)}>
            Atual
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full disabled:opacity-30"
            disabled={isFuture}
            onClick={() => setMonthKey((k) => nextMonthKey(k))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-10 text-center">
          <p className="text-[15px] font-medium">Nada registrado neste mês</p>
          <p className="mt-1.5 text-[13px] text-[var(--muted-foreground)] max-w-[42ch] mx-auto">
            O resumo aparece assim que houver lançamentos, eventos ou tarefas concluídas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* destaque: quanto saiu */}
          <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">Saiu no mês</p>
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
              <p className="text-[38px] sm:text-[46px] font-semibold tracking-[-0.03em] leading-none tnum">
                {formatBRL(stats.current.expense)}
              </p>
              <DeltaChip pct={stats.pct} invert />
            </div>

            {stats.current.expense > 0 && (
              <div className="mt-5">
                <Sparkline points={stats.series} height={72} label="Gasto" />
                <p className="mt-2 text-[11px] text-[var(--faint)]">gasto por dia</p>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Entrou" value={formatBRL(stats.current.income)} />
              <Stat
                label="Sobrou"
                value={formatBRL(stats.current.net)}
                tone={stats.current.net < 0 ? "negative" : "positive"}
              />
              <Stat label="Média por dia" value={formatBRL(stats.average)} />
              <Stat label="Lançamentos" value={String(stats.current.count)} />
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-4 items-start">
            {/* categorias */}
            <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)]">
                Para onde foi
              </h2>
              {stats.slices.length ? (
                <div className="mt-4">
                  <CategoryBars slices={stats.slices} max={6} />
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-[var(--muted-foreground)]">Sem gastos categorizados.</p>
              )}
            </section>

            {/* destaques */}
            <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-5">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)]">Destaques</h2>
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {stats.topExpense && (
                  <Highlight
                    icon={<Wallet className="h-4 w-4" />}
                    label="Maior gasto"
                    value={formatBRL(stats.topExpense.amount)}
                    hint={stats.topExpense.description || "sem descrição"}
                  />
                )}
                {stats.topDay && (
                  <Highlight
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Dia que mais gastou"
                    value={formatBRL(stats.topDay.amount)}
                    hint={formatDateKey(stats.topDay.key, { day: "2-digit", month: "long" })}
                  />
                )}
                {stats.account && (
                  <Highlight
                    icon={<Wallet className="h-4 w-4" />}
                    label="Conta mais usada"
                    value={stats.account.account.name}
                    hint={`${stats.account.count} lançamentos`}
                  />
                )}
                {stats.paidOwed > 0 && (
                  <Highlight
                    icon={<HandCoins className="h-4 w-4" />}
                    label="Dívidas pagas"
                    value={formatBRL(stats.paidOwed)}
                  />
                )}
                {stats.receivedFrom > 0 && (
                  <Highlight
                    icon={<HandCoins className="h-4 w-4" />}
                    label="Recebido de terceiros"
                    value={formatBRL(stats.receivedFrom)}
                  />
                )}
              </ul>
            </section>
          </div>

          {/* rotina */}
          <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)]">Rotina</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat label="Eventos" value={String(stats.eventsCount)} icon={<CalendarDays className="h-3.5 w-3.5" />} />
              <Stat
                label="Lembretes concluídos"
                value={String(stats.remindersDone)}
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              />
              <Stat
                label="Atividades entregues"
                value={String(stats.tasksDone)}
                icon={<GraduationCap className="h-3.5 w-3.5" />}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card-soft)] px-3.5 py-3">
      <p className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--faint)] flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p
        className={`text-[15px] font-semibold tnum mt-1.5 ${
          tone === "negative" ? "text-[var(--negative)]" : tone === "positive" ? "text-[var(--positive)]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Highlight({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="h-8 w-8 shrink-0 grid place-items-center rounded-lg border border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] text-[var(--faint)]">{label}</span>
        <span className="block text-[13.5px] font-medium truncate">{value}</span>
      </span>
      {hint && <span className="shrink-0 text-[11.5px] text-[var(--muted-foreground)] truncate max-w-[40%]">{hint}</span>}
    </li>
  );
}
