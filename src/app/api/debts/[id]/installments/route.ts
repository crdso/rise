import { financialError } from "@/lib/finance/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true, data: [] });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabase.from("debt_installments").select("*").eq("debt_id", id).eq("user_id", user.id).order("installment_number");
  if (error) { const safe = financialError(error); return NextResponse.json({ error: safe.error }, { status: safe.status }); }
  return NextResponse.json({ data });
}
