"use client";
import { formatBRL } from "@/lib/utils";

export function AccountTile({ name, balance, color, type, logo, fallback }: { name: string; balance: number; color: string; type: string; logo: string; fallback: string }) {
  return (
    <div className="min-w-[148px] sm:min-w-0 rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col gap-3 hover:border-[var(--border-strong)] hover:shadow-sm transition-all">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl grid place-items-center text-white font-bold text-xs shrink-0" style={{ background: color }}>
          {/* tenta logo, fallback letra */}
          <img src={logo} alt={name} className="h-5 w-5 object-contain hidden" onError={(e) => ((e.currentTarget.style.display = "none"), ((e.currentTarget.nextSibling as HTMLElement).style.display = "grid"))} />
          <span className="grid place-items-center h-full w-full">{fallback}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-none tracking-tight truncate">{name}</p>
          <p className="text-[11px] text-[var(--faint)] truncate">{type}</p>
        </div>
      </div>
      <p className="text-[15px] font-bold tracking-tight">{formatBRL(balance)}</p>
    </div>
  );
}
