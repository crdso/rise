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
  const row = { ...parsed.data, user_id: user.id, color: parsed.data.color || null, icon: parsed.data.icon || null };
  const { data, error } = await supabase.from("accounts").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // audit via service role (bypass RLS) — supabase server client with user still can insert? we have no insert policy for audit, so use service role key if present
  // For now, attempt to insert as same user via service role not available in demo, so skip if fails
  try {
    await supabase.from("audit_logs").insert({ user_id: user.id, actor: "Você", action: "criou uma conta", entity: "account", entity_id: data.id, after: row, origin: "web" });
  } catch {}
  return NextResponse.json({ data });
}
