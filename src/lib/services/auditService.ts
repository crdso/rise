import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useFinanceStore } from "@/lib/store/financeStore";
import type { AuditEntry } from "@/types/finance";

/**
 * Registro de auditoria.
 *
 * Em modo Supabase vem do servidor (a tabela é imutável para o client: só as
 * funções SECURITY DEFINER escrevem nela). Em modo demonstração, o próprio
 * financeStore acumula as entradas localmente.
 */
export const auditService = {
  async list(limit = 200): Promise<AuditEntry[]> {
    if (!isSupabaseConfigured()) {
      return useFinanceStore.getState().audits;
    }
    const r = await fetch(`/api/audit?limit=${encodeURIComponent(String(limit))}`);
    if (!r.ok) throw new Error("Não foi possível carregar a auditoria.");
    const j = await r.json();
    return Array.isArray(j.data) ? (j.data as AuditEntry[]) : [];
  },
};
