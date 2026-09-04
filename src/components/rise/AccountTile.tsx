"use client";
import { formatBRL } from "@/lib/utils";
import { BrandLogo } from "@/components/rise/BrandLogo";
import { brandForAccount } from "@/lib/brands/registry";

export function AccountTile({ name, balance, color, type, logo, fallback, brand_domain, brand_key }: { name: string; balance: number; color: string; type: string; logo?: string; fallback: string; brand_domain?: string | null; brand_key?: string | null }) {
  const brand = brandForAccount({ name, brand_domain: brand_domain ?? null, brand_key: brand_key ?? null });
  return (
    <div className="min-w-[148px] sm:min-w-0 rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col gap-3 hover:border-[var(--border-strong)] hover:shadow-sm transition-all">
      <div className="flex items-center gap-2.5">
        {brand?.domain ? (
          <BrandLogo domain={brand.domain} name={brand.name} size={36} className="rounded-xl border border-[var(--border)] bg-white" />
        ) : (
          <div className="h-9 w-9 rounded-xl grid place-items-center text-white font-bold text-xs shrink-0" style={{ background: color }}>
            <span className="grid place-items-center h-full w-full">{fallback}</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-none tracking-tight truncate">{name}</p>
          <p className="text-[11px] text-[var(--faint)] truncate">{type}</p>
        </div>
      </div>
      <p className="text-[15px] font-bold tracking-tight">{formatBRL(balance)}</p>
    </div>
  );
}
