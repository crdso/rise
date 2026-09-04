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
  const name = parsed.data.name.trim();
  // tenta inserir com ON CONFLICT (índice lower(trim(name))) para evitar race
  const { data: inserted, error: insertErr } = await supabase.from("transaction_categories").insert({ user_id: user.id, name, icon: parsed.data.icon || null, color: parsed.data.color || null }).select().single();
  if (!insertErr && inserted) return NextResponse.json({ data: inserted });
  // se conflitou (duplicata case-insensitive), busca existente
  if (insertErr && (insertErr.message.includes("duplicate") || insertErr.code === "23505")) {
    const { data: existing } = await supabase.from("transaction_categories").select("*").eq("user_id", user.id);
    const found = (existing as { id: string; name: string }[] | null)?.find((c) => c.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (found) return NextResponse.json({ data: found });
  }
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  return NextResponse.json({ data: inserted });
}
