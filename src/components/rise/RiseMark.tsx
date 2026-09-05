/**
 * Marca do RISE — o triângulo ascendente do favicon.
 * Mesma forma em favicon, sidebar, login e ícones do PWA.
 * Usa currentColor, então herda a cor do contexto.
 */

export function RiseMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M16 5.2 27.6 25.9H4.4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Marca dentro do disco escuro, como no favicon. */
export function RiseBadge({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div
      className={`shrink-0 rounded-full bg-[var(--sidebar)] text-[var(--foreground)] grid place-items-center border border-[var(--border-strong)] ${className || ""}`}
      style={{ width: size, height: size }}
    >
      <RiseMark size={Math.round(size * 0.5)} />
    </div>
  );
}

/** Marca + wordmark. */
export function RiseLogo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className || ""}`}>
      <RiseBadge size={size} />
      <span
        className="font-semibold tracking-[0.16em] uppercase leading-none"
        style={{ fontSize: Math.max(11, Math.round(size * 0.4)) }}
      >
        RISE
      </span>
    </div>
  );
}
