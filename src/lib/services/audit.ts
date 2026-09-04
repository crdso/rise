import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AuditEntry } from "@/types/finance";

export async function logAudit(entry: Omit<AuditEntry, "id" | "created_at">) {
  if (isSupabaseConfigured()) {
    // server-side via API; fire-and-forget
    try {
      await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) });
    } catch {}
    return;
  }
  // demo: handled by store pushAudit directly in callers
}
