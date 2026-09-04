"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { addMonthsToDateKey } from "@/lib/timezone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { debtSchema } from "@/lib/validators/debt";
import type { Debt } from "@/types/debt";

export function DebtDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (data: { person: string; description?: string | null; kind: "owed" | "receivable"; amount: number; due_date?: string | null; notes?: string | null; is_installment?: boolean; installments_count?: number | null; first_due_date?: string | null }) => Promise<void>; initial?: Debt | null }) {
  const [person, setPerson] = useState("");
  const [desc, setDesc] = useState("");
  const [kind, setKind] = useState<"owed" | "receivable">("owed");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");
  const [isParc, setIsParc] = useState(false);
  const [count, setCount] = useState("4");
  const [firstDue, setFirstDue] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{n:number; amount:number; due:string}[] | null>(null);

  useEffect(() => {
    if (open) {
      if (initial) {
        setPerson(initial.person); setDesc(initial.description||""); setKind(initial.kind); setAmount(String(initial.amount).replace(".",",")); setDue(initial.due_date||""); setNotes(initial.notes||""); setIsParc(!!initial.is_installment); setCount(String(initial.installments_count||4)); setFirstDue(initial.due_date||"");
      } else {
        setPerson(""); setDesc(""); setKind("owed"); setAmount(""); setDue(""); setNotes(""); setIsParc(false); setCount("4"); setFirstDue("");
      }
      setErr(""); setPreview(null);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!isParc || !amount || !count || !firstDue) { setPreview(null); return; }
    const total = Number(amount.replace(",","."));
    const n = Number(count);
    if (!total || !n || n<2) return;
    const per = Math.floor(total/n*100)/100;
    const rem = +(total - per*(n-1)).toFixed(2);
    const list = [];
    for(let i=1;i<=n;i++){
      const due=addMonthsToDateKey(firstDue, i-1);
      list.push({ n:i, amount: i===n?rem:per, due });
    }
    setPreview(list);
  }, [isParc, amount, count, firstDue]);

  const submit = async () => {
    if (loading) return; // impede duplo clique / duplo submit
    if (initial) {
      // edição: apenas campos permitidos, sem parcelamento
      const editParsed = debtSchema.pick({ person:true, description:true, kind:true, amount:true, due_date:true, notes:true }).safeParse({ person, description: desc||null, kind, amount: Number(amount.replace(",",".")), due_date: due||null, notes: notes||null });
      if (!editParsed.success) { setErr(editParsed.error.issues[0]?.message||"Verifique"); return; }
      setLoading(true); setErr("");
      try {
        await onSave({ person: editParsed.data.person, description: editParsed.data.description||null, kind: editParsed.data.kind, amount: editParsed.data.amount, due_date: editParsed.data.due_date||null, notes: editParsed.data.notes||null } as never);
        onClose();
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Falha ao salvar");
      } finally { setLoading(false); }
      return;
    }
    const parsed = debtSchema.safeParse({ person, description: desc||null, kind, amount: Number(amount.replace(",",".")), due_date: isParc ? null : (due||null), notes: notes||null, is_installment: isParc, installments_count: isParc? Number(count): null, first_due_date: isParc? firstDue||null : null });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message||"Verifique"); return; }
    setLoading(true); setErr("");
    try {
      // só fecha após o sucesso — o parent faz rethrow depois do toast
      await onSave({ person: parsed.data.person, description: parsed.data.description||null, kind: parsed.data.kind, amount: parsed.data.amount, due_date: isParc? null : (parsed.data.due_date||null), notes: parsed.data.notes||null, is_installment: parsed.data.is_installment, installments_count: parsed.data.installments_count||null, first_due_date: parsed.data.first_due_date||null });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar");
    } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => { if (!loading) onClose(); }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity:0, y:18, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:10, scale:0.98 }} className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[520px] max-h-[88dvh] overflow-auto rounded-t-[22px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--elevated)] p-5 pb-[calc(1rem+var(--sab))] shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{initial?"Editar dívida":"Nova dívida"}</h3>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="flex gap-2">
                <button onClick={()=>setKind("owed")} className={`flex-1 h-9 rounded-full text-xs font-semibold border ${kind==="owed"?"bg-[var(--accent)] text-white border-transparent":"bg-[var(--card-soft)] border-[var(--border)]"}`}>Eu devo</button>
                <button onClick={()=>setKind("receivable")} className={`flex-1 h-9 rounded-full text-xs font-semibold border ${kind==="receivable"?"bg-emerald-500 text-white border-transparent":"bg-[var(--card-soft)] border-[var(--border)]"}`}>Me devem</button>
              </div>

              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Pessoa / credor</label>
                <Input value={person} onChange={e=>setPerson(e.target.value)} placeholder="Ex: João" className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Descrição</label>
                <Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ex: empréstimo, lanche" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Valor total (R$)</label>
                  <Input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="500,00" inputMode="decimal" className="mt-1" disabled={!!initial?.is_installment} />
                  {initial?.is_installment && <p className="text-[11px] text-[var(--faint)] mt-1">Valor imutável para parcelada</p>}
                </div>
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Vencimento</label>
                  <Input type="date" value={due} onChange={e=>setDue(e.target.value)} className="mt-1" disabled={isParc || !!initial?.is_installment} />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm opacity-100">
                <input type="checkbox" checked={isParc} onChange={e=>setIsParc(e.target.checked)} disabled={!!initial} className="h-4 w-4 disabled:opacity-50" /> Parcelado {initial?.is_installment ? <span className="text-xs text-[var(--faint)]">(não alterável após criação)</span> : null}
              </label>

              {isParc && (
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--card-soft)] border border-[var(--border)] p-3">
                  <div>
                    <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Parcelas</label>
                    <Input type="number" min={2} max={48} value={count} onChange={e=>setCount(e.target.value)} className="mt-1" disabled={!!initial} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Primeiro vencimento</label>
                    <Input type="date" value={firstDue} onChange={e=>setFirstDue(e.target.value)} className="mt-1" disabled={!!initial} />
                  </div>
                  {preview && (
                    <div className="col-span-2 mt-2 space-y-1 max-h-[120px] overflow-auto text-xs">
                      {preview.map(p=> <div key={p.n} className="flex justify-between border-b border-[var(--border)] py-1"><span>{p.n}/{preview.length} — {p.due}</span><span className="font-medium">R$ {p.amount.toFixed(2).replace(".",",")}</span></div>)}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Observações</label>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm" placeholder="Opcional" />
              </div>

              {err && <p className="text-xs text-[var(--negative)]">{err}</p>}
              <Button onClick={submit} disabled={loading} aria-busy={loading} className="w-full rounded-full">{loading ? "Salvando..." : initial?"Salvar":"Criar dívida"}</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
