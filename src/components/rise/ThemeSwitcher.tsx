"use client";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Palette, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const previews: Record<string, { bg: string; surface: string; accent: string }> = {
  midnight: { bg: "#060A14", surface: "#0E1730", accent: "#3B6FE8" },
  forest: { bg: "#050A08", surface: "#0F1E17", accent: "#16A34A" },
  emerald: { bg: "#040A07", surface: "#0C1F16", accent: "#10B981" },
  amethyst: { bg: "#080614", surface: "#140F2E", accent: "#7C3AED" },
  ocean: { bg: "#05121C", surface: "#0B2235", accent: "#0891B2" },
  obsidian: { bg: "#050505", surface: "#0F0F0F", accent: "#FAFAFA" },
  frost: { bg: "#F8FAFC", surface: "#FFFFFF", accent: "#2563EB" },
  sunset: { bg: "#0C0810", surface: "#1A1024", accent: "#E11D48" },
};

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);

  const Grid = (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(themes) as Array<keyof typeof themes>).map((id) => {
        const p = previews[id] ?? previews.midnight;
        const active = theme === id;
        return (
          <button
            key={id}
            onClick={() => { setTheme(id as never); setOpen(false); }}
            className={`rounded-xl border p-2.5 text-left transition-all ${active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--card-soft)] hover:border-[var(--border-strong)]"}`}
          >
            <div className="h-[48px] rounded-lg border border-[var(--border)] overflow-hidden flex flex-col" style={{ background: p.bg }}>
              <div className="flex-1 flex">
                <div className="w-1/2" style={{ background: p.surface }} />
                <div className="flex-1 p-1.5">
                  <div className="h-2 w-8 rounded-full mb-1" style={{ background: p.accent }} />
                  <div className="h-1.5 w-full rounded-full bg-white/20" />
                </div>
              </div>
              <div className="h-1 w-full" style={{ background: p.accent, opacity: 0.6 }} />
            </div>
            <p className="text-xs font-semibold mt-2 leading-none">{themes[id].label}</p>
            <p className="text-[11px] text-[var(--muted-foreground)] leading-tight">{themes[id].desc}</p>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--card)] grid place-items-center hover:border-[var(--border-strong)] transition-colors" aria-label="Trocar tema">
        <Palette className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Desktop popover */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm hidden lg:block" />
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="hidden lg:block fixed z-50 right-6 top-[64px] w-[360px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Temas</p>
                <button onClick={() => setOpen(false)} className="h-7 w-7 rounded-full bg-[var(--card-soft)] grid place-items-center"><X className="h-3.5 w-3.5" /></button>
              </div>
              {Grid}
              <p className="mt-2 text-[11px] text-[var(--faint)]">Transição suave · salvo local</p>
            </motion.div>

            {/* Mobile drawer */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }} className="fixed inset-x-0 bottom-0 z-50 lg:hidden rounded-t-[20px] border-t border-[var(--border)] bg-[var(--card)] p-4 pb-[calc(1rem+var(--sab))] max-h-[78dvh] overflow-auto">
              <div className="mx-auto h-1 w-9 rounded-full bg-[var(--muted)] mb-4" />
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Temas premium</p>
                <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center"><X className="h-4 w-4" /></button>
              </div>
              {Grid}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
