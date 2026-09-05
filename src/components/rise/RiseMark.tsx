import Image from "next/image";

/** Marca única do RISE, reutilizada em header, sidebar e login. */

export function RiseMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/icons/R.png"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 ${className || ""}`}
    />
  );
}

/** Alias sem moldura para os usos compactos da marca. */
export function RiseBadge({ size = 32, className }: { size?: number; className?: string }) {
  return <RiseMark size={size} className={className} />;
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
