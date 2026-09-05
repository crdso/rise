import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { SettingsPatch } from "@/lib/validators/settings";

export type RemoteSettings = {
  theme: string | null;
  custom_theme: { colors: string[]; angle: number; intensity: number; presetId?: string | null } | null;
  ambient_intensity: number | null;
  reduced_motion: boolean | null;
  density: "comfortable" | "compact" | null;
  dashboard: { order: string[]; hidden: string[]; spans?: Record<string, "wide" | "narrow"> } | null;
};

/**
 * Preferências de aparência e painel.
 *
 * Em modo Demo tudo vive em localStorage (o provider já cuida disso) e este
 * service não faz nada. Em modo Supabase, o servidor é a fonte da verdade e o
 * localStorage vira só um cache para evitar flash na primeira pintura.
 *
 * As escritas são "melhor esforço": falha de rede não pode quebrar a UI de
 * configurações, só deixar de sincronizar.
 */
export const settingsService = {
  async load(): Promise<RemoteSettings | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const r = await fetch("/api/settings");
      if (!r.ok) return null;
      const j = await r.json();
      return (j.data as RemoteSettings) ?? null;
    } catch {
      return null;
    }
  },

  async save(patch: SettingsPatch): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } catch {
      /* melhor esforço */
    }
  },
};
