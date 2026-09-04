"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/rise/EmptyState";
import { Wallet, Trash2, Pencil, Search, TrendingUp, TrendingDown } from "lucide-react";
import { useFinanceStore, calcAccountBalance } from "@/lib/store/financeStore";
import { financeService } from "@/lib/services/finance";
import { formatBRL, formatDate } from "@/lib/utils";
import { TransactionDialog } from "@/components/rise/TransactionDialog";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

export default function FinancasPage() {
  const { transactions, accounts, categories } = useFinanceStore();
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all"|"expense"|"income">("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<"expense"|"income">("expense");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (type !== "all") list = list.filter(t=>t.type===type);
    if (q.trim()) {
      const qq = q.toLowerCase();
      list = list.filter(t=> (t.description||"").toLowerCase().includes(qq) || (categories.find(c=>c.id===t.category_id)?.name||"").toLowerCase().includes(qq));
    }
    return list;
  }, [transactions, q, type, categories]);

  const totals = useMemo(() => {
    const exp = filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
    const inc = filtered.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
    return { exp, inc, bal: inc-exp };
  }, [filtered]);

  const totalBalance = useMemo(() => {
    let bal = 0;
    for (const a of accounts) if (a.is_active) bal += calcAccountBalance(a, transactions);
    // alternative: sum via calc: initial + incomes - expenses
    const incomes = transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
    const expenses = transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
    const initials = accounts.filter(a=>a.is_active).reduce((s,a)=>s+a.initial_balance,0);
    return initials + incomes - expenses;
  }, [accounts, transactions]);

  const handleSave = (data: Parameters<typeof financeService.createTransaction>[0]) => {
    const d = data as unknown as { category_name?: string | null; category_id?: string | null; type: "expense" | "income"; amount: number };
    if (editId) {
      financeService.updateTransaction(editId, data as never);
      push({ title: "Transação atualizada" });
      setEditId(null);
    } else {
      if (d.category_name) {
        const cat = financeService.ensureCategory(d.category_name);
        (data as unknown as { category_id: string | null }).category_id = cat.id;
      }
      financeService.createTransaction(data as never);
      push({ title: d.type === "expense" ? "Gasto adicionado" : "Receita adicionada", desc: formatBRL(d.amount) });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Finanças</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Fonte da verdade: transações + saldo inicial.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="rounded-full" onClick={()=>{ setDefaultType("expense"); setEditId(null); setOpen(true); }}><Wallet className="h-4 w-4" /> Gasto</Button>
          <Button size="sm" variant="soft" className="rounded-full" onClick={()=>{ setDefaultType("income"); setEditId(null); setOpen(true); }}><TrendingUp className="h-4 w-4" /> Receita</Button>
          <Link href="/financas/contas" className="h-9 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 inline-flex items-center text-sm font-medium">Contas</Link>
        </div>
      </div>

      <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-soft)] p-4 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--faint)]">Saldo total</p>
          <p className="text-xl font-bold">{formatBRL(totalBalance)}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="inline-flex items-center gap-1 text-red-600"><TrendingDown className="h-4 w-4" /> {formatBRL(totals.exp)}</span>
          <span className="inline-flex items-center gap-1 text-emerald-600"><TrendingUp className="h-4 w-4" /> {formatBRL(totals.inc)}</span>
          <span className={`font-bold ${totals.bal>=0?"text-emerald-600":"text-red-600"}`}>{formatBRL(totals.bal)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] p-1">
          {(["all","expense","income"] as const).map(t=>(
            <button key={t} onClick={()=>setType(t)} className={`px-3.5 py-1.5 rounded-full text-xs font-medium ${type===t?"bg-[var(--accent)] text-white":"text-[var(--muted-foreground)]"}`}>{t==="all"?"Tudo":t==="expense"?"Gastos":"Receitas"}</button>
          ))}
        </div>
        <div className="flex-1 min-w-[180px] relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar descrição ou categoria" className="w-full h-9 rounded-full border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]" />
        </div>
      </div>

      {filtered.length===0 ? (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-6">
          <EmptyState title="Sem transações" desc="Crie seu primeiro gasto ou receita. Use o Quick Add também." action={<Button size="sm" onClick={()=>{ setDefaultType("expense"); setOpen(true); }}><Wallet className="h-4 w-4" /> Adicionar gasto</Button>} />
        </div>
      ) : (
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] overflow-hidden divide-y divide-[var(--border)]">
          {filtered.slice(0,50).map((t) => {
            const cat = categories.find(c=>c.id===t.category_id);
            const acc = accounts.find(a=>a.id===t.account_id);
            return (
              <div key={t.id} className="p-4 flex items-center gap-3 hover:bg-[var(--card-soft)] transition-colors">
                <div className={`h-9 w-9 rounded-xl grid place-items-center text-white text-xs font-bold shrink-0 ${t.type==="expense"?"bg-red-500":"bg-emerald-500"}`}>{t.type==="expense"?"-":"+"}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description || (cat?.name || "Sem categoria")} <span className="text-xs text-[var(--faint)]">· {cat?.name || "Outros"}</span></p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">{formatDate(t.occurred_at, { withTime: true })} {acc ? `· ${acc.name}` : ""} {t.payment_method ? `· ${t.payment_method}` : ""}</p>
                </div>
                <p className={`text-sm font-bold shrink-0 ${t.type==="expense"?"text-red-600":"text-emerald-600"}`}>{t.type==="expense"?"-":"+"} {formatBRL(t.amount)}</p>
                <div className="flex gap-1 shrink-0">
                  <button onClick={()=>{ setEditId(t.id); setDefaultType(t.type); setOpen(true); }} className="h-8 w-8 rounded-full bg-[var(--card-soft)] border border-[var(--border)] grid place-items-center"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={()=> setConfirmId(t.id)} className="h-8 w-8 rounded-full bg-[var(--card-soft)] border border-[var(--border)] grid place-items-center text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TransactionDialog open={open} onClose={()=>{ setOpen(false); setEditId(null); }} onSave={handleSave} initial={editId ? transactions.find(t=>t.id===editId) || null : null} defaultType={defaultType} />

      {confirmId && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setConfirmId(null)} />
          <div className="relative w-full max-w-[360px] rounded-2xl bg-[var(--card)] border border-[var(--border)] p-5 shadow-xl">
            <h3 className="font-semibold text-sm">Excluir transação?</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">Essa ação não pode ser desfeita e será auditada.</p>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={()=>setConfirmId(null)}>Cancelar</Button>
              <Button size="sm" className="rounded-full bg-red-600 hover:bg-red-700 text-white" onClick={()=>{ financeService.deleteTransaction(confirmId); setConfirmId(null); push({ title: "Transação excluída", variant: "success" }); }}>Excluir</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

