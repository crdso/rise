"use client";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Moldura comum dos blocos do painel.
 * Em modo de edição ganha alça de arrastar e botão de ocultar;
 * fora dele é só o conteúdo, sem cromo extra.
 */
export function WidgetShell({
  title,
  action,
  children,
  editing,
  hidden,
  onToggleHidden,
  dragControls,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  editing?: boolean;
  hidden?: boolean;
  onToggleHidden?: () => void;
  dragControls?: { start: (e: React.PointerEvent) => void };
  className?: string;
}) {
  return (
    <section
      className={`relative rounded-[18px] border bg-[var(--card)] transition-colors ${
        editing ? "border-dashed border-[var(--border-strong)]" : "border-[var(--border)]"
      } ${hidden ? "opacity-45" : ""} ${className || ""}`}
    >
      <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {editing && (
            <button
              type="button"
              onPointerDown={(e) => dragControls?.start(e)}
              className="h-7 w-7 -ml-1.5 shrink-0 grid place-items-center rounded-lg text-[var(--faint)] hover:text-[var(--foreground)] hover:bg-[var(--card-soft)] cursor-grab active:cursor-grabbing touch-none"
              aria-label={`Reordenar ${title}`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <h2 className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[var(--faint)] truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <button
              type="button"
              onClick={onToggleHidden}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-1 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {hidden ? "Oculto" : "Visível"}
            </button>
          ) : (
            action
          )}
        </div>
      </header>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

export function WidgetEmpty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="py-5 text-center">
      <p className="text-[13px] text-[var(--muted-foreground)]">{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
