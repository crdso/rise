import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { transferSchema } from "@/lib/validators/finance";
import { financialError } from "@/lib/finance/errors";

export async function POST(request: Request) {
  const supabase = await createClient();
  const claims = await supabase?.auth.getClaims();
  if (!claims?.data?.claims?.sub) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const key = z.string().uuid().safeParse(request.headers.get("Idempotency-Key"));
  const parsed = transferSchema.safeParse(await request.json().catch(() => null));
  if (!key.success || !parsed.success) return NextResponse.json({ error: "Confira o valor, as contas e a data da transferência." }, { status: 400 });
  const input = parsed.data;
  const { data, error } = await supabase!.rpc("create_account_transfer_idempotent_with_audit", {
    p_idempotency_key: key.data, p_from_account_id: input.from_account_id, p_to_account_id: input.to_account_id,
    p_amount: input.amount, p_occurred_at: input.occurred_at, p_notes: input.notes,
  });
  if (error) {
    const safe = financialError(error);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
  return NextResponse.json({ data });
}
