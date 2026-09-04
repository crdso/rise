"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NotificationPrefs = {
  reminders: boolean;
  debts: boolean;
  events: boolean;
  school: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  reminders: true,
  debts: true,
  events: true,
  school: true,
};

type State = {
  prefs: NotificationPrefs;
  /** ids já vistos — some do contador, continua na lista */
  read: string[];
  /** ids dispensados — some da lista */
  dismissed: string[];
  setPref: (k: keyof NotificationPrefs, v: boolean) => void;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  dismiss: (id: string) => void;
  clearHistory: () => void;
};

/**
 * Estado de leitura das notificações.
 *
 * As notificações em si NÃO são armazenadas: elas são derivadas dos dados
 * reais a cada render (ver lib/notifications.ts). O que persiste aqui é só
 * o que o usuário já viu ou dispensou — por isso é preferência de interface
 * e pode viver em localStorage nos dois modos.
 */
export const useNotificationStore = create<State>()(
  persist(
    (set) => ({
      prefs: DEFAULT_NOTIFICATION_PREFS,
      read: [],
      dismissed: [],
      setPref: (k, v) => set((s) => ({ prefs: { ...s.prefs, [k]: v } })),
      markRead: (id) => set((s) => (s.read.includes(id) ? s : { read: [...s.read, id].slice(-500) })),
      markAllRead: (ids) =>
        set((s) => ({ read: Array.from(new Set([...s.read, ...ids])).slice(-500) })),
      dismiss: (id) => set((s) => ({ dismissed: [...s.dismissed, id].slice(-500), read: [...s.read, id].slice(-500) })),
      clearHistory: () => set({ read: [], dismissed: [] }),
    }),
    {
      name: "rise_notifications_v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ prefs: s.prefs, read: s.read, dismissed: s.dismissed }),
    }
  )
);
