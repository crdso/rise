"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ImportantItem } from "@/types/important";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type State = {
  items: ImportantItem[];
  _hasHydrated: boolean;
  setHydrated: (v: boolean) => void;
  upsertItem: (i: ImportantItem) => void;
  setItems: (i: ImportantItem[]) => void;
  clearForSupabase: () => void;
};

// Mesmo contrato dos demais stores de dados: local só no modo demonstração.
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

function sortItems(list: ImportantItem[]): ImportantItem[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return +new Date(b.updated_at) - +new Date(a.updated_at);
  });
}

export const useImportantStore = create<State>()(
  persist(
    (set) => ({
      items: [],
      _hasHydrated: false,
      setHydrated: (v) => set({ _hasHydrated: v }),
      upsertItem: (i) =>
        set((s) => {
          const exists = s.items.some((x) => x.id === i.id);
          return { items: sortItems(exists ? s.items.map((x) => (x.id === i.id ? i : x)) : [...s.items, i]) };
        }),
      setItems: (i) => set({ items: sortItems(i) }),
      clearForSupabase: () => set({ items: [] }),
    }),
    {
      name: "rise_important_demo_v1",
      storage: createJSONStorage(() => demoStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);

export const activeItems = (items: ImportantItem[]) => items.filter((i) => !i.archived_at);
export const pinnedItems = (items: ImportantItem[]) => activeItems(items).filter((i) => i.pinned);
export const archivedItems = (items: ImportantItem[]) => items.filter((i) => !!i.archived_at);

/** Etiquetas em uso, para filtros. */
export function itemTags(items: ImportantItem[]): string[] {
  return Array.from(new Set(activeItems(items).map((i) => i.tag).filter((t): t is string => !!t))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}
