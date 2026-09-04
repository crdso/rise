// Base preservada do trabalho local (OpenCode) e estendida na Fase 3.4.
// Mantidos: ReminderPriority, o conjunto de status de negócio, os campos
// title/notes/due_at/priority/status/is_recurring/recurrence/created_at/updated_at.

export type ReminderPriority = "low" | "medium" | "high";

/** Status realmente persistido no banco. */
export type ReminderBaseStatus = "pending" | "done" | "archived";

/**
 * Status de negócio exibido na UI.
 * "overdue" é DERIVADO (pending + due_at no passado) e nunca gravado —
 * não existe cron para virar pending -> overdue.
 */
export type ReminderStatus = ReminderBaseStatus | "overdue";

/** "none" é a opção da UI; no banco vira null. */
export type ReminderRecurrence = "none" | "daily" | "weekly" | "monthly";
export type ReminderStoredRecurrence = Exclude<ReminderRecurrence, "none">;

export type Reminder = {
  id: string;
  user_id: string;
  title: string;
  notes?: string | null;
  due_at?: string | null; // ISO UTC (timestamptz)
  priority: ReminderPriority;
  status: ReminderBaseStatus;
  is_recurring: boolean;
  recurrence?: ReminderStoredRecurrence | null;
  completed_at?: string | null;
  /** Preenchido nas ocorrências históricas de uma série recorrente; null no lembrete mestre. */
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderInput = {
  title: string;
  notes?: string | null;
  due_at?: string | null;
  priority: ReminderPriority;
  recurrence?: ReminderRecurrence | null;
};

export const PRIORITY_LABEL: Record<ReminderPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const PRIORITY_COLOR: Record<ReminderPriority, string> = {
  low: "#6B7280",
  medium: "#F59E0B",
  high: "#EF4444",
};

export const RECURRENCE_LABEL: Record<ReminderRecurrence, string> = {
  none: "Não repete",
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};
