import { financialError } from "@/lib/finance/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true, data: null });
  const supabase = await createClient();
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = new URL(request.url).searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Mês inválido" }, { status: 400 });
  const { data, error } = await supabase!.rpc("finance_summary", { p_month: month });
  if (error) { const safe = financialError(error); return NextResponse.json({ error: safe.error }, { status: safe.status }); }
  return NextResponse.json({ data });
}
