"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { accountSchema } from "@/lib/validators/finance";
import type { Account, AccountType } from "@/types/finance";

const TYPES: { id: AccountType; label: string }[] = [
  { id: "checking", label: "Conta corrente" },
  { id: "wallet", label: "Carteira digital" },
  { id: "cash", label: "Dinheiro" },
  { id: "card", label: "Cartão" },
  { id: "savings", label: "Poupança" },
  { id: "other", label: "Outro" },
];

const COLORS = ["#FF6A30","#820AD1","#00A9FF","#FACC15","#22C55E","#EF4444","#06B6D4","#8B5CF6"];

export function AccountDialog({ open, onClose, onSave, initial }: { open: boolean; onClose: () => void; onSave: (data: { name: string; type: AccountType; color: string; initial_balance: number }) => void; initial?: Account | null }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [color, setColor] = useState(COLORS[0]);
  const [balance, setBalance] = useState("0");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      if (initial) {
        setName(initial.name); setType(initial.type); setColor(initial.color || COLORS[0]); setBalance(String(initial.initial_balance));
      } else {
        setName(""); setType("checking"); setColor(COLORS[0]); setBalance("0");
      }
      setErr("");
    }
  }, [open, initial]);

  const submit = () => {
    const parsed = accountSchema.safeParse({ name, type, color, initial_balance: Number(balance.replace(",",".")), is_active: true });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message || "Inválido"); return; }
    onSave({ name: parsed.data.name, type: parsed.data.type, color: parsed.data.color || COLORS[0], initial_balance: parsed.data.initial_balance });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[440px] rounded-t-[20px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5 pb-[calc(1rem+var(--sab))] shadow-[0_24px_64px_rgba(0,0,0,0.24)]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{initial ? "Editar conta" : "Nova conta"}</h3>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Nome</label>
                <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Inter" className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Tipo</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {TYPES.map(t=>(
                    <button key={t.id} onClick={()=>setType(t.id)} className={`rounded-xl border px-3 py-2 text-xs font-medium text-left ${type===t.id?"border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]":"border-[var(--border)] bg-[var(--card-soft)]"}`}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Cor</label>
                <div className="mt-1 flex gap-2 flex-wrap">
                  {COLORS.map(c=>(
                    <button key={c} onClick={()=>setColor(c)} className={`h-8 w-8 rounded-full border-2 ${color===c?"border-[var(--foreground)]":"border-transparent"}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Saldo inicial (R$)</label>
                <Input value={balance} onChange={e=>setBalance(e.target.value)} placeholder="0,00" className="mt-1" inputMode="decimal" />
                <p className="text-[11px] text-[var(--faint)] mt-1">Saldo atual é calculado pelas transações.</p>
              </div>
              {err && <p className="text-xs text-red-600">{err}</p>}
              <Button onClick={submit} className="w-full rounded-full mt-2">{initial ? "Salvar" : "Criar conta"}</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
