import { z } from "zod";
import { financialError } from "@/lib/finance/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { debtPaymentSchema } from "@/lib/validators/debt";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = debtPaymentSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const p = parsed.data;
  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (!idempotencyKey || !z.string().uuid().safeParse(idempotencyKey).success) return NextResponse.json({ error: "Idempotency-Key obrigatória" }, { status: 400 });
  const { data, error } = await supabase.rpc("add_debt_payment_idempotent_with_audit", {
    p_idempotency_key: idempotencyKey,
    p_debt_id: id,
    p_amount: p.amount,
    p_paid_at: p.paid_at ? new Date(p.paid_at).toISOString() : null,
    p_notes: p.notes || null,
    p_create_transaction: p.create_transaction || false,
    p_account_id: p.account_id || null,
    p_category_name: p.transaction_category || null,
    p_installment_id: p.installment_id || null,
  });
  if (error) { const safe = financialError(error); return NextResponse.json({ error: safe.error }, { status: safe.status }); }
  return NextResponse.json({ data });
}
