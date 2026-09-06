import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";
const hasOpenAI = !!process.env.OPENAI_API_KEY?.trim();

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true, data: { provider: "Demonstração", model: "Interpretador local", today: 0, month: 0, successRate: null, averageLatency: null, lastUsedAt: null } });
  const supabase = await createClient();
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase!.from("ai_interactions").select("provider,model,status,latency_ms,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const month = day.slice(0, 7);
  const rows = data ?? [];
  const today = rows.filter((row) => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date(row.created_at)) === day);
  const thisMonth = rows.filter((row) => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date(row.created_at)).startsWith(month));
  const completed = rows.filter((row) => row.status === "success");
  const latencies = completed.map((row) => row.latency_ms).filter((value): value is number => typeof value === "number");
  return NextResponse.json({ data: { provider: hasOpenAI ? "OpenAI" : "Demonstração", model: hasOpenAI ? model : "Interpretador local", today: today.length, month: thisMonth.length, successRate: rows.length ? Math.round((completed.length / rows.length) * 100) : null, averageLatency: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null, lastUsedAt: rows[0]?.created_at ?? null } });
}
