"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Account, Category, Transaction, AuditEntry } from "@/types/finance";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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
  clearForSupabase: () => void;
};

// Storage que só persiste em demo mode. Em Supabase mode, retorna null e não grava.
const demoStorage = {
  getItem: (name: string) => {
    if (isSupabaseConfigured()) return null;
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name: string, value: string) => {
    if (isSupabaseConfigured()) return;
    try { localStorage.setItem(name, value); } catch {}
  },
  removeItem: (name: string) => {
    try { localStorage.removeItem(name); } catch {}
  },
};

const isSupabase = isSupabaseConfigured();

export const useFinanceStore = create<State>()(
  persist(
    (set) => ({
      accounts: isSupabase ? [] : DEFAULT_ACCOUNTS,
      categories: isSupabase ? [] : DEFAULT_CATEGORIES,
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
        if (s.categories.find(x => x.name.toLowerCase().trim() === c.name.toLowerCase().trim())) return s;
        return { categories: [c, ...s.categories] };
      }),
      upsertTransaction: (t) => set((s) => {
        const exists = s.transactions.find(x => x.id === t.id);
        return { transactions: exists ? s.transactions.map(x => x.id === t.id ? t : x) : [t, ...s.transactions].sort((a,b) => +new Date(b.occurred_at) - +new Date(a.occurred_at)) };
      }),
      removeTransaction: (id) => set((s) => ({ transactions: s.transactions.filter(x => x.id !== id) })),
      pushAudit: (a) => set((s) => ({ audits: [a, ...s.audits].slice(0, 200) })),
      clearForSupabase: () => set({ accounts: [], categories: [], transactions: [], audits: [] }),
    }),
    {
      name: "rise_finance_demo_v2",
      storage: createJSONStorage(() => demoStorage),
      partialize: (s) => ({ accounts: s.accounts, categories: s.categories, transactions: s.transactions, audits: s.audits }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
      skipHydration: false,
    }
  )
);

// Se entrar em Supabase mode, limpa cache demo que possa ter piscado antes do fetch
if (typeof window !== "undefined" && isSupabaseConfigured()) {
  // não carregar dados demo antigos em sessão Supabase
  try {
    const raw = localStorage.getItem("rise_finance_v1");
    if (raw) localStorage.removeItem("rise_finance_v1");
  } catch {}
}

// helpers
export function calcBalance(accounts: Account[], transactions: Transaction[]) {
  let total = 0;
  const byAccount = new Map<string, number>();
  for (const a of accounts) {
    const bal = calcAccountBalance(a, transactions);
    byAccount.set(a.id, bal);
    if (a.is_active) total += bal;
  }
  return { total, byAccount };
}

export function calcAccountBalance(acc: Account, txs: Transaction[]) {
  let bal = acc.initial_balance;
  for (const t of txs) if (t.account_id === acc.id) {
    bal += t.type === "income" ? t.amount : -t.amount;
  }
  return bal;
}

// Analytics helpers para gastos como foco (não só saldo)
export function spendingByCategory(transactions: Transaction[], categories: Category[], month?: Date) {
  const target = month || new Date();
  const m = target.getMonth(), y = target.getFullYear();
  const filtered = transactions.filter(t => t.type === "expense" && new Date(t.occurred_at).getMonth()===m && new Date(t.occurred_at).getFullYear()===y);
  const total = filtered.reduce((s,t)=>s+t.amount,0);
  const byCat: Record<string, { name: string; amount: number; pct: number }> = {};
  for (const t of filtered) {
    const name = categories.find(c=>c.id===t.category_id)?.name || "Outros";
    byCat[name] = byCat[name] || { name, amount: 0, pct: 0 };
    byCat[name].amount += t.amount;
  }
  Object.values(byCat).forEach(v => v.pct = total ? (v.amount/total)*100 : 0);
  return { total, byCat: Object.values(byCat).sort((a,b)=>b.amount-a.amount) };
}
