import { financialError } from "@/lib/finance/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true, data: [] });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 100)));
  const { data, error } = await supabase.from("debt_payments").select("*").eq("user_id", user.id).order("paid_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error) { const safe = financialError(error); return NextResponse.json({ error: safe.error }, { status: safe.status }); }
  return NextResponse.json({ data });
}
