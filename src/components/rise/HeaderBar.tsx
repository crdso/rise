"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { NotificationCenter } from "./NotificationCenter";
import { RiseBadge } from "./RiseMark";

export function HeaderBar({ onCommand }: { onCommand: () => void }) {
  const [shortcut, setShortcut] = useState("Ctrl K");

  useEffect(() => {
    // navigator.platform está depreciado; userAgent resolve o caso de uso aqui
    setShortcut(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘ K" : "Ctrl K");
  }, []);

  return (
    <header
      className="sticky top-0 z-30 bg-[var(--background)]/85 backdrop-blur-xl border-b border-[var(--border)]"
      style={{ paddingTop: "max(0px,var(--sat))" }}
    >
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 h-[56px] flex items-center gap-3">
        {/* marca só no mobile — no desktop ela vive na sidebar */}
        <Link href="/" className="lg:hidden shrink-0" aria-label="RISE — início">
          <RiseBadge size={28} />
        </Link>

        <button
          onClick={onCommand}
          className="flex-1 sm:max-w-[420px] h-9 rounded-full border border-[var(--border)] bg-[var(--card)] px-3.5 flex items-center gap-2.5 text-sm text-[var(--muted-foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors"
        >
          <Search className="h-4 w-4 text-[var(--faint)] shrink-0" />
          <span className="text-[13px] truncate">Adicionar…</span>
          <span className="ml-auto hidden sm:inline-flex text-[11px] font-medium border border-[var(--border)] rounded-full px-2 py-0.5 bg-[var(--card-soft)] tnum">
            {shortcut}
          </span>
        </button>

        <div className="flex items-center gap-1.5 ml-auto">
          <ThemeSwitcher />
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
}
