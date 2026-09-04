import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { transactionSchema } from "@/lib/validators/finance";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const json = await req.json();
  const parsed = transactionSchema.partial().safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const p = parsed.data as unknown as { type?: string; amount?: number; description?: string | null; category_id?: string | null; category_name?: string | null; account_id?: string | null; occurred_at?: string; notes?: string | null; payment_method?: string | null; is_recurring?: boolean };

  const { data, error } = await supabase.rpc("update_transaction_with_audit", {
    p_user_id: user.id,
    p_id: id,
    p_type: p.type ?? null,
    p_amount: p.amount ?? null,
    p_description: p.description ?? null,
    p_category_id: p.category_id ?? null,
    p_category_name: p.category_name ?? null,
    p_account_id: p.account_id ?? null,
    p_occurred_at: p.occurred_at ?? null,
    p_notes: p.notes ?? null,
    p_payment_method: p.payment_method ?? null,
    p_is_recurring: p.is_recurring ?? null,
  });

  if (error) {
    if (error.message.includes("not found")) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (error.message.includes("account not found") || error.message.includes("category not found")) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { error } = await supabase.rpc("delete_transaction_with_audit", {
    p_user_id: user.id,
    p_id: id,
  });

  if (error) {
    if (error.message.includes("not found")) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
