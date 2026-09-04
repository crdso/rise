import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useFinanceStore } from "@/lib/store/financeStore";
import type { Account, Category, Transaction } from "@/types/finance";

// Unified service that works in demo (store) and supabase (API)
// For now demo uses store directly; supabase routes will be implemented.

function uid() { return crypto.randomUUID(); }

export const financeService = {
  // Accounts
  listAccounts(): Account[] {
    return useFinanceStore.getState().accounts;
  },
  createAccount(data: Omit<Account, "id" | "created_at" | "updated_at">): Account {
    const now = new Date().toISOString();
    const acc: Account = { id: uid(), created_at: now, updated_at: now, ...data };
    useFinanceStore.getState().upsertAccount(acc);
    useFinanceStore.getState().pushAudit({ id: uid(), actor: "Você", action: "criou uma conta", entity: "account", entity_id: acc.id, after: acc, origin: "web", created_at: now });
    return acc;
  },
  updateAccount(id: string, patch: Partial<Account>): Account | null {
    const s = useFinanceStore.getState();
    const prev = s.accounts.find(a => a.id === id);
    if (!prev) return null;
    const next = { ...prev, ...patch, updated_at: new Date().toISOString() };
    s.upsertAccount(next);
    const changed: Record<string, unknown> = {};
    (Object.keys(patch) as (keyof Account)[]).forEach(k => { if (prev[k] !== patch[k]) changed[k] = { from: prev[k], to: patch[k] }; });
    s.pushAudit({ id: uid(), actor: "Você", action: patch.is_active === false ? "desativou uma conta" : patch.is_active === true ? "ativou uma conta" : "editou uma conta", entity: "account", entity_id: id, before: prev, after: next, origin: "web", created_at: new Date().toISOString() });
    return next;
  },

  // Categories
  listCategories(): Category[] { return useFinanceStore.getState().categories; },
  ensureCategory(name: string): Category {
    const s = useFinanceStore.getState();
    const found = s.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (found) return found;
    const cat: Category = { id: uid(), name: name.trim(), icon: null, color: null, created_at: new Date().toISOString() };
    s.upsertCategory(cat);
    return cat;
  },

  // Transactions
  listTransactions(): Transaction[] { return useFinanceStore.getState().transactions; },
  createTransaction(data: Omit<Transaction, "id" | "created_at" | "updated_at">): Transaction {
    const now = new Date().toISOString();
    let category_id = data.category_id ?? null;
    // if no category_id but we have a name-like handling via service? caller handles
    const tx: Transaction = { id: uid(), created_at: now, updated_at: now, ...data, category_id };
    useFinanceStore.getState().upsertTransaction(tx);
    const cat = useFinanceStore.getState().categories.find(c => c.id === tx.category_id);
    useFinanceStore.getState().pushAudit({ id: uid(), actor: "Você", action: tx.type === "expense" ? "criou uma despesa" : "criou uma receita", entity: "transaction", entity_id: tx.id, after: { amount: tx.amount, category: cat?.name, type: tx.type }, origin: "web", created_at: now });
    return tx;
  },
  updateTransaction(id: string, patch: Partial<Transaction>): Transaction | null {
    const s = useFinanceStore.getState();
    const prev = s.transactions.find(t => t.id === id);
    if (!prev) return null;
    const next = { ...prev, ...patch, updated_at: new Date().toISOString() };
    s.upsertTransaction(next);
    s.pushAudit({ id: uid(), actor: "Você", action: "editou uma transação", entity: "transaction", entity_id: id, before: prev, after: next, origin: "web", created_at: new Date().toISOString() });
    return next;
  },
  deleteTransaction(id: string) {
    const s = useFinanceStore.getState();
    const prev = s.transactions.find(t => t.id === id);
    if (!prev) return;
    s.removeTransaction(id);
    s.pushAudit({ id: uid(), actor: "Você", action: "excluiu uma transação", entity: "transaction", entity_id: id, before: prev, origin: "web", created_at: new Date().toISOString() });
  }
};
