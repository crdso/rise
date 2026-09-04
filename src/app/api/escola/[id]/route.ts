import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { schoolTaskPatchSchema } from "@/lib/validators/school";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ demo: true });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const json = await req.json();
  const parsed = schoolTaskPatchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { data, error } = await supabase.rpc("update_school_task_with_audit", {
    p_id: id,
    p_patch: parsed.data as unknown as Record<string, unknown>,
  });
  if (error) {
    if (error.message.includes("not found")) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // relê com o join da matéria: devolver o retorno cru da RPC apagaria o nome
  // da matéria no cliente sempre que o patch não incluísse "subject".
  const { data: row } = await supabase
    .from("school_tasks")
    .select("*, subject:school_subjects(name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const flat = row
    ? { ...row, subject: (row as { subject?: { name: string } | null }).subject?.name ?? null }
    : data;
  return NextResponse.json({ data: flat });
}
