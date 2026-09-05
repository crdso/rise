export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
}

/** Chave pública para browser e clientes de servidor com sessão. */
export function getSupabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    || null;
}

export function isSupabaseConfigured() {
  return !!getSupabaseUrl() && !!getSupabasePublishableKey();
}
