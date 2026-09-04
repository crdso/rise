"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { debtPaymentSchema } from "@/lib/validators/debt";
import { useFinanceStore } from "@/lib/store/financeStore";
import { AccountPicker } from "@/components/rise/AccountPicker";
import { useDebtStore } from "@/lib/store/debtStore";
import { debtRemaining } from "@/lib/store/debtStore";
import { formatBRL } from "@/lib/utils";
import type { Debt, DebtInstallment } from "@/types/debt";

export function PaymentDialog({ open, onClose, onPay, debt, installments }: { open: boolean; onClose: () => void; onPay: (data: { amount: number; notes?: string | null; create_transaction?: boolean; account_id?: string | null; transaction_category?: string | null; installment_id?: string | null }) => Promise<void>; debt: Debt | null; installments: DebtInstallment[] }) {
  const { accounts } = useFinanceStore();
  const { payments } = useDebtStore();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [createTx, setCreateTx] = useState(true);
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [inst, setInst] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const remaining = debt ? debtRemaining(debt, payments) : 0;
  const instRemaining = (() => {
    if (!inst) return null;
    const i = installments.find(x=>x.id===inst);
    if (!i) return null;
    const paid = payments.filter(p=>p.installment_id===inst).reduce((s,p)=>s+p.amount,0);
    return { inst: i, paid, remaining: i.amount - paid };
  })();

  useEffect(() => {
    if (open && debt) {
      setAmount(""); setNotes(""); setCreateTx(true); setAccount(accounts.find(a=>a.is_active)?.id || ""); setCategory(""); setInst(""); setErr(""); setLoading(false);
    }
  }, [open, debt, accounts]);

  const submit = async () => {
    const val = Number(amount.replace(",","."));
    const limit = instRemaining ? instRemaining.remaining : remaining;
    if (val > limit + 0.005) { setErr(`Valor maior que o restante (${formatBRL(limit)})`); return; }
    const parsed = debtPaymentSchema.safeParse({ amount: val, notes: notes||null, create_transaction: createTx, account_id: account||null, transaction_category: category||null, installment_id: inst||null });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message||"Verifique"); return; }
    setLoading(true);
    setErr("");
    try {
      await onPay({ amount: parsed.data.amount, notes: parsed.data.notes||null, create_transaction: !!parsed.data.create_transaction, account_id: parsed.data.account_id||null, transaction_category: parsed.data.transaction_category||null, installment_id: parsed.data.installment_id||null });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Falha ao registrar pagamento");
    } finally {
      setLoading(false);
    }
  };

  if (!debt) return null;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity:0, y:18, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:10, scale:0.98 }} className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[440px] rounded-t-[22px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--elevated)] p-5 pb-[calc(1rem+var(--sab))] shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Registrar pagamento — {debt.person}</h3>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-1.5 text-xs text-[var(--muted-foreground)]">Restante: {formatBRL(remaining)} {instRemaining ? `· Parcela ${instRemaining.inst.installment_number} restante ${formatBRL(instRemaining.remaining)} (pago ${formatBRL(instRemaining.paid)})` : ""}</div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Valor (R$)</label>
                <Input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="100,00" inputMode="decimal" className="mt-1" />
                {Number(amount.replace(",",".")) > (instRemaining ? instRemaining.remaining : remaining) +0.005 && <p className="text-xs text-[var(--negative)] mt-1">Valor maior que o restante</p>}
              </div>
              {installments.length>0 && (
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Parcela (opcional)</label>
                  <select value={inst} onChange={e=>setInst(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm">
                    <option value="">Sem parcela específica</option>
                    {installments.map(i=> <option key={i.id} value={i.id}>{i.installment_number}/{installments.length} — {i.due_date} — R$ {Number(i.amount).toFixed(2)} — {i.status}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Observações</label>
                <Input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Opcional" className="mt-1" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={createTx} onChange={e=>setCreateTx(e.target.checked)} className="h-4 w-4" />
                Registrar também nas transações {debt.kind==="owed" ? "(gasto)" : "(receita)"}
              </label>
              {createTx && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--card-soft)] border border-[var(--border)]">
                  <div className="col-span-2">
                    <AccountPicker accounts={accounts} value={account} onChange={setAccount} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Categoria</label>
                    <Input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Outros" className="mt-1" />
                  </div>
                </div>
              )}
              {err && <p className="text-xs text-[var(--negative)]">{err}</p>}
              <Button onClick={submit} disabled={loading} className="w-full rounded-full">{loading ? "Registrando..." : "Confirmar pagamento"}</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
