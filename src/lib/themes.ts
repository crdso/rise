export type ThemeId = "midnight" | "forest" | "emerald" | "amethyst" | "ocean" | "obsidian" | "frost" | "sunset";

export const THEMES: Record<ThemeId, { label: string; desc: string; accent: string }> = {
  midnight: { label: "Midnight", desc: "Azul-marinho profundo", accent: "#3B82F6" },
  forest: { label: "Forest", desc: "Verde floresta escuro", accent: "#22C55E" },
  emerald: { label: "Emerald", desc: "Preto + esmeralda", accent: "#10B981" },
  amethyst: { label: "Amethyst", desc: "Preto + roxo profundo", accent: "#8B5CF6" },
  ocean: { label: "Ocean", desc: "Navy + ciano", accent: "#06B6D4" },
  obsidian: { label: "Obsidian", desc: "Preto absoluto minimal", accent: "#E5E7EB" },
  frost: { label: "Frost", desc: "Branco azulado elegante", accent: "#2563EB" },
  sunset: { label: "Sunset", desc: "Roxo escuro + bordô", accent: "#F43F5E" },
};

export const DEFAULT_THEME: ThemeId = "midnight";
