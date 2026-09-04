"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Reminder, ReminderStatus } from "@/types/reminder";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { saoPauloDateKey, saoPauloTodayKey, addDaysToDateKey } from "@/lib/timezone";

type State = {
  reminders: Reminder[];
  _hasHydrated: boolean;
  setHydrated: (v: boolean) => void;
  upsertReminder: (r: Reminder) => void;
  setReminders: (r: Reminder[]) => void;
  removeReminder: (id: string) => void;
  clearForSupabase: () => void;
};

// Mesmo contrato dos demais stores: persistência local SÓ em Demo Mode.
// Com Supabase configurado o storage vira no-op e o servidor é a fonte da verdade.
const demoStorage = {
  getItem: (name: string) => {
    if (isSupabaseConfigured()) return null;
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name: string, value: string) => {
    if (isSupabaseConfigured()) return;
    try { localStorage.setItem(name, value); } catch {}
  },
  removeItem: (name: string) => { try { localStorage.removeItem(name); } catch {} },
};

function sortReminders(list: Reminder[]): Reminder[] {
  return [...list].sort((a, b) => {
    if (!a.due_at && !b.due_at) return +new Date(b.created_at) - +new Date(a.created_at);
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return +new Date(a.due_at) - +new Date(b.due_at);
  });
}

export const useReminderStore = create<State>()(
  persist(
    (set) => ({
      reminders: [],
      _hasHydrated: false,
      setHydrated: (v) => set({ _hasHydrated: v }),
      upsertReminder: (r) => set((s) => {
        const exists = s.reminders.some((x) => x.id === r.id);
        return { reminders: sortReminders(exists ? s.reminders.map((x) => (x.id === r.id ? r : x)) : [...s.reminders, r]) };
      }),
      setReminders: (r) => set({ reminders: sortReminders(r) }),
      removeReminder: (id) => set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) })),
      clearForSupabase: () => set({ reminders: [] }),
    }),
    {
      name: "rise_reminder_demo_v1",
      storage: createJSONStorage(() => demoStorage),
      partialize: (s) => ({ reminders: s.reminders }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);

// ============================================================
// Derivações
// "overdue" é sempre calculado na leitura — nunca lido do banco.
// ============================================================

export function reminderViewStatus(r: Reminder, now: Date = new Date()): ReminderStatus {
  if (r.status !== "pending") return r.status;
  if (r.due_at && new Date(r.due_at).getTime() < now.getTime()) return "overdue";
  return "pending";
}

export function isReminderOverdue(r: Reminder, now: Date = new Date()): boolean {
  return reminderViewStatus(r, now) === "overdue";
}

export type ReminderBucket = "today" | "upcoming" | "undated" | "done" | "archived";

/**
 * Regras das seções da UI:
 *  today    -> pendente com data até hoje (inclui os atrasados)
 *  upcoming -> pendente com data futura
 *  undated  -> pendente sem data
 *  done     -> concluídos (inclui ocorrências históricas de séries recorrentes)
 *  archived -> arquivados
 */
export function reminderBucket(r: Reminder, todayKey: string = saoPauloTodayKey()): ReminderBucket {
  if (r.status === "archived") return "archived";
  if (r.status === "done") return "done";
  if (!r.due_at) return "undated";
  return saoPauloDateKey(r.due_at) <= todayKey ? "today" : "upcoming";
}

export function groupReminders(reminders: Reminder[], todayKey: string = saoPauloTodayKey()) {
  const groups: Record<ReminderBucket, Reminder[]> = { today: [], upcoming: [], undated: [], done: [], archived: [] };
  for (const r of reminders) groups[reminderBucket(r, todayKey)].push(r);
  // concluídos: mais recentes primeiro
  groups.done.sort((a, b) => +new Date(b.completed_at || b.updated_at) - +new Date(a.completed_at || a.updated_at));
  return groups;
}

/** Pendentes de hoje (incluindo atrasados) — usado pelo Dashboard. */
export function remindersForToday(reminders: Reminder[], todayKey: string = saoPauloTodayKey()): Reminder[] {
  return reminders.filter((r) => reminderBucket(r, todayKey) === "today");
}

/** Próximos N dias, para o cartão de agenda do Dashboard. */
export function remindersUpcoming(reminders: Reminder[], days: number, todayKey: string = saoPauloTodayKey()): Reminder[] {
  const limitKey = addDaysToDateKey(todayKey, days);
  return reminders.filter((r) => {
    if (reminderBucket(r, todayKey) !== "upcoming" || !r.due_at) return false;
    const k = saoPauloDateKey(r.due_at);
    return k <= limitKey;
  });
}
