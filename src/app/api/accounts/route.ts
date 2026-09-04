import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { accountSchema } from "@/lib/validators/finance";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true, data: [] });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = accountSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // RPC atômico: cria conta + audit em transação única (auth.uid() dentro da função)
  const { data, error } = await supabase.rpc("create_account_with_audit", {
    p_name: parsed.data.name,
    p_type: parsed.data.type,
    p_icon: parsed.data.icon || null,
    p_color: parsed.data.color || null,
    p_initial_balance: parsed.data.initial_balance,
  });

  if (error) {
    // inclui caso service role ausente configurado na função
    const msg = error.message.includes("service_role") || error.message.includes("SUPABASE") ? "Erro de configuração: SUPABASE_SERVICE_ROLE_KEY ausente" : error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ data });
}
