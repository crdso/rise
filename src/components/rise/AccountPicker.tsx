"use client";
import { BrandLogo } from "@/components/rise/BrandLogo";
import { brandForAccount } from "@/lib/brands/registry";
import { Ban } from "lucide-react";
import type { Account } from "@/types/finance";

/**
 * Seleção de conta com a logo real.
 *
 * Um <select> nativo não aceita imagem dentro da <option>, então a escolha
 * vira uma faixa de chips roláveis — que também funciona melhor no toque
 * do que um dropdown nativo em lista longa.
 */
export function AccountPicker({
  accounts,
  value,
  onChange,
  allowNone = true,
  label = "Conta",
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
  allowNone?: boolean;
  label?: string;
}) {
  const list = accounts.filter((a) => a.is_active);

  return (
    <div>
      <label className="text-xs text-[var(--faint)] uppercase tracking-wide">{label}</label>
      <div
        className="mt-1.5 flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-0.5 px-0.5"
        role="radiogroup"
        aria-label={label}
      >
        {allowNone && (
          <button
            type="button"
            role="radio"
            aria-checked={value === ""}
            onClick={() => onChange("")}
            className={`shrink-0 inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[12.5px] transition-colors ${
              value === ""
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)] hover:border-[var(--border-strong)]"
            }`}
          >
            <Ban className="h-4 w-4" />
            Sem conta
          </button>
        )}

        {list.map((a) => {
          const brand = brandForAccount(a);
          const generic = !brand.domain && (a.type === "cash" || a.type === "wallet");
          const active = value === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(a.id)}
              className={`shrink-0 inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[12.5px] font-medium transition-colors ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border)] bg-[var(--card-soft)] hover:border-[var(--border-strong)]"
              }`}
            >
              <BrandLogo
                domain={brand.domain}
                name={brand.domain ? brand.name : a.name}
                color={brand.color || a.color}
                size={22}
                generic={generic}
              />
              <span className="max-w-[130px] truncate">{a.name}</span>
            </button>
          );
        })}

        {list.length === 0 && (
          <p className="text-[12.5px] text-[var(--muted-foreground)] py-2">Nenhuma conta ativa cadastrada.</p>
        )}
      </div>
    </div>
  );
}
