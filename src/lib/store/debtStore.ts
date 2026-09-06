"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Debt, DebtPayment, DebtInstallment } from "@/types/debt";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { saoPauloTodayKey } from "@/lib/timezone";

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
      // upsert real por id: um re-sync após pagamento não pode duplicar a linha,
      // porque debtPaidAmount/debtRemaining são derivados da soma de payments.
      upsertPayment: (p) => set((s) => {
        const exists = s.payments.some(x=>x.id===p.id);
        return { payments: exists ? s.payments.map(x=>x.id===p.id?p:x) : [p, ...s.payments] };
      }),
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

// ============================================================
// helpers derivados
// Comparações de vencimento usam SEMPRE o dia civil de São Paulo
// (saoPauloTodayKey), espelhando (now() at time zone 'America/Sao_Paulo')::date do SQL.
// ============================================================

export function debtPaidAmount(debtId: string, payments: DebtPayment[]) {
  return payments.filter(p=>p.debt_id===debtId).reduce((s,p)=>s+p.amount,0);
}

export function debtRemaining(debt: Debt, payments: DebtPayment[]) {
  return Math.max(0, debt.amount - (debt.paid_amount ?? debtPaidAmount(debt.id, payments)));
}

export function installmentPaidAmount(installmentId: string, payments: DebtPayment[]) {
  return payments.filter(p=>p.installment_id===installmentId).reduce((s,p)=>s+p.amount,0);
}

// Precedência igual à do SQL (installment_status na 008): paid -> overdue -> partial -> pending
export function installmentStatus(installment: DebtInstallment, payments: DebtPayment[]): "pending"|"partial"|"paid"|"overdue" {
  const paid = installmentPaidAmount(installment.id, payments);
  if (paid >= installment.amount - 0.005) return "paid";
  const today = saoPauloTodayKey();
  if (installment.due_date < today) return "overdue";
  if (paid > 0) return "partial";
  return "pending";
}

// Precedência igual à do SQL (debt_status na 007 + lógica parcelada na 008):
// paid -> overdue -> partial -> pending
export function debtStatus(debt: Debt, payments: DebtPayment[], installments?: DebtInstallment[]): "pending"|"partial"|"paid"|"overdue" {
  const paid = debt.paid_amount ?? debtPaidAmount(debt.id, payments);
  const remaining = debt.amount - paid;
  if (remaining <= 0.005) return "paid";
  const today = saoPauloTodayKey();
  if (debt.is_installment && installments) {
    const related = installments.filter(i=>i.debt_id===debt.id);
    const hasOverdue = related.some(inst =>
      inst.due_date < today && installmentPaidAmount(inst.id, payments) < inst.amount - 0.005
    );
    if (hasOverdue) return "overdue";
  } else if (debt.due_date) {
    if (debt.due_date < today && remaining > 0.005) return "overdue";
  }
  if (paid > 0) return "partial";
  return "pending";
}
