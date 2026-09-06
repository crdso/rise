import { financialError } from "@/lib/finance/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { transactionPatchSchema } from "@/lib/validators/finance";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const json = await req.json();
  const parsed = transactionPatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.rpc("update_transaction_guarded_with_audit", {
    p_id: id,
    // envia o payload VALIDADO, não o json cru
    p_patch: parsed.data as unknown as Record<string, unknown>,
  });

  if (error) {
    const safe = financialError(error);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
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

  const { error } = await supabase.rpc("delete_transaction_guarded_with_audit", {
    p_id: id,
  });

  if (error) {
    const safe = financialError(error);
    return NextResponse.json({ error: safe.error }, { status: safe.status });
  }
  return NextResponse.json({ ok: true });
}
