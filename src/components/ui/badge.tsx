import { cn } from "@/lib/utils";
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)]", className)} {...props} />;
}
