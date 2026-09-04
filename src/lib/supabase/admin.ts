import { createClient } from "@supabase/supabase-js";

// server-only helper - nunca importar no client
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente. Configure a chave service_role para operações com audit log.");
  }
  if (!url.trim() || !key.trim()) throw new Error("SUPABASE_SERVICE_ROLE_KEY inválida.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function tryCreateAdminClient() {
  try { return createAdminClient(); } catch { return null; }
}
