"use client";
import Link from "next/link";
import { ArrowUpRight, Bell, CalendarDays, GraduationCap, Plus, Pin, Star } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { formatDateKey, saoPauloDateKey } from "@/lib/timezone";
import { Sparkline } from "@/components/rise/charts/Sparkline";
import { CategoryBars } from "@/components/rise/charts/CategoryBars";
import { DeltaChip } from "@/components/rise/charts/DeltaChip";
import { WidgetEmpty } from "@/components/rise/dashboard/WidgetShell";
import type { CategorySlice, DayPoint } from "@/lib/finance/analytics";
import type { Debt, DebtInstallment, DebtPayment } from "@/types/debt";
import type { ImportantItem } from "@/types/important";
import type { SchoolTask } from "@/types/school";
import { TYPE_LABEL } from "@/types/school";

export type AgendaEntry = {
  id: string;
  kind: "event" | "reminder" | "school";
  title: string;
  time: string;
  meta: string;
  overdue?: boolean;
  sortAt: number;
};

export type UpcomingEntry = {
  id: string;
  kind: "event" | "reminder";
  title: string;
  dateKey: string;
  at: number;
};

const KIND_ICON = { event: CalendarDays, reminder: Bell, school: GraduationCap };

/* ------------------------------------------------------------------ */
/* Gastos do mês — o número que realmente importa                       */
/* ------------------------------------------------------------------ */

