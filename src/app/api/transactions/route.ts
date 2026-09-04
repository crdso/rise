import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { transactionSchema } from "@/lib/validators/finance";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true, data: [] });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const type = url.searchParams.get("type");
  let query = supabase.from("transactions").select("*, account:accounts(*), category:transaction_categories(*)").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(50);
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let filtered = data;
  if (q) filtered = (data as never[]).filter((r: { description?: string; notes?: string }) => (r.description || "").toLowerCase().includes(q.toLowerCase()));
  return NextResponse.json({ data: filtered });
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = transactionSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const rest = parsed.data as unknown as { category_id?: string | null; category_name?: string | null; account_id?: string | null; type: string; amount: number; description?: string | null; occurred_at: string; notes?: string | null; payment_method?: string | null; is_recurring?: boolean };
  let category_id = rest.category_id ?? null;
  const category_name = rest.category_name ?? null;
  // inline category create
  if (!category_id && category_name) {
    const { data: cat } = await supabase.from("transaction_categories").insert({ user_id: user.id, name: category_name }).select().single();
    if (cat) category_id = (cat as { id: string }).id;
  }
  const row = { user_id: user.id, type: rest.type, amount: rest.amount, description: rest.description, occurred_at: rest.occurred_at, notes: rest.notes, payment_method: rest.payment_method, is_recurring: rest.is_recurring, category_id, account_id: rest.account_id ?? null };
  const { data, error } = await supabase.from("transactions").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await supabase.from("audit_logs").insert({ user_id: user.id, actor: "Você", action: (row as unknown as { type: string }).type === "expense" ? "criou uma despesa" : "criou uma receita", entity: "transaction", entity_id: data.id, after: row, origin: "web" }); } catch {}
  return NextResponse.json({ data });
}
