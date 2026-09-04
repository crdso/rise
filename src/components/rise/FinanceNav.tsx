"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/financas" as const, label: "Transações" },
  { href: "/financas/contas" as const, label: "Contas" },
  { href: "/financas/dividas" as const, label: "Dívidas" },
];

export function FinanceNav() {
  const path = usePathname();
  return (
    <div className="flex gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--card)] w-fit">
      {TABS.map(t=>{
        const active = path===t.href;
        return <Link key={t.href} href={t.href} className={cn("px-4 py-1.5 rounded-full text-xs font-medium", active?"bg-[var(--accent)] text-white":"text-[var(--muted-foreground)]")}>{t.label}</Link>;
      })}
    </div>
  );
}
