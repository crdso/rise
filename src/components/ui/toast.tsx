"use client";
import { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Toast = { id: string; title: string; desc?: string; variant?: "success" | "error" };
const Ctx = createContext<{ push: (t: Omit<Toast,"id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast,"id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter(x => x.id !== id)), 2800);
  };
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-[88px] lg:bottom-4 right-4 left-4 lg:left-auto z-[60] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.98 }} className={`pointer-events-auto min-w-[280px] max-w-[360px] rounded-2xl border px-4 py-3 flex gap-3 shadow-[0_12px_32px_var(--scrim)] ${t.variant === "error" ? "border-[color-mix(in_srgb,var(--negative)_30%,transparent)] bg-[color-mix(in_srgb,var(--negative)_12%,var(--card))] text-[var(--foreground)]" : "bg-[var(--card)] border-[var(--border)] text-[var(--foreground)]"}`}>
              {t.variant === "error" ? <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--negative)]" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[var(--positive)]" />}
              <div className="flex-1">
                <p className="text-sm font-medium leading-none">{t.title}</p>
                {t.desc && <p className="text-xs opacity-70 mt-1">{t.desc}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast outside provider");
  return c;
}
