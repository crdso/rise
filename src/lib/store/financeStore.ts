"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Account, Category, Transaction, AuditEntry } from "@/types/finance";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "c1", name: "Alimentação", icon: "Utensils", color: "#F59E0B", created_at: new Date().toISOString() },
  { id: "c2", name: "Transporte", icon: "Car", color: "#3B82F6", created_at: new Date().toISOString() },
  { id: "c3", name: "Compras", icon: "ShoppingBag", color: "#EC4899", created_at: new Date().toISOString() },
  { id: "c4", name: "Lazer", icon: "Gamepad2", color: "#8B5CF6", created_at: new Date().toISOString() },
  { id: "c5", name: "Assinaturas", icon: "Smartphone", color: "#06B6D4", created_at: new Date().toISOString() },
  { id: "c6", name: "Escola", icon: "GraduationCap", color: "#10B981", created_at: new Date().toISOString() },
  { id: "c7", name: "Tecnologia", icon: "Laptop", color: "#6366F1", created_at: new Date().toISOString() },
  { id: "c8", name: "Presentes", icon: "Heart", color: "#EF4444", created_at: new Date().toISOString() },
  { id: "c9", name: "Casa", icon: "Home", color: "#84CC16", created_at: new Date().toISOString() },
  { id: "c10", name: "Outros", icon: "Package", color: "#6B7280", created_at: new Date().toISOString() },
];

const DEFAULT_ACCOUNTS: Account[] = [
  { id: "acc-inter", name: "Inter", icon: "inter", type: "checking", color: "#FF6A30", initial_balance: 0, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "acc-nubank", name: "Nubank", icon: "nubank", type: "checking", color: "#820AD1", initial_balance: 0, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "acc-mp", name: "Mercado Pago", icon: "mercadopago", type: "wallet", color: "#00A9FF", initial_balance: 0, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "acc-bb", name: "Banco do Brasil", icon: "bb", type: "checking", color: "#FACC15", initial_balance: 0, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

type State = {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  audits: AuditEntry[];
  _hasHydrated: boolean;
  setHydrated: (v: boolean) => void;
  upsertAccount: (a: Account) => void;
  removeAccount: (id: string) => void;
  upsertCategory: (c: Category) => void;
  upsertTransaction: (t: Transaction) => void;
  removeTransaction: (id: string) => void;
  pushAudit: (a: AuditEntry) => void;
};

export const useFinanceStore = create<State>()(
  persist(
    (set, get) => ({
      accounts: DEFAULT_ACCOUNTS,
      categories: DEFAULT_CATEGORIES,
      transactions: [],
      audits: [],
      _hasHydrated: false,
      setHydrated: (v) => set({ _hasHydrated: v }),
      upsertAccount: (a) => set((s) => {
        const exists = s.accounts.find(x => x.id === a.id);
        return { accounts: exists ? s.accounts.map(x => x.id === a.id ? a : x) : [a, ...s.accounts] };
      }),
      removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter(x => x.id !== id) })),
      upsertCategory: (c) => set((s) => {
        const exists = s.categories.find(x => x.id === c.id);
        if (exists) return { categories: s.categories.map(x => x.id === c.id ? c : x) };
        // deduplicate by name
        if (s.categories.find(x => x.name.toLowerCase() === c.name.toLowerCase())) return s;
        return { categories: [c, ...s.categories] };
      }),
      upsertTransaction: (t) => set((s) => {
        const exists = s.transactions.find(x => x.id === t.id);
        return { transactions: exists ? s.transactions.map(x => x.id === t.id ? t : x) : [t, ...s.transactions].sort((a,b) => +new Date(b.occurred_at) - +new Date(a.occurred_at)) };
      }),
      removeTransaction: (id) => set((s) => ({ transactions: s.transactions.filter(x => x.id !== id) })),
      pushAudit: (a) => set((s) => ({ audits: [a, ...s.audits].slice(0, 200) })),
    }),
    {
      name: "rise_finance_v1",
      partialize: (s) => ({ accounts: s.accounts, categories: s.categories, transactions: s.transactions, audits: s.audits }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    }
  )
);

// helpers
export function calcBalance(accounts: Account[], transactions: Transaction[]) {
  const map = new Map<string, number>();
  for (const a of accounts) map.set(a.id, a.initial_balance);
  let total = 0;
  for (const a of accounts) if (a.is_active) total += a.initial_balance;
  for (const t of transactions) {
    if (t.type === "income") total += t.amount;
    else total -= t.amount;
  }
  return { total, byAccount: map };
}

export function calcAccountBalance(acc: Account, txs: Transaction[]) {
  let bal = acc.initial_balance;
  for (const t of txs) if (t.account_id === acc.id) {
    bal += t.type === "income" ? t.amount : -t.amount;
  }
  return bal;
}
