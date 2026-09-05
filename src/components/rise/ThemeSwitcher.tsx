"use client";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Palette, X, Check, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { buildCustomTheme, type PresetThemeId, type ThemeMeta } from "@/lib/themes";

/**
 * Mini-preview de um tema: reproduz em miniatura a estrutura real do app
 * (sidebar + navegação + conteúdo + card + acento), então dá para escolher olhando,
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
  const [background, sidebar, card, accent] = preview;
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg ${className || ""}`}
      style={{ height, background, border: "1px solid color-mix(in srgb, white 12%, transparent)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 100% at 82% -20%, color-mix(in srgb, ${accent} 32%, transparent), transparent 70%)`,
        }}
      />
      <div className="absolute inset-y-0 left-0 w-[23%] border-r" style={{ background: sidebar, borderColor: "color-mix(in srgb, white 8%, transparent)" }}>
        <div className="mt-2 ml-2 h-2 w-2 rounded-[3px]" style={{ background: accent }} />
        <div className="relative mt-2.5 ml-1.5 h-2 w-[72%] rounded-[3px]" style={{ background: "color-mix(in srgb, white 11%, transparent)" }}>
          <span className="absolute inset-y-0 left-0 w-[2px] rounded-full" style={{ background: accent }} />
        </div>
        <div className="mt-1.5 ml-1.5 h-1 w-[52%] rounded-full" style={{ background: "color-mix(in srgb, white 12%, transparent)" }} />
        <div className="mt-1.5 ml-1.5 h-1 w-[64%] rounded-full" style={{ background: "color-mix(in srgb, white 8%, transparent)" }} />
      </div>
      <div className="absolute left-[29%] right-[8%] top-[14%] h-1 rounded-full" style={{ background: "color-mix(in srgb, white 18%, transparent)" }} />
      <div
        className="absolute left-[29%] right-[8%] top-[30%] h-[48%] rounded-[6px] border p-1.5"
        style={{ background: card, borderColor: "color-mix(in srgb, white 10%, transparent)" }}
      >
        <div className="flex items-center justify-between">
          <div className="h-1.5 w-[35%] rounded-full" style={{ background: accent }} />
          <div className="h-2 w-2 rounded-full" style={{ background: "color-mix(in srgb, white 20%, transparent)" }} />
        </div>
        <div className="mt-2 h-1 w-[80%] rounded-full" style={{ background: "color-mix(in srgb, white 18%, transparent)" }} />
        <div className="mt-1.5 h-1 w-[56%] rounded-full" style={{ background: "color-mix(in srgb, white 10%, transparent)" }} />
      </div>
      <div className="absolute bottom-[12%] left-[32%] h-1.5 w-[25%] rounded-full" style={{ background: accent }} />
    </div>
  );
}

export function ThemeSwitcher() {
  const { theme, setTheme, themes, order, custom } = useTheme();
  const [open, setOpen] = useState(false);

  const customTokens = buildCustomTheme(custom);
  const customPreview: ThemeMeta["preview"] = [customTokens["--background"], customTokens["--sidebar"], customTokens["--card"], customTokens["--accent"]];

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
            <ThemePreview preview={t.preview} height={62} />
            {active && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"><Check className="h-3 w-3" /></span>}
            <div className="mt-2 flex items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold leading-tight truncate">{t.label}</p>
                <p className="text-[10.5px] text-[var(--muted-foreground)] leading-tight truncate">{t.desc}</p>
              </div>
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
        <ThemePreview preview={customPreview} height={62} />
        {theme === "custom" && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"><Check className="h-3 w-3" /></span>}
        <div className="mt-2 flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-tight truncate">Personalizado</p>
            <p className="text-[10.5px] text-[var(--muted-foreground)] leading-tight truncate">Suas cores</p>
          </div>
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
