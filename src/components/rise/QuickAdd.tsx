"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, TrendingUp, CalendarPlus, Bell, GraduationCap, HandCoins, HandHeart, Sparkles } from "lucide-react";
import { useState } from "react";
import { AIParserService } from "@/lib/ai/parser";

const OPTIONS = [
  { id: "expense", label: "Gasto", icon: Wallet, desc: "Alimentação, transporte..." },
  { id: "income", label: "Receita", icon: TrendingUp, desc: "Salário, venda..." },
  { id: "event", label: "Evento", icon: CalendarPlus, desc: "Reunião, compromisso" },
  { id: "reminder", label: "Lembrete", icon: Bell, desc: "Com horário/recorrente" },
  { id: "school_task", label: "Atividade escolar", icon: GraduationCap, desc: "Prova, trabalho..." },
  { id: "debt_owed", label: "Dívida (eu devo)", icon: HandCoins, desc: "Pagar alguém" },
  { id: "debt_receivable", label: "Valor a receber", icon: HandHeart, desc: "Me devem" },
];

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [ai, setAi] = useState("");
  const [parsed, setParsed] = useState<string | null>(null);

  const handleAI = async () => {
    if (!ai.trim()) return;
    const svc = new AIParserService();
    const res = await svc.parse(ai);
    setParsed(JSON.stringify(res, null, 2));
  };

  return (
    <AnimatePresence>
      {open && (
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
                {!parsed && <p className="mt-2 text-xs text-[var(--muted-foreground)]">Mock local por enquanto — desacoplado via <code>AIParserService</code>. Confirmação editável vem na próxima etapa.</p>}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {OPTIONS.map((o) => (
                  <button key={o.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <o.icon className="h-5 w-5 text-[var(--accent)]" />
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
  );
}
