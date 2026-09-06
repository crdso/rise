import { financialError } from "@/lib/finance/errors";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const schema = z.object({ order: z.array(z.string().uuid()).min(1).max(100) }).strict();

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true });
  const supabase = await createClient();
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ordem inválida" }, { status: 400 });
  const { error } = await supabase!.rpc("reorder_accounts_with_audit", { p_order: parsed.data.order });
  if (error) { const safe = financialError(error); return NextResponse.json({ error: safe.error }, { status: safe.status }); }
  return NextResponse.json({ data: null });
}
