"use client";
import { useEffect, useState } from "react";
import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function HeaderBar({ onCommand }: { onCommand: () => void }) {
  const [shortcut, setShortcut] = useState("Ctrl K");
  useEffect(() => {
    const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
    setShortcut(isMac ? "⌘ K" : "Ctrl K");
  }, []);
  return (
    <header className="sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]" style={{ paddingTop: "max(0px,var(--sat))" }}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 h-[56px] flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <button onClick={onCommand} className="flex-1 sm:max-w-[440px] h-9 rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 flex items-center gap-2.5 text-sm text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
            <Search className="h-4 w-4 text-[var(--faint)]" />
            <span className="text-[13px]">Buscar ou adicionar…</span>
            <span className="ml-auto hidden sm:inline-flex text-[11px] font-medium border border-[var(--border)] rounded-full px-2 py-0.5 bg-[var(--card-soft)]">{shortcut}</span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <Button variant="ghost" size="icon" aria-label="Notificações" className="h-9 w-9"><Bell className="h-4 w-4" /></Button>
        </div>
      </div>
    </header>
  );
}
