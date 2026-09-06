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
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 80)));
  let query = supabase.from("transactions").select("*, account:accounts(*), category:transaction_categories(*)").eq("user_id", user.id).order("occurred_at", { ascending: false }).range(offset, offset + limit - 1);
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
  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (!idempotencyKey) return NextResponse.json({ error: "Idempotency-Key obrigatória" }, { status: 400 });

  const { data, error } = await supabase.rpc("create_transaction_idempotent_with_audit", {
    p_idempotency_key: idempotencyKey,
    p_type: rest.type,
    p_amount: rest.amount,
    p_description: rest.description ?? null,
    p_category_id: rest.category_id ?? null,
    p_category_name: rest.category_name ?? null,
    p_account_id: rest.account_id ?? null,
    p_occurred_at: rest.occurred_at,
    p_notes: rest.notes ?? null,
    p_payment_method: rest.payment_method ?? null,
    p_is_recurring: rest.is_recurring ?? false,
  });

  if (error) {
    if (error.message.includes("account not found") || error.message.includes("category not found")) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}
