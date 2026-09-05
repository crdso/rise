import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensuredAccountTransactionSchema } from "@/lib/validators/finance";

function safeDatabaseText(value: string | null | undefined) {
  if (!value) return undefined;
  return value.replace(/"[^"\n]*"/g, '"..."').slice(0, 240);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase?.auth.getClaims() ?? { data: null };
  if (!data?.claims?.sub) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = request.headers.get("Idempotency-Key");
  if (!key || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(key)) return NextResponse.json({ error: "Idempotency-Key inválida" }, { status: 400 });
  const parsed = ensuredAccountTransactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  const input = parsed.data;
  const { data: result, error } = await supabase!.rpc("ensure_active_account_and_create_transaction_with_audit", {
    p_idempotency_key: key, p_account_name: input.account_name, p_account_type: input.account_type,
    p_account_color: input.account_color ?? null, p_account_brand_domain: input.account_brand_domain ?? null, p_account_brand_key: input.account_brand_key ?? null,
    p_type: input.type, p_amount: input.amount, p_description: input.description ?? null, p_category_id: input.category_id ?? null, p_category_name: input.category_name ?? null,
    p_occurred_at: input.occurred_at, p_notes: input.notes ?? null, p_payment_method: input.payment_method ?? null, p_is_recurring: input.is_recurring,
  });
  if (error) {
    const details = safeDatabaseText(error.details);
    console.error("[rise-ensure-account]", JSON.stringify({
      stage: "ensure_active_account_and_create_transaction_with_audit",
      rpc: "ensure_active_account_and_create_transaction_with_audit",
      code: error.code,
      message: safeDatabaseText(error.message),
      hint: safeDatabaseText(error.hint),
      ...(details ? { details } : {}),
    }));
    return NextResponse.json({ error: "Não foi possível confirmar a operação." }, { status: 500 });
  }
  return NextResponse.json({ data: result });
}
