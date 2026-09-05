import { createClient } from "@supabase/supabase-js";
import "server-only";

// server-only helper - nunca importar no client
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("SUPABASE_SECRET_KEY ausente. Configure a chave secreta para operações administrativas e auditoria.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function tryCreateAdminClient() {
  try { return createAdminClient(); } catch { return null; }
}