export function SpendWidget({
  expense,
  income,
  pct,
  series,
  topCategory,
  totalBalance,
  hasData,
}: {
  expense: number;
  income: number;
  pct: number | null;
  series: DayPoint[];
  topCategory: string | null;
  totalBalance: number;
  hasData: boolean;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6 lg:grid-cols-[minmax(13rem,1.6fr)_repeat(3,minmax(0,1fr))] lg:items-end">
        <div>
          <p className="text-[34px] sm:text-[40px] font-semibold tracking-[-0.03em] leading-none tnum">
            {formatBRL(expense)}
          </p>
          <div className="mt-3">
            <DeltaChip pct={pct} invert />
          </div>
        </div>

        <div className="lg:border-l lg:border-[var(--border)] lg:pl-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">Recebido no mês</p>
          <p className="mt-1 text-[15px] font-semibold tnum">{formatBRL(income)}</p>
        </div>

        <div className="lg:border-l lg:border-[var(--border)] lg:pl-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">Sobrou no mês</p>
          <p
            className={`mt-1 text-[15px] font-semibold tnum ${
              income - expense < 0 ? "text-[var(--negative)]" : "text-[var(--positive)]"
            }`}
          >
            {formatBRL(income - expense)}
          </p>
        </div>

        <Link
          href="/financas/contas"
          aria-label="Ver saldo total e contas"
          className="group -m-1 rounded-lg p-1 transition-colors hover:bg-[var(--card-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:border-l lg:border-[var(--border)] lg:pl-6"
        >
          <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-[var(--faint)] group-hover:text-[var(--muted-foreground)]">
            Saldo total <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </p>
          <p className={`mt-1 text-[15px] font-semibold tnum ${totalBalance < 0 ? "text-[var(--negative)]" : ""}`}>
            {formatBRL(totalBalance)}
          </p>
        </Link>
      </div>

      {hasData ? (
        <>
          <div className="mt-5">
            <Sparkline points={series} height={64} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--faint)]">
            <span>últimos 30 dias</span>
            {topCategory && <span>maior categoria: {topCategory}</span>}
          </div>
        </>
      ) : (
        <p className="mt-5 text-[13px] text-[var(--muted-foreground)]">
          Nenhum lançamento neste mês ainda.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function CategoriesWidget({ slices, total }: { slices: CategorySlice[]; total: number }) {
  if (!slices.length) {
    return <WidgetEmpty>Sem gastos categorizados neste mês.</WidgetEmpty>;
  }
  return (
    <div>
      <p className="text-[13px] text-[var(--muted-foreground)] mb-3">
        <span className="tnum font-semibold text-[var(--foreground)]">{formatBRL(total)}</span> distribuídos em{" "}
        {slices.length} {slices.length === 1 ? "categoria" : "categorias"}
      </p>
      <CategoryBars slices={slices} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function TodayWidget({ entries }: { entries: AgendaEntry[] }) {
  if (!entries.length) {
    return <WidgetEmpty>Nada marcado para hoje.</WidgetEmpty>;
  }
  return (
    <ul className="divide-y divide-[var(--border)] -my-1">
      {entries.map((e) => {
        const Icon = KIND_ICON[e.kind];
        return (
          <li key={e.id} className="flex items-center gap-3 py-2.5">
            <span
              className={`h-8 w-8 shrink-0 rounded-lg grid place-items-center border ${
                e.overdue
                  ? "border-[var(--negative)]/30 bg-[var(--negative)]/10 text-[var(--negative)]"
                  : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--accent)]"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium leading-tight truncate">{e.title}</p>
              <p className="text-[11.5px] text-[var(--muted-foreground)] truncate">{e.meta}</p>
            </div>
            <span className="text-[12px] tnum text-[var(--muted-foreground)] shrink-0">{e.time}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

export function UpcomingWidget({ entries, days }: { entries: UpcomingEntry[]; days: number }) {
  if (!entries.length) {
    return (
      <WidgetEmpty
        action={
          <Link
            href="/calendario"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-[12px] font-medium hover:border-[var(--border-strong)]"
          >
            <Plus className="h-3.5 w-3.5" /> Novo evento
          </Link>
        }
      >
        Nada nos próximos {days} dias.
      </WidgetEmpty>
    );
  }
  return (
    <ul className="divide-y divide-[var(--border)] -my-1">
      {entries.map((e) => {
        const Icon = KIND_ICON[e.kind];
        return (
          <li key={e.id} className="flex items-center gap-3 py-2.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--faint)]" />
            <p className="text-[13px] flex-1 min-w-0 truncate">{e.title}</p>
            <span className="text-[11.5px] text-[var(--muted-foreground)] shrink-0">
              {formatDateKey(e.dateKey, { day: "2-digit", month: "short" })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

const DEBT_STATUS_LABEL: Record<string, string> = {
  pending: "em aberto",
  partial: "parcial",
  paid: "quitada",
  overdue: "vencida",
};

export function DebtsWidget({
  debts,
  payments,
  installments,
  statusOf,
  remainingOf,
}: {
  debts: Debt[];
  payments: DebtPayment[];
  installments: DebtInstallment[];
  statusOf: (d: Debt, p: DebtPayment[], i: DebtInstallment[]) => string;
  remainingOf: (d: Debt, p: DebtPayment[]) => number;
}) {
  const active = debts.filter((d) => !d.archived_at);
  if (!active.length) {
    return (
      <WidgetEmpty
        action={
          <Link
            href="/financas/dividas"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-[12px] font-medium hover:border-[var(--border-strong)]"
          >
            <Plus className="h-3.5 w-3.5" /> Registrar dívida
          </Link>
        }
      >
        Nenhuma dívida registrada.
      </WidgetEmpty>
    );
  }

  const rows = [...active]
    .sort((a, b) => {
      const sa = statusOf(a, payments, installments) === "overdue" ? 0 : 1;
      const sb = statusOf(b, payments, installments) === "overdue" ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return (a.due_date || "9999").localeCompare(b.due_date || "9999");
    })
    .slice(0, 4);

  return (
    <ul className="divide-y divide-[var(--border)] -my-1">
      {rows.map((d) => {
        const status = statusOf(d, payments, installments);
        const remaining = remainingOf(d, payments);
        return (
          <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium leading-tight truncate">
                {d.person}
                <span className="ml-1.5 text-[11.5px] font-normal text-[var(--faint)]">
                  {d.kind === "owed" ? "você deve" : "te devem"}
                </span>
              </p>
              <p
                className={`text-[11.5px] ${
                  status === "overdue" ? "text-[var(--negative)]" : "text-[var(--muted-foreground)]"
                }`}
              >
                {DEBT_STATUS_LABEL[status] || status}
                {remaining > 0.005 ? ` · falta ${formatBRL(remaining)}` : ""}
              </p>
            </div>
            <p
              className={`text-[13.5px] font-semibold tnum shrink-0 ${
                d.kind === "receivable" ? "text-[var(--positive)]" : ""
              }`}
            >
              {formatBRL(d.amount)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

export function ImportantWidget({ items }: { items: ImportantItem[] }) {
  if (!items.length) {
    return (
      <WidgetEmpty
        action={
          <Link
            href="/importantes"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-[12px] font-medium hover:border-[var(--border-strong)]"
          >
            <Star className="h-3.5 w-3.5" /> Guardar algo
          </Link>
        }
      >
        Nada fixado ainda.
      </WidgetEmpty>
    );
  }
  return (
    <ul className="divide-y divide-[var(--border)] -my-1">
      {items.slice(0, 4).map((i) => (
        <li key={i.id} className="py-2.5">
          <Link href="/importantes" className="flex items-start gap-2.5 group">
            <Pin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--accent)]" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium leading-tight truncate group-hover:text-[var(--accent)] transition-colors">
                {i.title}
              </span>
              {i.content && (
                <span className="mt-0.5 block text-[11.5px] text-[var(--muted-foreground)] truncate">{i.content}</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

export function SchoolWidget({
  tasks,
  overdueOf,
}: {
  tasks: SchoolTask[];
  overdueOf: (t: SchoolTask) => boolean;
}) {
  if (!tasks.length) {
    return (
      <WidgetEmpty
        action={
          <Link
            href="/escola"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-[12px] font-medium hover:border-[var(--border-strong)]"
          >
            <GraduationCap className="h-3.5 w-3.5" /> Nova atividade
          </Link>
        }
      >
        Nenhuma entrega próxima.
      </WidgetEmpty>
    );
  }
  return (
    <ul className="divide-y divide-[var(--border)] -my-1">
      {tasks.slice(0, 4).map((t) => {
        const overdue = overdueOf(t);
        return (
          <li key={t.id} className="py-2.5">
            <Link href="/escola" className="flex items-start gap-2.5 group">
              <GraduationCap
                className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${overdue ? "text-[var(--negative)]" : "text-[var(--faint)]"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium leading-tight truncate group-hover:text-[var(--accent)] transition-colors">
                  {t.title}
                </span>
                <span className={`mt-0.5 block text-[11.5px] truncate ${overdue ? "text-[var(--negative)]" : "text-[var(--muted-foreground)]"}`}>
                  {[t.subject, TYPE_LABEL[t.type], overdue ? "atrasada" : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              {t.due_at && (
                <span className="shrink-0 text-[11.5px] text-[var(--muted-foreground)]">
                  {formatDateKey(saoPauloDateKey(t.due_at), { day: "2-digit", month: "short" })}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */

export function WidgetLink({ href, label }: { href: "/financas" | "/calendario" | "/lembretes" | "/importantes" | "/escola" | "/financas/dividas" | "/financas/contas"; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
    >
      {label} <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}
