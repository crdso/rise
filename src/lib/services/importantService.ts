import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useImportantStore } from "@/lib/store/importantStore";
import type { ImportantInput, ImportantItem } from "@/types/important";

function uid() { return crypto.randomUUID(); }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof j.error === "string" ? j.error : `API ${r.status}`);
  return j.data as T;
}

export const importantService = {
  list(): ImportantItem[] {
    return useImportantStore.getState().items;
  },

  async create(input: ImportantInput): Promise<ImportantItem> {
    if (!isSupabaseConfigured()) {
      const now = new Date().toISOString();
      const item: ImportantItem = {
        id: uid(),
        user_id: "demo",
        title: input.title.trim(),
        content: input.content?.trim() || null,
        tag: input.tag?.trim() || null,
        pinned: !!input.pinned,
        remind_at: input.remind_at || null,
        archived_at: null,
        created_at: now,
        updated_at: now,
      };
      useImportantStore.getState().upsertItem(item);
      return item;
    }
    const created = await api<ImportantItem>("/api/importantes", { method: "POST", body: JSON.stringify(input) });
    useImportantStore.getState().upsertItem(created);
    return created;
  },

  async update(id: string, patch: Partial<ImportantInput>): Promise<ImportantItem> {
    if (!isSupabaseConfigured()) {
      const prev = useImportantStore.getState().items.find((i) => i.id === id);
      if (!prev) throw new Error("item not found");
      const next: ImportantItem = {
        ...prev,
        ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
        ...(patch.content !== undefined ? { content: patch.content?.trim() || null } : {}),
        ...(patch.tag !== undefined ? { tag: patch.tag?.trim() || null } : {}),
        ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
        ...(patch.remind_at !== undefined ? { remind_at: patch.remind_at || null } : {}),
        updated_at: new Date().toISOString(),
      };
      useImportantStore.getState().upsertItem(next);
      return next;
    }
    const updated = await api<ImportantItem>(`/api/importantes/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    useImportantStore.getState().upsertItem(updated);
    return updated;
  },

  async togglePin(id: string): Promise<ImportantItem> {
    if (!isSupabaseConfigured()) {
      const prev = useImportantStore.getState().items.find((i) => i.id === id);
      if (!prev) throw new Error("item not found");
      const next = { ...prev, pinned: !prev.pinned, updated_at: new Date().toISOString() };
      useImportantStore.getState().upsertItem(next);
      return next;
    }
    const updated = await api<ImportantItem>(`/api/importantes/${id}/pin`, { method: "POST" });
    useImportantStore.getState().upsertItem(updated);
    return updated;
  },

  /** Arquivar é a ação destrutiva "leve": nada é apagado de fato. */
  async setArchived(id: string, archived: boolean): Promise<ImportantItem> {
    if (!isSupabaseConfigured()) {
      const prev = useImportantStore.getState().items.find((i) => i.id === id);
      if (!prev) throw new Error("item not found");
      const next: ImportantItem = {
        ...prev,
        archived_at: archived ? new Date().toISOString() : null,
        pinned: archived ? false : prev.pinned,
        updated_at: new Date().toISOString(),
      };
      useImportantStore.getState().upsertItem(next);
      return next;
    }
    const updated = await api<ImportantItem>(`/api/importantes/${id}/archive`, {
      method: "POST",
      body: JSON.stringify({ archived }),
    });
    useImportantStore.getState().upsertItem(updated);
    return updated;
  },

  async refreshFromServer() {
    if (!isSupabaseConfigured()) return;
    const r = await fetch("/api/importantes");
    if (!r.ok) throw new Error("important sync failed");
    const j = await r.json();
    if (Array.isArray(j.data)) useImportantStore.getState().setItems(j.data);
  },
};
