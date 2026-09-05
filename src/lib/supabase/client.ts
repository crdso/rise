import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl, isSupabaseConfigured } from "./config";

export function createClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(
    getSupabaseUrl()!,
    getSupabasePublishableKey()!
  );
}
