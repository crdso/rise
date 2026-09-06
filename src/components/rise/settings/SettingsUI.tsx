"use client";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

/**
 * Primitivas de Configurações.
 * Cada opção é uma LINHA, não um card gigante — é o que faz uma tela de
 * ajustes parecer produto e não um mural de blocos.
 */

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-[12.5px] text-[var(--muted-foreground)] mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function SettingsPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[14px] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden ${className || ""}`}
    >
      {children}
    </div>
  );
}

export function SettingsRow({
  label,
  hint,
  icon,
  control,
  children,
}: {
  label: string;
  hint?: string;
  icon?: ReactNode;
  control?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {icon && <span className="mt-0.5 shrink-0 text-[var(--muted-foreground)]">{icon}</span>}
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium leading-tight">{label}</p>
            {hint && <p className="text-[12px] text-[var(--muted-foreground)] mt-1 leading-snug">{hint}</p>}
          </div>
        </div>
        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function SettingsLinkRow({
  href,
  label,
  hint,
  icon,
}: {
  href: "/financas" | "/financas/contas" | "/financas/dividas" | "/calendario" | "/lembretes" | "/escola" | "/resumos" | "/configuracoes/auditoria";
  label: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Link href={href} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--card-soft)] transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        {icon && <span className="mt-0.5 shrink-0 text-[var(--muted-foreground)]">{icon}</span>}
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium leading-tight">{label}</p>
          {hint && <p className="text-[12px] text-[var(--muted-foreground)] mt-1 leading-snug">{hint}</p>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--faint)]" />
    </Link>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border p-0.5 transition-[background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] disabled:cursor-not-allowed disabled:opacity-45 ${
        checked ? "border-[var(--accent)] bg-[var(--accent)] hover:brightness-110" : "border-[var(--border-strong)] bg-[var(--muted)] hover:bg-[var(--card-soft)]"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition-transform duration-150 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex gap-0.5 p-0.5 rounded-full border border-[var(--border)] bg-[var(--card-soft)]"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
            value === o.value
              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function StatusPill({ ok, okLabel, offLabel }: { ok: boolean; okLabel: string; offLabel: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        ok
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
          : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-[var(--faint)]"}`} />
      {ok ? okLabel : offLabel}
    </span>
  );
}
