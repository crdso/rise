import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useFinanceStore } from "@/lib/store/financeStore";
import type { Account, Category, Transaction } from "@/types/finance";
import { FINANCIAL_BRANDS } from "@/lib/brands/registry";

function uid() { return crypto.randomUUID(); }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `API ${r.status}`);
  return j.data as T;
}

function inferBrand(name: string): { brand_domain: string | null; brand_key: string | null } {
  const norm = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(FINANCIAL_BRANDS)) {
    if (norm.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(norm)) return { brand_domain: v.domain, brand_key: k };
  }
  return { brand_domain: null, brand_key: null };
}

// Demo helpers (local store)
function demoCreateAccount(data: Omit<Account, "id" | "created_at" | "updated_at">): Account {
  const now = new Date().toISOString();
  const inferred = !data.brand_domain && !data.brand_key ? inferBrand(data.name) : { brand_domain: data.brand_domain || null, brand_key: data.brand_key || null };
  const acc: Account = { id: uid(), created_at: now, updated_at: now, ...data, brand_domain: inferred.brand_domain, brand_key: inferred.brand_key };
  useFinanceStore.getState().upsertAccount(acc);
  useFinanceStore.getState().pushAudit({ id: uid(), actor: "Você", action: "criou uma conta", entity: "account", entity_id: acc.id, after: acc, origin: "web", created_at: now });
  return acc;
}
function demoUpdateAccount(id: string, patch: Partial<Account>): Account | null {
  const s = useFinanceStore.getState();
  const prev = s.accounts.find((a) => a.id === id);
  if (!prev) return null;
  const next = { ...prev, ...patch, updated_at: new Date().toISOString() };
  s.upsertAccount(next);
  s.pushAudit({ id: uid(), actor: "Você", action: patch.is_active === false ? "desativou uma conta" : patch.is_active === true ? "ativou uma conta" : "editou uma conta", entity: "account", entity_id: id, before: prev, after: next, origin: "web", created_at: new Date().toISOString() });
  return next;
}

export const financeService = {
  // Accounts - unified
  listAccounts(): Account[] {
    return useFinanceStore.getState().accounts;
  },
  async createAccount(data: Omit<Account, "id" | "created_at" | "updated_at">): Promise<Account> {
    const enriched = { ...data } as Omit<Account, "id" | "created_at" | "updated_at">;
    if (!enriched.brand_domain && !enriched.brand_key) {
      const inf = inferBrand(enriched.name);
      enriched.brand_domain = inf.brand_domain;
      enriched.brand_key = inf.brand_key;
    }
    if (!isSupabaseConfigured()) return demoCreateAccount(enriched);
    const created = await api<Account>("/api/accounts", { method: "POST", body: JSON.stringify(enriched) });
    useFinanceStore.getState().upsertAccount(created);
    return created;
  },
  async updateAccount(id: string, patch: Partial<Account>): Promise<Account | null> {
    if (!isSupabaseConfigured()) return demoUpdateAccount(id, patch);
    const updated = await api<Account>(`/api/accounts/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    useFinanceStore.getState().upsertAccount(updated);
    return updated;
  },

  // Categories
  listCategories(): Category[] {
    return useFinanceStore.getState().categories;
  },
  ensureCategory(name: string): Category {
    const s = useFinanceStore.getState();
    const found = s.categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (found) return found;
    const cat: Category = { id: uid(), name: name.trim(), icon: null, color: null, created_at: new Date().toISOString() };
    s.upsertCategory(cat);
    return cat;
  },
  async ensureCategoryAsync(name: string): Promise<Category> {
    if (!isSupabaseConfigured()) return this.ensureCategory(name);
    // Supabase mode: não criar local antes do servidor
    const cat = await api<Category>("/api/categories", { method: "POST", body: JSON.stringify({ name: name.trim() }) });
    useFinanceStore.getState().upsertCategory(cat);
    return cat;
  },

  // Transactions - unified
  listTransactions(): Transaction[] {
    return useFinanceStore.getState().transactions;
  },
  async createTransaction(data: Omit<Transaction, "id" | "created_at" | "updated_at">): Promise<Transaction> {
    if (!isSupabaseConfigured()) {
      const now = new Date().toISOString();
      const tx: Transaction = { id: uid(), created_at: now, updated_at: now, ...data };
      useFinanceStore.getState().upsertTransaction(tx);
      const cat = useFinanceStore.getState().categories.find((c) => c.id === tx.category_id);
      useFinanceStore.getState().pushAudit({ id: uid(), actor: "Você", action: tx.type === "expense" ? "criou uma despesa" : "criou uma receita", entity: "transaction", entity_id: tx.id, after: { amount: tx.amount, category: cat?.name, type: tx.type }, origin: "web", created_at: now });
      return tx;
    }
    const created = await api<Transaction>("/api/transactions", { method: "POST", body: JSON.stringify(data) });
    useFinanceStore.getState().upsertTransaction(created);
    return created;
  },
  async updateTransaction(id: string, patch: Partial<Transaction>): Promise<Transaction | null> {
    if (!isSupabaseConfigured()) {
      const s = useFinanceStore.getState();
      const prev = s.transactions.find((t) => t.id === id);
      if (!prev) return null;
      const next = { ...prev, ...patch, updated_at: new Date().toISOString() };
      s.upsertTransaction(next);
      s.pushAudit({ id: uid(), actor: "Você", action: "editou uma transação", entity: "transaction", entity_id: id, before: prev, after: next, origin: "web", created_at: new Date().toISOString() });
      return next;
    }
    const updated = await api<Transaction>(`/api/transactions/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    useFinanceStore.getState().upsertTransaction(updated);
    return updated;
  },
  async deleteTransaction(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      const s = useFinanceStore.getState();
      const prev = s.transactions.find((t) => t.id === id);
      if (!prev) return;
      s.removeTransaction(id);
      s.pushAudit({ id: uid(), actor: "Você", action: "excluiu uma transação", entity: "transaction", entity_id: id, before: prev, origin: "web", created_at: new Date().toISOString() });
      return;
    }
    await fetch(`/api/transactions/${id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error("delete failed");
    });
    useFinanceStore.getState().removeTransaction(id);
  },
  async refreshFromServer() {
    if (!isSupabaseConfigured()) return;
    const [accR, txR, catR] = await Promise.all([fetch("/api/accounts"), fetch("/api/transactions"), fetch("/api/categories")]);
    if (!accR.ok) throw new Error(`Accounts sync failed: ${accR.status}`);
    if (!txR.ok) throw new Error(`Transactions sync failed: ${txR.status}`);
    if (!catR.ok) throw new Error(`Categories sync failed: ${catR.status}`);
    const [accRes, txRes, catRes] = await Promise.all([accR.json(), txR.json(), catR.json()]);
    if (accRes.error) throw new Error(accRes.error);
    if (txRes.error) throw new Error(txRes.error);
    // substituir snapshot inteiro para remover stale
    const { setAccounts, setTransactions, setCategories } = useFinanceStore.getState();
    if (Array.isArray(accRes.data)) setAccounts(accRes.data);
    if (Array.isArray(txRes.data)) setTransactions(txRes.data);
    if (Array.isArray(catRes.data)) setCategories(catRes.data);
  },
};
