"use client";
import { useState } from "react";
import { useFinanceStore, calcAccountBalance } from "@/lib/store/financeStore";
import { financeService } from "@/lib/services/finance";
import { AccountDialog } from "@/components/rise/AccountDialog";
import { FinanceNav } from "@/components/rise/FinanceNav";
import { BrandLogo } from "@/components/rise/BrandLogo";
import { brandForAccount } from "@/lib/brands/registry";
import { Button } from "@/components/ui/button";
import { Plus, EyeOff, Eye, Pencil } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export default function ContasPage() {
  const { accounts, transactions } = useFinanceStore();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const initial = editing ? accounts.find(a=>a.id===editing) || null : null;

  const handleSave = async (data: { name: string; type: import("@/types/finance").AccountType; color: string; initial_balance: number }) => {
    try {
      if (editing) {
        await financeService.updateAccount(editing, data);
        push({ title: "Conta atualizada" });
      } else {
        await financeService.createAccount(data as never);
        push({ title: "Conta criada", desc: data.name });
      }
      setEditing(null);
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "Falha", variant: "error" });
      throw e; // mantém o dialog aberto com os dados preenchidos
    }
  };

  return (
    <div className="space-y-6">
      <FinanceNav />
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Contas</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Saldo calculado pelas transações. Ajuste via saldo inicial auditado.</p>
        </div>
        <Button size="sm" className="rounded-full" onClick={()=>{ setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Nova conta</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {accounts.map((a) => {
          const bal = calcAccountBalance(a, transactions);
          return (
            <div key={a.id} className={`rounded-[18px] border p-4 flex flex-col gap-3 ${!a.is_active ? "opacity-60 bg-[var(--card-soft)] border-dashed" : "bg-[var(--card)] border-[var(--border)]"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {(() => { const b = brandForAccount(a); const generic = !b.domain && (a.type === "cash" || a.type === "wallet"); return <BrandLogo domain={b.domain} name={b.domain ? b.name : a.name} color={b.color || a.color} size={36} generic={generic} />; })()}
                  <div>
                    <p className="text-sm font-semibold leading-none">{a.name}</p>
                    <p className="text-xs text-[var(--faint)]">{a.type}</p>
                  </div>
                </div>
                <button onClick={()=>{ setEditing(a.id); setOpen(true); }} className="h-7 w-7 rounded-full bg-[var(--card-soft)] grid place-items-center"><Pencil className="h-3.5 w-3.5" /></button>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--faint)]">Saldo atual</p>
                <p className="text-lg font-bold tracking-tight">{formatBRL(bal)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Inicial {formatBRL(a.initial_balance)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="rounded-full flex-1" onClick={async ()=>{ try { await financeService.updateAccount(a.id, { is_active: !a.is_active }); push({ title: a.is_active ? "Conta desativada" : "Conta ativada" }); } catch (e: unknown) { push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" }); } }}>
                  {a.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {a.is_active ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <AccountDialog open={open} onClose={()=>{ setOpen(false); setEditing(null); }} onSave={handleSave} initial={initial} />
    </div>
  );
}

