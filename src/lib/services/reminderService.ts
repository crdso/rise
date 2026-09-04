import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useReminderStore } from "@/lib/store/reminderStore";
import {
  toSaoPauloDateTimeLocal,
  isoFromDateKeyAndTime,
  addDaysToDateKey,
  addMonthsToDateKey,
} from "@/lib/timezone";
import type { Reminder, ReminderInput, ReminderStoredRecurrence } from "@/types/reminder";

function uid() { return crypto.randomUUID(); }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : `API ${r.status}`);
  return j.data as T;
}

function normalizeRecurrence(rec?: string | null): ReminderStoredRecurrence | null {
  if (!rec || rec === "none") return null;
  return rec as ReminderStoredRecurrence;
}

/**
 * Próxima ocorrência — espelho exato de public.next_reminder_due (011).
 * O cálculo acontece no horário de parede de São Paulo, então a hora do
 * lembrete é preservada e "mensal" respeita o último dia do mês.
 */
export function nextReminderDue(dueISO: string, recurrence: ReminderStoredRecurrence): string {
  const local = toSaoPauloDateTimeLocal(dueISO); // YYYY-MM-DDTHH:mm em SP
  const [dateKey, time] = local.split("T");
  const nextKey =
    recurrence === "daily" ? addDaysToDateKey(dateKey, 1)
    : recurrence === "weekly" ? addDaysToDateKey(dateKey, 7)
    : addMonthsToDateKey(dateKey, 1);
  return isoFromDateKeyAndTime(nextKey, time);
}

export const reminderService = {
  list(): Reminder[] {
    return useReminderStore.getState().reminders;
  },

  async create(input: ReminderInput): Promise<Reminder> {
    const recurrence = normalizeRecurrence(input.recurrence);
    if (recurrence && !input.due_at) throw new Error("Lembrete recorrente precisa de data");

    if (!isSupabaseConfigured()) {
      const now = new Date().toISOString();
      const rem: Reminder = {
        id: uid(),
        user_id: "demo",
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        due_at: input.due_at || null,
        priority: input.priority,
        status: "pending",
        is_recurring: !!recurrence,
        recurrence,
        completed_at: null,
        parent_id: null,
        created_at: now,
        updated_at: now,
      };
      useReminderStore.getState().upsertReminder(rem);
      return rem;
    }
    const created = await api<Reminder>("/api/reminders", {
      method: "POST",
      body: JSON.stringify({ ...input, recurrence: recurrence ?? "none" }),
    });
    useReminderStore.getState().upsertReminder(created);
    return created;
  },

  async update(id: string, patch: Partial<ReminderInput>): Promise<Reminder> {
    if (!isSupabaseConfigured()) {
      const prev = useReminderStore.getState().reminders.find((r) => r.id === id);
      if (!prev) throw new Error("reminder not found");
      if (prev.parent_id) throw new Error("ocorrência histórica não pode ser editada");
      const recurrence = patch.recurrence !== undefined ? normalizeRecurrence(patch.recurrence) : prev.recurrence ?? null;
      const due_at = patch.due_at !== undefined ? patch.due_at || null : prev.due_at ?? null;
      if (recurrence && !due_at) throw new Error("Lembrete recorrente precisa de data");
      const next: Reminder = {
        ...prev,
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        due_at,
        recurrence,
        is_recurring: !!recurrence,
        updated_at: new Date().toISOString(),
      };
      useReminderStore.getState().upsertReminder(next);
      return next;
    }
    const updated = await api<Reminder>(`/api/reminders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch.recurrence !== undefined ? { ...patch, recurrence: patch.recurrence ?? "none" } : patch),
    });
    useReminderStore.getState().upsertReminder(updated);
    return updated;
  },

  /**
   * Concluir. Em série recorrente com data: fecha a ocorrência atual como
   * histórico (linha nova com parent_id) e avança o mestre — nada se perde.
   * Sem recorrência (ou sem data) apenas fecha.
   */
  async complete(id: string): Promise<Reminder> {
    if (!isSupabaseConfigured()) {
      const store = useReminderStore.getState();
      const prev = store.reminders.find((r) => r.id === id);
      if (!prev) throw new Error("reminder not found");
      if (prev.status !== "pending") throw new Error("lembrete não está pendente");
      const now = new Date().toISOString();

      if (!prev.recurrence || !prev.due_at) {
        const next: Reminder = { ...prev, status: "done", completed_at: now, updated_at: now };
        store.upsertReminder(next);
        return next;
      }
      const occurrence: Reminder = {
        ...prev,
        id: uid(),
        status: "done",
        is_recurring: false,
        recurrence: null,
        completed_at: now,
        parent_id: prev.id,
        created_at: now,
        updated_at: now,
      };
      const advanced: Reminder = { ...prev, due_at: nextReminderDue(prev.due_at, prev.recurrence), updated_at: now };
      store.upsertReminder(occurrence);
      store.upsertReminder(advanced);
      return advanced;
    }
    const updated = await api<Reminder>(`/api/reminders/${id}/complete`, { method: "POST" });
    useReminderStore.getState().upsertReminder(updated);
    // A ocorrência histórica é criada server-side: só aparece com um resync.
    await this.refreshFromServer();
    return updated;
  },

  async reopen(id: string): Promise<Reminder> {
    if (!isSupabaseConfigured()) {
      const store = useReminderStore.getState();
      const prev = store.reminders.find((r) => r.id === id);
      if (!prev) throw new Error("reminder not found");
      if (prev.parent_id) throw new Error("ocorrência histórica não pode ser reaberta");
      if (prev.status === "pending") throw new Error("lembrete já está pendente");
      const next: Reminder = { ...prev, status: "pending", completed_at: null, updated_at: new Date().toISOString() };
      store.upsertReminder(next);
      return next;
    }
    const updated = await api<Reminder>(`/api/reminders/${id}/reopen`, { method: "POST" });
    useReminderStore.getState().upsertReminder(updated);
    return updated;
  },

  async archive(id: string): Promise<Reminder> {
    if (!isSupabaseConfigured()) {
      const store = useReminderStore.getState();
      const prev = store.reminders.find((r) => r.id === id);
      if (!prev) throw new Error("reminder not found");
      const next: Reminder = { ...prev, status: "archived", updated_at: new Date().toISOString() };
      store.upsertReminder(next);
      return next;
    }
    const updated = await api<Reminder>(`/api/reminders/${id}/archive`, { method: "POST" });
    useReminderStore.getState().upsertReminder(updated);
    return updated;
  },

  async refreshFromServer() {
    if (!isSupabaseConfigured()) return;
    const r = await fetch("/api/reminders");
    if (!r.ok) throw new Error("reminders sync failed");
    const j = await r.json();
    if (Array.isArray(j.data)) useReminderStore.getState().setReminders(j.data);
  },
};
