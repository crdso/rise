import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// POST removido: audit log não pode ser criado pelo client com conteúdo arbitrário.
// Audit é criado server-side pelas rotas deaccounts/transactions via service role.
// Mantemos apenas GET autenticado para leitura dos próprios logs.

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true, data: [] });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("audit_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(80);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
