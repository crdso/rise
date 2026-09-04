import * as React from "react";
import { cn } from "@/lib/utils";

export function Section({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("space-y-3", className)} {...props} />;
}
export function SectionHeader({ title, action, subtitle }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[13px] font-semibold tracking-[0.08em] uppercase text-[var(--faint)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--muted-foreground)] mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Surface({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[20px] border border-[var(--border)] bg-[var(--card)]", className)} {...props} />;
}
export function FlatSurface({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl bg-[var(--card-soft)] border border-[var(--border)]", className)} {...props} />;
}
