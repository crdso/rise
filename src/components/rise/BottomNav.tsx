"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, Wallet, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type NavHref = "/" | "/calendario" | "/financas";

export function BottomNav({ onQuickAdd, onMore }: { onQuickAdd: () => void; onMore: () => void }) {
  const path = usePathname();

  const Item = ({
    href,
    icon: Icon,
    label,
    active,
  }: {
    href: NavHref;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active?: boolean;
  }) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 min-h-[52px] px-2 text-[10.5px] font-medium transition-colors",
        active ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"
      )}
    >
      <Icon className="h-[19px] w-[19px]" />
      {label}
    </Link>
  );

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border)] bg-[var(--sidebar)]/92 backdrop-blur-xl"
      style={{ paddingBottom: "max(0.4rem,var(--sab))" }}
    >
      <div className="grid grid-cols-5 items-end px-1 pt-1">
        <Item href="/" icon={LayoutDashboard} label="Início" active={path === "/"} />
        <Item href="/calendario" icon={CalendarDays} label="Agenda" active={!!path?.startsWith("/calendario")} />
        <div className="flex flex-col items-center">
          <button
            onClick={onQuickAdd}
            className="h-[52px] w-[52px] rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] grid place-items-center shadow-[0_10px_24px_var(--glow)] -translate-y-2.5 hover:brightness-110 active:scale-[0.96] transition-all"
            aria-label="Adicionar"
          >
            <Plus className="h-6 w-6" />
          </button>
          <span className="text-[10.5px] font-medium text-[var(--muted-foreground)] -mt-1.5">Adicionar</span>
        </div>
        <Item href="/financas" icon={Wallet} label="Finanças" active={!!path?.startsWith("/financas")} />
        <button
          onClick={onMore}
          className="flex flex-col items-center justify-center gap-1 min-h-[52px] px-2 text-[10.5px] font-medium text-[var(--muted-foreground)]"
          aria-label="Mais"
        >
          <MoreHorizontal className="h-[19px] w-[19px]" /> Mais
        </button>
      </div>
    </nav>
  );
}
