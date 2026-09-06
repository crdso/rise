"use client";
import { useEffect, useMemo, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { useFinanceStore, calcAccountBalance } from "@/lib/store/financeStore";
import { financeService } from "@/lib/services/finance";
import { AccountDialog } from "@/components/rise/AccountDialog";
import { FinanceNav } from "@/components/rise/FinanceNav";
import { BrandLogo } from "@/components/rise/BrandLogo";
import { brandForAccount } from "@/lib/brands/registry";
import { Button } from "@/components/ui/button";
import { Plus, EyeOff, Eye, Pencil, Wallet, GripVertical } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { totalBalance } from "@/lib/finance/analytics";
import { ACCOUNT_TYPE_LABEL } from "@/components/rise/AccountTile";
import { currentMonthKey } from "@/lib/finance/analytics";
import { useFinanceSummary } from "@/lib/finance/useFinanceSummary";

function AccountReorderItem({ account, onDragEnd, children }: { account: import("@/types/finance").Account; onDragEnd: () => void; children: (startDrag: (event: React.PointerEvent) => void) => React.ReactNode }) {
  const controls = useDragControls();
  return <Reorder.Item value={account} dragListener={false} dragControls={controls} onDragEnd={onDragEnd} className={`rounded-[18px] border p-4 flex flex-col gap-3 shadow-sm transition-shadow ${!account.is_active ? "opacity-60 bg-[var(--card-soft)] border-dashed" : "bg-[var(--card)] border-[var(--border)]"}`}>{children((event) => controls.start(event))}</Reorder.Item>;
}

export default function ContasPage() {
  const { accounts, transactions } = useFinanceStore();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [orderedAccounts, setOrderedAccounts] = useState(accounts);
  const summary = useFinanceSummary(currentMonthKey());
  const accountBalances = summary?.accountBalances;
  // Preserve the existing drag-order synchronization with server snapshots.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrderedAccounts(accounts), [accounts]);
  const initial = editing ? accounts.find(a=>a.id===editing) || null : null;
  const activeAccounts = useMemo(() => accounts.filter((account) => account.is_active), [accounts]);
  const activeTotal = summary?.totalBalance ?? totalBalance(accounts, transactions);

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
  const persistOrder = async () => {
    try {
      await financeService.reorderAccounts(orderedAccounts.map((account) => account.id));
    } catch (error) {
      setOrderedAccounts(accounts);
      push({ title: "Não foi possível salvar a ordem", desc: error instanceof Error ? error.message : "Tente novamente.", variant: "error" });
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

      <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-5 sm:flex sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">Saldo total</p>
          <p className={`mt-2 text-[30px] font-semibold tracking-[-0.03em] leading-none tnum ${activeTotal < 0 ? "text-[var(--negative)]" : ""}`}>
            {formatBRL(activeTotal)}
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 text-[13px] text-[var(--muted-foreground)] sm:mt-0">
          <Wallet className="h-4 w-4 text-[var(--accent)]" />
          {activeAccounts.length} {activeAccounts.length === 1 ? "conta ativa" : "contas ativas"}
        </div>
      </section>

      <Reorder.Group axis="y" values={orderedAccounts} onReorder={setOrderedAccounts} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {orderedAccounts.map((a) => {
          const bal = accountBalances?.[a.id] ?? calcAccountBalance(a, transactions);
          return (
            <AccountReorderItem key={a.id} account={a} onDragEnd={persistOrder}>
              {(startDrag) => <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button type="button" onPointerDown={startDrag} aria-label="Arraste para reordenar" className="touch-none cursor-grab rounded p-0.5 text-[var(--faint)] hover:bg-[var(--card-soft)] active:cursor-grabbing"><GripVertical className="h-4 w-4" /></button>
                  {(() => { const b = brandForAccount(a); const generic = !b.domain && (a.type === "cash" || a.type === "wallet"); return <BrandLogo domain={b.domain} name={b.domain ? b.name : a.name} color={b.color || a.color} size={36} generic={generic} />; })()}
                  <div>
                    <p className="text-sm font-semibold leading-none">{a.name}</p>
                    <p className="text-xs text-[var(--faint)]">{ACCOUNT_TYPE_LABEL[a.type]}</p>
                  </div>
                </div>
                <button onClick={()=>{ setEditing(a.id); setOpen(true); }} className="h-7 w-7 rounded-full bg-[var(--card-soft)] grid place-items-center"><Pencil className="h-3.5 w-3.5" /></button>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--faint)]">Saldo atual</p>
                <p className="text-lg font-bold tracking-tight">{formatBRL(bal)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Inicial {formatBRL(a.initial_balance)}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${a.is_active ? "bg-[var(--positive)]/10 text-[var(--positive)]" : "bg-[var(--card-soft)] text-[var(--muted-foreground)]"}`}>
                  {a.is_active ? "Ativa" : "Inativa"}
                </span>
                <Button variant="ghost" size="sm" className="rounded-full flex-1" onClick={async ()=>{ try { await financeService.updateAccount(a.id, { is_active: !a.is_active }); push({ title: a.is_active ? "Conta desativada" : "Conta ativada" }); } catch (e: unknown) { push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" }); } }}>
                  {a.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {a.is_active ? "Desativar" : "Ativar"}
                </Button>
              </div>
              </>}
            </AccountReorderItem>
          );
        })}
      </Reorder.Group>

      {accounts.length === 0 && (
        <div className="rounded-[18px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] px-5 py-8 text-center text-[13px] text-[var(--muted-foreground)]">
          Nenhuma conta cadastrada ainda.
        </div>
      )}

      <AccountDialog open={open} onClose={()=>{ setOpen(false); setEditing(null); }} onSave={handleSave} initial={initial} />
    </div>
  );
}
