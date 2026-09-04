/**
 * Derivação das notificações.
 *
 * Nada aqui é inventado nem persistido: a lista é calculada a partir dos dados
 * reais (lembretes, dívidas, parcelas, eventos) toda vez que é lida. Se não há
 * nada acontecendo, a lista é vazia e o sino não mostra contador.
 *
 * Os ids são ESTÁVEIS entre renders — é o que permite lembrar o que já foi lido.
 */
import { saoPauloDateKey, saoPauloTodayKey, addDaysToDateKey } from "@/lib/timezone";
import { reminderViewStatus } from "@/lib/store/reminderStore";
import { debtStatus, installmentStatus } from "@/lib/store/debtStore";
import type { Reminder } from "@/types/reminder";
import type { Debt, DebtInstallment, DebtPayment } from "@/types/debt";
import type { CalendarEvent } from "@/types/calendar";
import type { NotificationPrefs } from "@/lib/store/notificationStore";

export type NotificationKind = "reminder" | "debt" | "installment" | "event" | "school";
export type NotificationSeverity = "info" | "warning" | "critical";

export type RiseNotification = {
  id: string;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  desc: string;
  /** instante de referência para ordenar; null quando não há data */
  at: number | null;
  href: "/lembretes" | "/financas/dividas" | "/calendario" | "/escola";
};

const EVENT_SOON_HOURS = 24;

export function buildNotifications(input: {
  reminders: Reminder[];
  debts: Debt[];
  payments: DebtPayment[];
  installments: DebtInstallment[];
  events: CalendarEvent[];
  prefs: NotificationPrefs;
  dismissed: string[];
  now?: Date;
}): RiseNotification[] {
  const { reminders, debts, payments, installments, events, prefs, dismissed } = input;
  const now = input.now ?? new Date();
  const todayKey = saoPauloTodayKey();
  const out: RiseNotification[] = [];

  /* -------- lembretes -------- */
  if (prefs.reminders) {
    for (const r of reminders) {
      if (r.status !== "pending") continue;
      const status = reminderViewStatus(r, now);
      if (status === "overdue") {
        out.push({
          id: `reminder-overdue-${r.id}`,
          kind: "reminder",
          severity: "critical",
          title: r.title,
          desc: "Lembrete atrasado",
          at: r.due_at ? +new Date(r.due_at) : null,
          href: "/lembretes",
        });
        continue;
      }
      if (r.due_at && saoPauloDateKey(r.due_at) === todayKey) {
        out.push({
          id: `reminder-today-${r.id}`,
          kind: "reminder",
          severity: r.priority === "high" ? "warning" : "info",
          title: r.title,
          desc: r.priority === "high" ? "Hoje · prioridade alta" : "Vence hoje",
          at: +new Date(r.due_at),
          href: "/lembretes",
        });
        continue;
      }
      if (!r.due_at && r.priority === "high") {
        out.push({
          id: `reminder-high-${r.id}`,
          kind: "reminder",
          severity: "info",
          title: r.title,
          desc: "Prioridade alta, sem data",
          at: null,
          href: "/lembretes",
        });
      }
    }
  }

  /* -------- dívidas e parcelas -------- */
  if (prefs.debts) {
    for (const d of debts) {
      if (d.archived_at) continue;
      const status = debtStatus(d, payments, installments);
      if (status === "overdue") {
        out.push({
          id: `debt-overdue-${d.id}`,
          kind: "debt",
          severity: "critical",
          title: d.kind === "owed" ? `Você deve a ${d.person}` : `${d.person} te deve`,
          desc: "Vencida",
          at: d.due_date ? +new Date(`${d.due_date}T12:00:00Z`) : null,
          href: "/financas/dividas",
        });
        continue;
      }
      // vence nos próximos 3 dias
      if (d.due_date && status !== "paid") {
        const limit = addDaysToDateKey(todayKey, 3);
        if (d.due_date >= todayKey && d.due_date <= limit) {
          out.push({
            id: `debt-soon-${d.id}`,
            kind: "debt",
            severity: "warning",
            title: d.kind === "owed" ? `Pagar ${d.person}` : `Receber de ${d.person}`,
            desc: d.due_date === todayKey ? "Vence hoje" : "Vence em breve",
            at: +new Date(`${d.due_date}T12:00:00Z`),
            href: "/financas/dividas",
          });
        }
      }
    }

    for (const inst of installments) {
      const debt = debts.find((d) => d.id === inst.debt_id);
      if (!debt || debt.archived_at) continue;
      if (installmentStatus(inst, payments) !== "overdue") continue;
      out.push({
        id: `installment-overdue-${inst.id}`,
        kind: "installment",
        severity: "critical",
        title: `Parcela ${inst.installment_number} · ${debt.person}`,
        desc: "Parcela vencida",
        at: +new Date(`${inst.due_date}T12:00:00Z`),
        href: "/financas/dividas",
      });
    }
  }

  /* -------- eventos próximos -------- */
  if (prefs.events) {
    const horizon = now.getTime() + EVENT_SOON_HOURS * 3600 * 1000;
    for (const e of events) {
      const start = +new Date(e.starts_at);
      const isToday = saoPauloDateKey(e.starts_at) === todayKey;
      if (e.all_day) {
        if (!isToday) continue;
        out.push({
          id: `event-today-${e.id}`,
          kind: e.category === "school" ? "school" : "event",
          severity: "info",
          title: e.title,
          desc: "Hoje · dia inteiro",
          at: start,
          href: e.category === "school" ? "/escola" : "/calendario",
        });
        continue;
      }
      if (start < now.getTime() || start > horizon) continue;
      out.push({
        id: `event-soon-${e.id}`,
        kind: e.category === "school" ? "school" : "event",
        severity: e.category === "important" ? "warning" : "info",
        title: e.title,
        desc: isToday ? "Ainda hoje" : "Nas próximas 24h",
        at: start,
        href: e.category === "school" ? "/escola" : "/calendario",
      });
    }
  }

  const sev = { critical: 0, warning: 1, info: 2 } as const;
  return out
    .filter((n) => !dismissed.includes(n.id))
    .filter((n) => (n.kind === "school" ? prefs.school : true))
    .sort((a, b) => {
      if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
      if (a.at === null) return 1;
      if (b.at === null) return -1;
      return a.at - b.at;
    });
}
