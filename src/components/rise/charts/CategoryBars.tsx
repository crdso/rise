"use client";
import { formatBRL } from "@/lib/utils";
import type { CategorySlice } from "@/lib/finance/analytics";

const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/**
 * Participação de cada categoria no gasto do mês.
 *
 * Identidade nunca fica só na cor: cada barra vem com rótulo direto
 * (nome + valor + %). As cores seguem a ordem fixa da paleta — a quinta
 * posição em diante vira "Outras", nunca uma cor gerada na hora.
 */
export function CategoryBars({
  slices,
  max = 5,
  className,
}: {
  slices: CategorySlice[];
  max?: number;
  className?: string;
}) {
  if (!slices.length) return null;

  const head = slices.slice(0, max);
  const tail = slices.slice(max);
  const rest = tail.reduce((s, c) => s + c.amount, 0);
  const restPct = tail.reduce((s, c) => s + c.pct, 0);
  const rows = rest > 0 ? [...head, { id: "__other", name: "Outras", amount: rest, pct: restPct }] : head;
  const top = Math.max(...rows.map((r) => r.pct), 1);

  return (
    <ul className={`space-y-2.5 ${className || ""}`}>
      {rows.map((row, i) => {
        const color = row.id === "__other" ? "var(--muted-foreground)" : SERIES[i % SERIES.length];
        return (
          <li key={row.id ?? row.name}>
            <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} aria-hidden />
                <span className="truncate text-[var(--foreground)]">{row.name}</span>
              </span>
              <span className="shrink-0 tnum text-[var(--muted-foreground)]">
                {formatBRL(row.amount)}
                <span className="ml-1.5 text-[var(--faint)]">{row.pct.toFixed(0)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (row.pct / top) * 100)}%`, background: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
