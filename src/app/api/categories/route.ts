import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { categorySchema } from "@/lib/validators/finance";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true, data: [] });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("transaction_categories").select("*").eq("user_id", user.id).order("name");
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
  const parsed = categorySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // 010: escrita direta em transaction_categories foi bloqueada por RLS.
  // A RPC faz dedup case-insensitive e audita apenas quando de fato cria.
  const { data, error } = await supabase.rpc("create_category_with_audit", {
    p_name: parsed.data.name.trim(),
    p_icon: parsed.data.icon || null,
    p_color: parsed.data.color || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
