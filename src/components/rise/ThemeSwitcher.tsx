"use client";
import { useTheme } from "@/components/theme-provider";
import { Palette } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  return (
    <div className="relative group">
      <button className="h-10 w-10 rounded-full border border-[var(--border)] bg-[var(--card)] grid place-items-center hover:border-[var(--border-strong)] transition-colors" aria-label="Trocar tema">
        <Palette className="h-4 w-4" />
      </button>
      <div className="absolute right-0 top-[calc(100%+8px)] hidden group-hover:block group-focus-within:block z-50">
        <div className="w-[280px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
          <p className="text-xs font-semibold px-1 mb-2">Temas</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(themes) as Array<keyof typeof themes>).map((id) => (
              <button
                key={id}
                onClick={() => setTheme(id as never)}
                className={`rounded-xl border p-2.5 text-left transition-all ${theme === id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--card-soft)]"}`}
              >
                <span className="block h-6 w-full rounded-full mb-2 border border-[var(--border)]" style={{ background: themes[id].accent }} />
                <span className="text-xs font-semibold">{themes[id].label}</span>
                <span className="block text-[11px] text-[var(--muted-foreground)] leading-tight">{themes[id].desc}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--faint)] px-1">Transição suave · salvo localmente</p>
        </div>
      </div>
    </div>
  );
}
