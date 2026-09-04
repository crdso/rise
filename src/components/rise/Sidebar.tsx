"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  CalendarDays,
  Bell,
  GraduationCap,
  FileClock,
  Star,
  Settings,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RiseLogo } from "@/components/rise/RiseMark";

type NavHref =
  | "/"
  | "/financas"
  | "/calendario"
  | "/lembretes"
  | "/importantes"
  | "/escola"
  | "/resumos"
  | "/configuracoes";

const NAV: Array<{ href: NavHref; label: string; icon: typeof LayoutDashboard }> = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/financas", label: "Finanças", icon: Wallet },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/lembretes", label: "Lembretes", icon: Bell },
  { href: "/importantes", label: "Importantes", icon: Star },
  { href: "/escola", label: "Escola", icon: GraduationCap },
  { href: "/resumos", label: "Resumos", icon: FileClock },
];

export function Sidebar({ onQuickAdd }: { onQuickAdd: () => void }) {
  const path = usePathname();
  const isActive = (href: NavHref) => (href === "/" ? path === "/" : !!path?.startsWith(href));

  return (
    <aside className="hidden lg:flex w-[236px] shrink-0 flex-col bg-[var(--sidebar)] border-r border-[var(--border)] sticky top-0 h-[100dvh] pt-[max(1.25rem,var(--sat))] pb-[max(1rem,var(--sab))]">
      <div className="px-5">
        <Link href="/" className="inline-flex" aria-label="RISE — início">
          <RiseLogo size={30} />
        </Link>
      </div>

      <div className="px-3 mt-6">
        <button
          onClick={onQuickAdd}
          className="w-full h-9 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 shadow-[0_6px_18px_var(--glow)] hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </button>
      </div>

      <nav className="mt-6 px-2 space-y-0.5 flex-1 overflow-y-auto no-scrollbar">
        {NAV.map((i) => {
          const active = isActive(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-[var(--card)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-soft)]"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-[var(--accent)]" />
              )}
              <i.icon className={cn("h-4 w-4", active ? "text-[var(--accent)]" : "opacity-70")} />
              {i.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pt-2 border-t border-[var(--border)] mx-3">
        <Link
          href="/configuracoes"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
            isActive("/configuracoes")
              ? "bg-[var(--card)] text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-soft)]"
          )}
        >
          <Settings className={cn("h-4 w-4", isActive("/configuracoes") ? "text-[var(--accent)]" : "opacity-70")} />
          Configurações
        </Link>
      </div>
    </aside>
  );
}
