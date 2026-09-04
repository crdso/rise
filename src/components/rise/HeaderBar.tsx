"use client";
import { Search, Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function HeaderBar({ onQuickAdd, onCommand }: { onQuickAdd: () => void; onCommand: () => void }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[var(--background)]/70 border-b border-[var(--border)]" style={{ paddingTop: "max(0px,var(--sat))" }}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 h-[64px] flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <span className="hidden lg:inline">⌘K para busca</span>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <button onClick={onCommand} className="flex-1 sm:max-w-[420px] h-10 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:border-[var(--border-strong)] transition-colors">
            <Search className="h-4 w-4" /> Buscar ou adicionar…
            <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-xs border border-[var(--border)] rounded-full px-2 py-1">⌘ K</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeSwitcher />
          <Button variant="ghost" size="icon" aria-label="Notificações"><Bell className="h-4 w-4" /></Button>
          <Button variant="soft" size="sm" className="hidden sm:inline-flex" onClick={onQuickAdd}><Sparkles className="h-4 w-4" /> Novo</Button>
        </div>
      </div>
    </header>
  );
}
