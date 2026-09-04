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
export function installmentStatus(installment: DebtInstallment, payments: DebtPayment[]): "pending"|"partial"|"paid"|"overdue" {
  const paid = payments.filter(p=>p.installment_id===installment.id).reduce((s,p)=>s+p.amount,0);
  if (paid >= installment.amount -0.005) return "paid";
  const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).toISOString().slice(0,10);
  if (installment.due_date < todayStr && paid < installment.amount -0.005) {
    if (paid > 0) return "partial"; // will be overridden to overdue with partial? Actually for installment, overdue is separate, but we want partial+overdue? Spec says partial vs overdue distinct, but for installment we show partial then overdue.
    // For installment, partial overdue should be considered overdue if paid>0? But spec says status paid→overdue→partial→pending for debt. For installment, similar: if paid>0 and < amount and overdue -> overdue? Let's follow same: overdue if due < today and remaining>0
    return "overdue";
  }
  if (paid > 0) return "partial";
  const today2 = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).toISOString().slice(0,10);
  if (installment.due_date < today2) return "overdue";
  return "pending";
}

export function debtStatus(debt: Debt, payments: DebtPayment[], installments?: DebtInstallment[]): "pending"|"partial"|"paid"|"overdue" {
  const paid = debtPaidAmount(debt.id, payments);
  const remaining = debt.amount - paid;
  if (remaining <= 0.005) return "paid";
  if (debt.is_installment && installments) {
    const related = installments.filter(i=>i.debt_id===debt.id);
    const hasOverdue = related.some(inst => {
      const paidInst = payments.filter(p=>p.installment_id===inst.id).reduce((s,p)=>s+p.amount,0);
      const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).toISOString().slice(0,10);
      return inst.due_date < todayStr && paidInst < inst.amount -0.005;
    });
    if (hasOverdue) return "overdue";
  } else if (debt.due_date) {
    const todayStr = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).toISOString().slice(0,10);
    if (debt.due_date < todayStr && remaining > 0.005) return "overdue";
  }
  if (paid > 0) return "partial";
  return "pending";
}
