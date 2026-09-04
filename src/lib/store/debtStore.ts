"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Debt, DebtPayment, DebtInstallment } from "@/types/debt";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const isSupabase = isSupabaseConfigured();

type State = {
  debts: Debt[];
  payments: DebtPayment[];
  installments: DebtInstallment[];
  _hasHydrated: boolean;
  setHydrated: (v: boolean) => void;
  upsertDebt: (d: Debt) => void;
  setDebts: (d: Debt[]) => void;
  upsertPayment: (p: DebtPayment) => void;
  setPayments: (p: DebtPayment[]) => void;
  upsertInstallment: (i: DebtInstallment) => void;
  setInstallments: (i: DebtInstallment[]) => void;
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

export const useDebtStore = create<State>()(
  persist(
    (set) => ({
      debts: [],
      payments: [],
      installments: [],
      _hasHydrated: false,
      setHydrated: (v) => set({ _hasHydrated: v }),
      upsertDebt: (d) => set((s) => {
        const exists = s.debts.find(x=>x.id===d.id);
        return { debts: exists ? s.debts.map(x=>x.id===d.id?d:x) : [d, ...s.debts] };
      }),
      setDebts: (d) => set({ debts: d }),
      upsertPayment: (p) => set((s) => ({ payments: [p, ...s.payments] })),
      setPayments: (p) => set({ payments: p }),
      upsertInstallment: (i) => set((s) => {
        const exists = s.installments.find(x=>x.id===i.id);
        return { installments: exists ? s.installments.map(x=>x.id===i.id?i:x) : [...s.installments, i] };
      }),
      setInstallments: (i) => set({ installments: i }),
      clearForSupabase: () => set({ debts: [], payments: [], installments: [] }),
    }),
    {
      name: "rise_debt_demo_v1",
      storage: createJSONStorage(() => demoStorage),
      partialize: (s) => ({ debts: s.debts, payments: s.payments, installments: s.installments }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);

// helpers derivados
export function debtPaidAmount(debtId: string, payments: DebtPayment[]) {
  return payments.filter(p=>p.debt_id===debtId).reduce((s,p)=>s+p.amount,0);
}
export function debtRemaining(debt: Debt, payments: DebtPayment[]) {
  return Math.max(0, debt.amount - debtPaidAmount(debt.id, payments));
}
export function debtStatus(debt: Debt, payments: DebtPayment[]): "pending"|"partial"|"paid"|"overdue" {
  const paid = debtPaidAmount(debt.id, payments);
  const remaining = debt.amount - paid;
  if (remaining <= 0.005) return "paid";
  if (paid > 0) return "partial";
  if (debt.due_date) {
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const due = new Date(debt.due_date + "T00:00:00");
    if (due < new Date(today.toISOString().slice(0,10))) return "overdue";
  }
  return "pending";
}
