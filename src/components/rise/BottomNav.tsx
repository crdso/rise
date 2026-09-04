"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Wallet, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ onQuickAdd, onMore }: { onQuickAdd: () => void; onMore: () => void }) {
  const path = usePathname();
  const Item = ({ href, icon: Icon, label, active }: { href: "/" | "/calendario" | "/financas"; icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean }) => (
    <Link href={href as never} className={cn("flex flex-col items-center gap-1 py-2 px-3 text-[11px] font-medium", active ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]")}>
      <Icon className={cn("h-5 w-5", active && "text-[var(--accent)]")} />
      {label}
    </Link>
  );
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--card)]/80" style={{ paddingBottom: "max(0.5rem,var(--sab))" }}>
      <div className="grid grid-cols-5 items-end gap-1 px-2 pt-1">
        <Item href="/" icon={LayoutDashboard} label="Início" active={path === "/"} />
        <Item href="/calendario" icon={CalendarDays} label="Calendário" active={path?.startsWith("/calendario")} />
        <div className="flex flex-col items-center">
          <button onClick={onQuickAdd} className="h-14 w-14 rounded-full bg-[var(--accent)] text-white grid place-items-center shadow-[0_10px_24px_var(--glow)] -translate-y-2 hover:scale-[1.03] active:scale-[0.97] transition-transform" aria-label="Adicionar">
            <Plus className="h-6 w-6" />
          </button>
          <span className="text-[11px] font-medium text-[var(--muted-foreground)] -mt-1">Adicionar</span>
        </div>
        <Item href="/financas" icon={Wallet} label="Finanças" active={path?.startsWith("/financas")} />
        <button onClick={onMore} className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-[var(--muted-foreground)]">
          <MoreHorizontal className="h-5 w-5" /> Mais
        </button>
      </div>
    </nav>
  );
}
