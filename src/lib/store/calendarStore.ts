"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CalendarEvent } from "@/types/calendar";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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

type State = {
  events: CalendarEvent[];
  _hasHydrated: boolean;
  setHydrated: (v: boolean) => void;
  upsertEvent: (e: CalendarEvent) => void;
  setEvents: (e: CalendarEvent[]) => void;
  removeEvent: (id: string) => void;
  clearForSupabase: () => void;
};

export const useCalendarStore = create<State>()(
  persist(
    (set) => ({
      events: [],
      _hasHydrated: false,
      setHydrated: (v) => set({ _hasHydrated: v }),
      upsertEvent: (e) => set((s) => {
        const exists = s.events.find(x=>x.id===e.id);
        const next = exists ? s.events.map(x=>x.id===e.id?e:x) : [...s.events, e];
        return { events: next.sort((a,b)=> +new Date(a.starts_at)-+new Date(b.starts_at)) };
      }),
      setEvents: (e) => set({ events: e.sort((a,b)=> +new Date(a.starts_at)-+new Date(b.starts_at)) }),
      removeEvent: (id) => set((s)=> ({ events: s.events.filter(x=>x.id!==id) })),
      clearForSupabase: () => set({ events: [] }),
    }),
    {
      name: "rise_calendar_demo_v1",
      storage: createJSONStorage(() => demoStorage),
      partialize: (s) => ({ events: s.events }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);
