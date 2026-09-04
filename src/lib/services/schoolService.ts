import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useSchoolStore } from "@/lib/store/schoolStore";
import type { SchoolBaseStatus, SchoolTask, SchoolTaskInput } from "@/types/school";

function uid() { return crypto.randomUUID(); }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : `API ${r.status}`);
  return j.data as T;
}

export const schoolService = {
  list(): SchoolTask[] {
    return useSchoolStore.getState().tasks;
  },

  async create(input: SchoolTaskInput): Promise<SchoolTask> {
    if (!isSupabaseConfigured()) {
      const now = new Date().toISOString();
      const task: SchoolTask = {
        id: uid(),
        user_id: "demo",
        workspace_id: "demo-ws",
        subject_id: null,
        subject: input.subject?.trim() || null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        notes: input.notes?.trim() || null,
        type: input.type,
        priority: input.priority,
        status: "not_started",
        due_at: input.due_at || null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      };
      useSchoolStore.getState().upsertTask(task);
      return task;
    }
    const created = await api<SchoolTask>("/api/escola", { method: "POST", body: JSON.stringify(input) });
    useSchoolStore.getState().upsertTask(created);
    return created;
  },

  async update(id: string, patch: Partial<SchoolTaskInput> & { status?: SchoolBaseStatus }): Promise<SchoolTask> {
    if (!isSupabaseConfigured()) {
      const prev = useSchoolStore.getState().tasks.find((t) => t.id === id);
      if (!prev) throw new Error("task not found");
      const next: SchoolTask = {
        ...prev,
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.subject !== undefined ? { subject: patch.subject?.trim() || null } : {}),
        ...(patch.description !== undefined ? { description: patch.description?.trim() || null } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
        ...(patch.type !== undefined ? { type: patch.type } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.due_at !== undefined ? { due_at: patch.due_at || null } : {}),
        ...(patch.status !== undefined
          ? { status: patch.status, completed_at: patch.status === "done" ? new Date().toISOString() : null }
          : {}),
        updated_at: new Date().toISOString(),
      };
      useSchoolStore.getState().upsertTask(next);
      return next;
    }
    const updated = await api<SchoolTask>(`/api/escola/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    useSchoolStore.getState().upsertTask(updated);
    return updated;
  },

  setStatus(id: string, status: SchoolBaseStatus) {
    return this.update(id, { status });
  },

  async refreshFromServer() {
    if (!isSupabaseConfigured()) return;
    const r = await fetch("/api/escola");
    if (!r.ok) throw new Error("school sync failed");
    const j = await r.json();
    if (Array.isArray(j.data)) useSchoolStore.getState().setTasks(j.data);
    if (j.workspace) useSchoolStore.getState().setWorkspace(j.workspace);
  },
};
