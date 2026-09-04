import { Inbox } from "lucide-react";

export function EmptyState({ title, desc, action }: { title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-8 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-[var(--card-soft)] border border-[var(--border)] grid place-items-center text-[var(--faint)]">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="mt-3 font-semibold text-sm">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)] max-w-[32ch] mx-auto">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
