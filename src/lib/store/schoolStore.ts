"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SchoolStatus, SchoolTask, SchoolWorkspace } from "@/types/school";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { saoPauloDateKey, saoPauloTodayKey, addDaysToDateKey } from "@/lib/timezone";

type State = {
  tasks: SchoolTask[];
  workspace: SchoolWorkspace | null;
  _hasHydrated: boolean;
  setHydrated: (v: boolean) => void;
  upsertTask: (t: SchoolTask) => void;
  setTasks: (t: SchoolTask[]) => void;
  setWorkspace: (w: SchoolWorkspace | null) => void;
  clearForSupabase: () => void;
};

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

function sortTasks(list: SchoolTask[]): SchoolTask[] {
  return [...list].sort((a, b) => {
    if (!a.due_at && !b.due_at) return +new Date(b.created_at) - +new Date(a.created_at);
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return +new Date(a.due_at) - +new Date(b.due_at);
  });
}

export const useSchoolStore = create<State>()(
  persist(
    (set) => ({
      tasks: [],
      workspace: null,
      _hasHydrated: false,
      setHydrated: (v) => set({ _hasHydrated: v }),
      upsertTask: (t) =>
        set((s) => {
          const exists = s.tasks.some((x) => x.id === t.id);
          return { tasks: sortTasks(exists ? s.tasks.map((x) => (x.id === t.id ? t : x)) : [...s.tasks, t]) };
        }),
      setTasks: (t) => set({ tasks: sortTasks(t) }),
      setWorkspace: (workspace) => set({ workspace }),
      clearForSupabase: () => set({ tasks: [], workspace: null }),
    }),
    {
      name: "rise_school_demo_v1",
      storage: createJSONStorage(() => demoStorage),
      partialize: (s) => ({ tasks: s.tasks, workspace: s.workspace }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);

/* ---------- derivações ---------- */

/** "overdue" é sempre calculado na leitura — igual aos lembretes. */
export function taskViewStatus(t: SchoolTask, now: Date = new Date()): SchoolStatus {
  if (t.status === "done" || t.status === "archived") return t.status;
  if (t.due_at && new Date(t.due_at).getTime() < now.getTime()) return "overdue";
  return t.status;
}

export type SchoolBucket = "overdue" | "today" | "upcoming" | "undated" | "done" | "archived";

export function taskBucket(t: SchoolTask, todayKey: string = saoPauloTodayKey(), now: Date = new Date()): SchoolBucket {
  if (t.status === "archived") return "archived";
  if (t.status === "done") return "done";
  if (!t.due_at) return "undated";
  const key = saoPauloDateKey(t.due_at);
  if (new Date(t.due_at).getTime() < now.getTime() && key < todayKey) return "overdue";
  if (key === todayKey) return "today";
  if (key < todayKey) return "overdue";
  return "upcoming";
}

export function groupTasks(tasks: SchoolTask[], todayKey: string = saoPauloTodayKey()) {
  const groups: Record<SchoolBucket, SchoolTask[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    undated: [],
    done: [],
    archived: [],
  };
  for (const t of tasks) groups[taskBucket(t, todayKey)].push(t);
  groups.done.sort((a, b) => +new Date(b.completed_at || b.updated_at) - +new Date(a.completed_at || a.updated_at));
  return groups;
}

/** Próximas entregas para o painel. */
export function upcomingTasks(tasks: SchoolTask[], days: number, todayKey: string = saoPauloTodayKey()): SchoolTask[] {
  return tasks.filter((t) => {
    if (t.status === "done" || t.status === "archived" || !t.due_at) return false;
    const key = saoPauloDateKey(t.due_at);
    const b = taskBucket(t, todayKey);
    if (b === "overdue" || b === "today") return true;
    return key <= addDaysToDateKey(todayKey, days);
  });
}
