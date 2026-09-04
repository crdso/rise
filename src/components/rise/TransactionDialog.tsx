"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { transactionSchema } from "@/lib/validators/finance";
import type { Transaction } from "@/types/finance";
import { useFinanceStore } from "@/lib/store/financeStore";
import { AccountPicker } from "@/components/rise/AccountPicker";
import { toSaoPauloDateTimeLocal, fromSaoPauloDateTimeLocal, nowSaoPauloDateTimeLocal } from "@/lib/timezone";

export function TransactionDialog({ open, onClose, onSave, initial, defaultType }: { open: boolean; onClose: () => void; onSave: (data: { type: "expense" | "income"; amount: number; description: string; account_id: string | null; category_id: string | null; category_name?: string | null; occurred_at: string; notes?: string | null; payment_method?: string | null; is_recurring: boolean }) => Promise<void>; initial?: Transaction | null; defaultType?: "expense" | "income" }) {
  const { categories, accounts } = useFinanceStore();
  const [type, setType] = useState<"expense"|"income">(defaultType || "expense");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [acc, setAcc] = useState("");
  const [date, setDate] = useState(() => nowSaoPauloDateTimeLocal());
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setType(initial.type); setAmount(String(initial.amount).replace(".",",")); setDesc(initial.description||"");
        const c = categories.find(x=>x.id===initial.category_id); setCat(c?.name || "");
        setAcc(initial.account_id || ""); setDate(toSaoPauloDateTimeLocal(initial.occurred_at)); setNotes(initial.notes||""); setMethod(initial.payment_method||""); setRecurring(initial.is_recurring);
      } else {
        setType(defaultType || "expense"); setAmount(""); setDesc(""); setCat(""); setAcc(accounts[0]?.id || ""); setDate(nowSaoPauloDateTimeLocal()); setNotes(""); setMethod(""); setRecurring(false);
      }
      setErr("");
    }
  }, [open, initial, defaultType, categories, accounts]);

  const submit = async () => {
    if (loading) return; // impede duplo clique / duplo submit
    let iso: string;
    try { iso = fromSaoPauloDateTimeLocal(date); } catch { setErr("Data/hora inválida"); return; }
    let category_id: string | null = null;
    let category_name: string | null = null;
    if (cat.trim()) {
      const found = categories.find(c=>c.name.toLowerCase()===cat.trim().toLowerCase());
      if (found) category_id = found.id;
      else category_name = cat.trim();
    }
    const parsed = transactionSchema.safeParse({ type, amount: Number(amount.replace(",",".")), description: desc || null, category_id, category_name, account_id: acc || null, occurred_at: iso, notes: notes || null, payment_method: method || null, is_recurring: recurring });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message || "Verifique os campos"); return; }
    setLoading(true);
    setErr("");
    try {
      // onSave DEVE rejeitar em caso de falha: só fechamos após o sucesso,
      // senão o formulário preenchido some junto com o erro.
      await onSave({ type: parsed.data.type, amount: parsed.data.amount, description: parsed.data.description || "", account_id: parsed.data.account_id || null, category_id: parsed.data.category_id || null, category_name: parsed.data.category_name || null, occurred_at: parsed.data.occurred_at, notes: parsed.data.notes || null, payment_method: parsed.data.payment_method || null, is_recurring: !!parsed.data.is_recurring });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!loading) onClose(); }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[520px] max-h-[86dvh] overflow-auto rounded-t-[22px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--elevated)] p-5 pb-[calc(1rem+var(--sab))] shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{initial ? "Editar" : "Novo"} {type==="expense"?"gasto":"receita"}</h3>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={()=>setType("expense")} className={`flex-1 h-9 rounded-full text-xs font-semibold border ${type==="expense"?"bg-[var(--accent)] text-white border-transparent":"bg-[var(--card-soft)] border-[var(--border)]"}`}>Gasto</button>
              <button onClick={()=>setType("income")} className={`flex-1 h-9 rounded-full text-xs font-semibold border ${type==="income"?"bg-emerald-500 text-white border-transparent":"bg-[var(--card-soft)] border-[var(--border)]"}`}>Receita</button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Valor (R$)</label>
                  <Input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="48,00" inputMode="decimal" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Data/hora</label>
                  <Input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Descrição</label>
                <Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ex: mercado" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Categoria</label>
                  <Input value={cat} onChange={e=>setCat(e.target.value)} placeholder="Alimentação" list="cats" className="mt-1" />
                  <datalist id="cats">{categories.map(c=> <option key={c.id} value={c.name} />)}</datalist>
                </div>
                <div className="col-span-2">
                  <AccountPicker accounts={accounts} value={acc} onChange={setAcc} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Pagamento</label>
                  <Input value={method} onChange={e=>setMethod(e.target.value)} placeholder="Pix, cartão..." className="mt-1" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input type="checkbox" checked={recurring} onChange={e=>setRecurring(e.target.checked)} id="rec" className="h-4 w-4" />
                  <label htmlFor="rec" className="text-xs">Recorrente</label>
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Observações</label>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm" placeholder="Opcional" />
              </div>
              {err && <p className="text-xs text-[var(--negative)]">{err}</p>}
              <Button onClick={submit} disabled={loading} aria-busy={loading} className="w-full rounded-full">{loading ? "Salvando..." : initial ? "Salvar" : type==="expense" ? "Adicionar gasto" : "Adicionar receita"}</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
