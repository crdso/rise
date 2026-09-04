"use client";
import { useMemo, useRef, useState } from "react";
import { formatBRL } from "@/lib/utils";
import { formatDateKey } from "@/lib/timezone";
import type { DayPoint } from "@/lib/finance/analytics";

/**
 * Série temporal de uma única métrica (gasto por dia).
 * Série única => sem legenda; o título do bloco nomeia a métrica.
 * Traço fino de 2px, grade recessiva e camada de hover com crosshair.
 */
export function Sparkline({
  points,
  height = 56,
  className,
  color = "var(--chart-1)",
  label = "Gasto",
}: {
  points: DayPoint[];
  height?: number;
  className?: string;
  color?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 100; // viewBox em unidades relativas; o SVG estica com o container
  const H = 100;
  const PAD = 6;

  const { path, area, max, coords } = useMemo(() => {
    const n = points.length;
    if (n === 0) return { path: "", area: "", max: 0, coords: [] as Array<{ x: number; y: number }> };
    const max = Math.max(...points.map((p) => p.amount), 0);
    const span = max || 1;
    const coords = points.map((p, i) => ({
      x: n === 1 ? W / 2 : (i / (n - 1)) * W,
      y: H - PAD - (p.amount / span) * (H - PAD * 2),
    }));
    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
    const area = `${path} L${W},${H} L0,${H} Z`;
    return { path, area, max, coords };
  }, [points]);

  if (!points.length) return null;

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(ratio * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, idx)));
  };

  const active = hover !== null ? points[hover] : null;
  const activeCoord = hover !== null ? coords[hover] : null;

  return (
    <div
      ref={ref}
      className={`relative ${className || ""}`}
      style={{ height }}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={`${label} por dia — máximo ${formatBRL(max)}`}
      >
        <defs>
          <linearGradient id="rise-spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* linha de base recessiva */}
        <line x1="0" y1={H - 0.6} x2={W} y2={H - 0.6} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />

        <path d={area} fill="url(#rise-spark-fill)" />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {activeCoord && (
          <>
            <line
              x1={activeCoord.x}
              y1="0"
              x2={activeCoord.x}
              y2={H}
              stroke="var(--border-strong)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            {/* anel na cor da superfície separa o marcador da linha */}
            <circle cx={activeCoord.x} cy={activeCoord.y} r="4" fill={color} stroke="var(--card)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-[var(--border)] bg-[var(--elevated)] px-2 py-1.5 shadow-lg whitespace-nowrap"
          style={{ left: `${(hover! / Math.max(1, points.length - 1)) * 100}%` }}
        >
          <p className="text-[10px] text-[var(--faint)] leading-none">
            {formatDateKey(active.key, { day: "2-digit", month: "short" })}
          </p>
          <p className="text-[11px] font-semibold tnum leading-none mt-1">{formatBRL(active.amount)}</p>
        </div>
      )}
    </div>
  );
}
