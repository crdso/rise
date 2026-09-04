"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, CalendarDays, Bell, GraduationCap, FileClock, Settings, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: Array<{ href: "/" | "/financas" | "/calendario" | "/lembretes" | "/escola" | "/resumos" | "/configuracoes"; label: string; icon: typeof LayoutDashboard }> = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/financas", label: "Finanças", icon: Wallet },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/lembretes", label: "Lembretes", icon: Bell },
  { href: "/escola", label: "Escola", icon: GraduationCap },
  { href: "/resumos", label: "Resumos", icon: FileClock },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ onQuickAdd }: { onQuickAdd: () => void }) {
  const path = usePathname();
  return (
    <aside className="hidden lg:flex w-[248px] shrink-0 flex-col bg-[var(--background)] border-r border-[var(--border)] sticky top-0 h-[100dvh] pt-[max(1.25rem,var(--sat))] pb-[max(1rem,var(--sab))]">
      <div className="px-5 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-[var(--foreground)] text-[var(--background)] grid place-items-center font-bold text-[13px] tracking-tight">R</div>
        <div className="leading-none">
          <p className="text-[14px] font-semibold tracking-tight">RISE</p>
          <p className="text-[10px] tracking-[0.16em] uppercase text-[var(--faint)] font-medium">Privado</p>
        </div>
      </div>

      <div className="px-3 mt-6">
        <button onClick={onQuickAdd} className="w-full h-9 rounded-full bg-[var(--accent)] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 shadow-[0_6px_16px_var(--glow)] hover:brightness-[1.04] active:scale-[0.98] transition-all">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </button>
      </div>

      <nav className="mt-7 px-2 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] tracking-[0.14em] uppercase text-[var(--faint)] font-semibold">Navegação</p>
        {NAV.map((i) => {
          const active = path === i.href || (i.href !== "/" && path?.startsWith(i.href));
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active ? "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-soft)] border border-transparent"
              )}
            >
              <i.icon className={cn("h-4 w-4", active ? "text-[var(--accent)]" : "opacity-70")} /> {i.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-4 pt-6 border-t border-[var(--border)] mx-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-[var(--faint)]">3º ano · 2026</p>
          <span className="text-[10px] rounded-full bg-[var(--card)] border border-[var(--border)] px-2 py-0.5 text-[var(--muted-foreground)]">72%</span>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">Arquiva em 15/12/2026</p>
        <div className="mt-2 h-1 rounded-full bg-[var(--muted)] overflow-hidden">
          <div className="h-full bg-[var(--accent)]" style={{ width: "72%" }} />
        </div>
      </div>
    </aside>
  );
}
