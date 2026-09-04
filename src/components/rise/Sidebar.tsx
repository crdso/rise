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
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl sticky top-0 h-[100dvh] pt-[max(1rem,var(--sat))] pb-[max(1rem,var(--sab))]">
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[var(--foreground)] text-[var(--background)] grid place-items-center font-bold text-sm">R</div>
        <div>
          <p className="text-sm font-semibold leading-none tracking-tight">RISE</p>
          <p className="text-[11px] tracking-[0.14em] uppercase text-[var(--faint)]">Painel pessoal</p>
        </div>
      </div>

      <div className="px-3 mt-2">
        <button onClick={onQuickAdd} className="w-full h-10 rounded-full bg-[var(--accent)] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-[0_8px_20px_var(--glow)] hover:brightness-[1.05] hover:-translate-y-[1px] active:translate-y-0 transition-all">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
        <button className="mt-2 w-full h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 border border-[var(--border)]">
          <Sparkles className="h-3.5 w-3.5" /> Adicionar com IA
        </button>
      </div>

      <nav className="mt-6 px-3 space-y-1">
        {NAV.map((i) => {
          const active = path === i.href || (i.href !== "/" && path?.startsWith(i.href));
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-[var(--card-soft)] text-[var(--foreground)] border border-[var(--border)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-soft)]"
              )}
            >
              <i.icon className={cn("h-4.5 w-4.5", active && "text-[var(--accent)]")} /> {i.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
          <p className="text-xs font-semibold">3º ano · Arquiva em</p>
          <p className="text-xs text-[var(--muted-foreground)]">15/12/2026</p>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden"><div className="h-full w-[72%] bg-[var(--accent)]" /></div>
          <p className="mt-1 text-[11px] text-[var(--faint)]">72% do ano concluído</p>
        </div>
      </div>
    </aside>
  );
}
