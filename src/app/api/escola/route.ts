import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { schoolTaskSchema } from "@/lib/validators/school";

/** Achata o join para o formato que a UI usa (subject como texto). */
type Row = { subject?: { name: string } | null; [k: string]: unknown };
const flatten = (rows: Row[]) =>
  rows.map((r) => ({ ...r, subject: r.subject?.name ?? null }));

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true, data: [], workspace: null });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // garante o workspace do ano letivo e aplica o arquivamento se a data chegou
  const { data: workspace } = await supabase.rpc("ensure_school_workspace");
  await supabase.rpc("archive_school_workspaces_if_due");

  const { data, error } = await supabase
    .from("school_tasks")
    .select("*, subject:school_subjects(name)")
    .eq("user_id", user.id)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: flatten((data ?? []) as Row[]), workspace });
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = schoolTaskSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { data, error } = await supabase.rpc("create_school_task_with_audit", {
    p_title: parsed.data.title,
    p_subject: parsed.data.subject || null,
    p_description: parsed.data.description || null,
    p_type: parsed.data.type,
    p_priority: parsed.data.priority,
    p_due_at: parsed.data.due_at || null,
    p_notes: parsed.data.notes || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: { ...data, subject: parsed.data.subject || null } });
}
