"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, TrendingUp, CalendarPlus, Bell, GraduationCap, HandCoins, HandHeart, Sparkles } from "lucide-react";
import { useState } from "react";
import { AIParserService } from "@/lib/ai/parser";
import { TransactionDialog } from "@/components/rise/TransactionDialog";
import { DebtDialog } from "@/components/rise/DebtDialog";
import { financeService } from "@/lib/services/finance";
import { debtService } from "@/lib/services/debtService";
import { useToast } from "@/components/ui/toast";
import { formatBRL } from "@/lib/utils";

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [ai, setAi] = useState("");
  const [parsed, setParsed] = useState<string | null>(null);
  const [txOpen, setTxOpen] = useState<null | "expense" | "income">(null);
  const [debtOpen, setDebtOpen] = useState(false);
  const { push } = useToast();

  const handleAI = async () => {
    if (!ai.trim()) return;
    const svc = new AIParserService();
    const res = await svc.parse(ai);
    setParsed(JSON.stringify(res, null, 2));
  };

  const openTx = (t: "expense" | "income") => {
    setTxOpen(t);
  };

  return (
    <>
      <AnimatePresence>
        {open && !txOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[640px] max-h-[86dvh] overflow-hidden rounded-t-[20px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_64px_rgba(0,0,0,0.24)] flex flex-col"
              style={{ paddingBottom: "max(0px,var(--sab))" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <h3 className="font-semibold">Adicionar</h3>
                <button onClick={onClose} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center hover:bg-[var(--muted)]"><X className="h-4 w-4" /></button>
              </div>

              <div className="p-5 space-y-4 overflow-auto">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
                  <label className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" /> Adicionar com IA</label>
                  <div className="mt-2 flex gap-2">
                    <input value={ai} onChange={(e) => setAi(e.target.value)} placeholder='ex: gastei 32,50 no lanche hoje pelo inter' className="flex-1 h-10 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm outline-none focus:border-[var(--accent)]" />
                    <button onClick={handleAI} className="h-10 rounded-full bg-[var(--accent)] text-white px-5 text-sm font-semibold">Interpretar</button>
                  </div>
                  {parsed && <pre className="mt-3 rounded-xl bg-[var(--background)] p-3 text-xs overflow-auto border border-[var(--border)]">{parsed}</pre>}
                  {!parsed && <p className="mt-2 text-xs text-[var(--muted-foreground)]">Mock local — via <code>AIParserService</code>. Em breve confirmação editável.</p>}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={() => openTx("expense")} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <Wallet className="h-5 w-5 text-[var(--accent)]" />
                    <p className="mt-2 text-sm font-semibold">Gasto</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Alimentação, transporte...</p>
                  </button>
                  <button onClick={() => openTx("income")} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <p className="mt-2 text-sm font-semibold">Receita</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Salário, venda...</p>
                  </button>
                  <button onClick={() => setDebtOpen(true)} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <HandCoins className="h-5 w-5 text-[var(--accent)]" />
                    <p className="mt-2 text-sm font-semibold">Dívida</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Eu devo / Me devem</p>
                  </button>
                  {[
                    { id: "event", label: "Evento", icon: CalendarPlus, desc: "Reunião, compromisso" },
                    { id: "reminder", label: "Lembrete", icon: Bell, desc: "Com horário/recorrente" },
                    { id: "school_task", label: "Atividade escolar", icon: GraduationCap, desc: "Prova, trabalho..." },
                  ].map((o) => (
                    <button key={o.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left opacity-60">
                      <o.icon className="h-5 w-5 text-[var(--faint)]" />
                      <p className="mt-2 text-sm font-semibold">{o.label}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{o.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <TransactionDialog
        open={!!txOpen}
        defaultType={txOpen || "expense"}
        onClose={() => setTxOpen(null)}
        onSave={async (data) => {
          try {
            if (data.category_name) {
              const cat = await financeService.ensureCategoryAsync(data.category_name);
              data.category_id = cat.id;
            }
            await financeService.createTransaction(data as never);
            push({ title: data.type === "expense" ? "Gasto adicionado" : "Receita adicionada", desc: formatBRL(data.amount) });
            setTxOpen(null);
            onClose();
          } catch (e: unknown) {
            push({ title: "Erro", desc: e instanceof Error ? e.message : "Falha", variant: "error" });
          }
        }}
      />
      <DebtDialog
        open={debtOpen}
        onClose={() => setDebtOpen(false)}
        onSave={async (data) => {
          try {
            await debtService.createDebt(data as never);
            push({ title: "Dívida criada", desc: data.person });
            setDebtOpen(false);
            onClose();
          } catch (e: unknown) {
            push({ title: "Erro", desc: e instanceof Error ? e.message : "Falha", variant: "error" });
          }
        }}
      />
    </>
  );
}

