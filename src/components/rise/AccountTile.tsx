"use client";
import { formatBRL } from "@/lib/utils";
import { BrandLogo } from "@/components/rise/BrandLogo";
import { brandForAccount } from "@/lib/brands/registry";
import type { AccountType } from "@/types/finance";

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  card: "Cartão",
  wallet: "Carteira digital",
  cash: "Dinheiro",
  other: "Outra",
};

export function AccountTile({
  name,
  balance,
  color,
  type,
  fallback,
  brand_domain,
  brand_key,
}: {
  name: string;
  balance: number;
  color: string;
  type: string;
  fallback: string;
  brand_domain?: string | null;
  brand_key?: string | null;
}) {
  const brand = brandForAccount({ name, brand_domain: brand_domain ?? null, brand_key: brand_key ?? null });
  const generic = !brand.domain && (type === "cash" || type === "wallet");
  const negative = balance < 0;

  return (
    <div className="min-w-[152px] sm:min-w-0 rounded-[16px] border border-[var(--border)] bg-[var(--card-soft)] p-3.5 flex flex-col gap-3 hover:border-[var(--border-strong)] transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <BrandLogo
          domain={brand.domain}
          name={brand.domain ? brand.name : name}
          color={brand.color || color}
          size={34}
          generic={generic}
        />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-none tracking-tight truncate">{name}</p>
          <p className="text-[11px] text-[var(--faint)] truncate mt-1">
            {ACCOUNT_TYPE_LABEL[type as AccountType] ?? fallback}
          </p>
        </div>
      </div>
      <p className={`text-[15px] font-semibold tracking-tight tnum ${negative ? "text-[var(--negative)]" : ""}`}>
        {formatBRL(balance)}
      </p>
    </div>
  );
}
