"use client";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Palette, X, Check, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { PresetThemeId, ThemeMeta } from "@/lib/themes";

/**
 * Mini-preview de um tema: reproduz em miniatura a estrutura real do app
 * (sidebar + superfície + acento + ambiente), então dá para escolher olhando,
 * sem precisar aplicar para descobrir.
 */
export function ThemePreview({
  preview,
  className,
  height = 56,
}: {
  preview: ThemeMeta["preview"];
  className?: string;
  height?: number;
}) {
  const [bg, surface, accent, secondary] = preview;
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-white/10 ${className || ""}`}
      style={{ height, background: bg }}
    >
      {/* ambiente */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 90% at 15% 0%, ${accent}33, transparent 70%), radial-gradient(60% 80% at 95% 100%, ${secondary}26, transparent 70%)`,
        }}
      />
      {/* sidebar */}
      <div className="absolute inset-y-0 left-0 w-[22%]" style={{ background: surface, opacity: 0.9 }}>
        <div className="mt-1.5 ml-1.5 h-1.5 w-1.5 rounded-[2px]" style={{ background: accent }} />
        <div className="mt-2 ml-1.5 h-1 w-[60%] rounded-full bg-white/15" />
        <div className="mt-1 ml-1.5 h-1 w-[45%] rounded-full bg-white/10" />
      </div>
      {/* card */}
      <div
        className="absolute left-[27%] right-[8%] top-[18%] rounded-[5px] border border-white/10 p-1.5"
        style={{ background: surface }}
      >
        <div className="h-1.5 w-[34%] rounded-full" style={{ background: accent }} />
        <div className="mt-1.5 h-1 w-[72%] rounded-full bg-white/18" />
        <div className="mt-1 h-1 w-[52%] rounded-full bg-white/10" />
      </div>
      {/* barra de acento */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, ${secondary})` }} />
    </div>
  );
}

export function ThemeSwitcher() {
  const { theme, setTheme, themes, order, custom } = useTheme();
  const [open, setOpen] = useState(false);

  const customPreview: ThemeMeta["preview"] = [
    "#08090C",
    "#12141A",
    custom.colors[0] || "#5865F2",
    custom.colors[1] || custom.colors[0] || "#22C5C2",
  ];

  const Grid = (
    <div className="grid grid-cols-2 gap-2.5">
      {order.map((id: PresetThemeId) => {
        const t = themes[id];
        const active = theme === id;
        return (
          <button
            key={id}
            onClick={() => {
              setTheme(id);
              setOpen(false);
            }}
            aria-pressed={active}
            className={`group relative rounded-xl border p-2 text-left transition-all ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--border)] bg-[var(--card-soft)] hover:border-[var(--border-strong)]"
            }`}
          >
            <ThemePreview preview={t.preview} />
            <div className="mt-2 flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold leading-tight truncate">{t.label}</p>
                <p className="text-[10.5px] text-[var(--muted-foreground)] leading-tight truncate">{t.desc}</p>
              </div>
              {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)] mt-0.5" />}
            </div>
          </button>
        );
      })}

      {/* Personalizado */}
      <button
        onClick={() => {
          setTheme("custom");
          setOpen(false);
        }}
        aria-pressed={theme === "custom"}
        className={`group relative rounded-xl border p-2 text-left transition-all ${
          theme === "custom"
            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
            : "border-[var(--border)] bg-[var(--card-soft)] hover:border-[var(--border-strong)]"
        }`}
      >
        <ThemePreview preview={customPreview} />
        <div className="mt-2 flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight truncate">Personalizado</p>
            <p className="text-[10.5px] text-[var(--muted-foreground)] leading-tight truncate">Suas cores</p>
          </div>
          {theme === "custom" && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)] mt-0.5" />}
        </div>
      </button>
    </div>
  );

  const Footer = (
    <Link
      href="/configuracoes"
      onClick={() => setOpen(false)}
      className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2.5 text-xs text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)] transition-colors"
    >
      <Sliders className="h-3.5 w-3.5" />
      Editar tema personalizado
    </Link>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--card)] grid place-items-center hover:border-[var(--border-strong)] transition-colors"
        aria-label="Trocar tema"
      >
        <Palette className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Desktop popover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 hidden lg:block"
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="hidden lg:block fixed z-50 right-6 top-[64px] w-[400px] rounded-2xl border border-[var(--border)] bg-[var(--elevated)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Tema</p>
                <button
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 rounded-full bg-[var(--card-soft)] grid place-items-center hover:bg-[var(--muted)]"
                  aria-label="Fechar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {Grid}
              {Footer}
            </motion.div>

            {/* Mobile bottom sheet */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 lg:hidden rounded-t-[22px] border-t border-[var(--border)] bg-[var(--elevated)] p-4 pb-[calc(1rem+var(--sab))] max-h-[82dvh] overflow-auto"
            >
              <div className="mx-auto h-1 w-9 rounded-full bg-[var(--border-strong)] mb-4" />
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Tema</p>
                <button
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {Grid}
              {Footer}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
