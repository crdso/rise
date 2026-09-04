import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { accountPatchSchema } from "@/lib/validators/finance";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const json = await req.json();
  // accountPatchSchema não tem .default(is_active) — com o schema de criação,
  // renomear uma conta desativada reenviava is_active:true e a reativava em silêncio.
  const parsed = accountPatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.rpc("update_account_with_audit", {
    p_id: id,
    p_patch: parsed.data as unknown as Record<string, unknown>,
  });

  if (error) {
    if (error.message.includes("not found")) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}
