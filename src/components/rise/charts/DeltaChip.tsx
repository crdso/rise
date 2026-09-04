"use client";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

/**
 * Variação percentual contra o período anterior.
 * Sempre ícone + texto: a cor nunca é o único portador do significado.
 * `null` (sem base de comparação) vira um estado neutro honesto.
 */
export function DeltaChip({
  pct,
  invert = true,
  suffix = "vs. mês anterior",
}: {
  pct: number | null;
  /** true quando cair é bom (gastos). false quando subir é bom (receitas). */
  invert?: boolean;
  suffix?: string;
}) {
  if (pct === null || !Number.isFinite(pct)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-1 text-[11px] text-[var(--muted-foreground)]">
        <Minus className="h-3 w-3" /> sem comparação {suffix.replace("vs. ", "com ")}
      </span>
    );
  }

  const up = pct > 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  const tone = good
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
    : "border-amber-500/25 bg-amber-500/10 text-amber-300";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" />
      <span className="tnum">
        {up ? "+" : ""}
        {pct.toFixed(0)}%
      </span>
      <span className="opacity-80">{suffix}</span>
    </span>
  );
}
