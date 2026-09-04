/**
 * RISE — registro de temas.
 *
 * REGRA ABSOLUTA: o RISE é dark-only. Não existe tema claro, nem tema
 * "system" que possa virar claro. O tema personalizado também é dark por
 * construção — o usuário escolhe matiz e acento, nunca a luminosidade do fundo.
 */

export type PresetThemeId =
  | "onyx"
  | "blurple"
  | "ocean"
  | "forest"
  | "emerald"
  | "amethyst"
  | "crimson"
  | "chroma";

export type ThemeId = PresetThemeId | "custom";

export type ThemeMeta = {
  label: string;
  desc: string;
  /** cores do mini-preview do seletor: [fundo, surface, acento, acento secundário] */
  preview: [string, string, string, string];
};

export const THEMES: Record<PresetThemeId, ThemeMeta> = {
  onyx: {
    label: "Onyx",
    desc: "Grafite quase preto",
    preview: ["#08090B", "#101317", "#D3D9E2", "#8FA0B8"],
  },
  blurple: {
    label: "Midnight Blurple",
    desc: "Navy profundo + blurple",
    preview: ["#080913", "#121424", "#5865F2", "#8B93F8"],
  },
  ocean: {
    label: "Deep Ocean",
    desc: "Navy + ciano profundo",
    preview: ["#041016", "#0A2130", "#22B8CF", "#3B82F6"],
  },
  forest: {
    label: "Forest",
    desc: "Verde floresta profundo",
    preview: ["#060B08", "#0E1A13", "#3DA35D", "#A3C46A"],
  },
  emerald: {
    label: "Emerald Night",
    desc: "Preto-esverdeado + esmeralda",
    preview: ["#030A07", "#0A1B13", "#10B981", "#2DD4BF"],
  },
  amethyst: {
    label: "Amethyst",
    desc: "Charcoal + roxo sofisticado",
    preview: ["#0A090F", "#16141F", "#8B5CF6", "#EC4899"],
  },
  crimson: {
    label: "Crimson Dusk",
    desc: "Vinho + vermelho discreto",
    preview: ["#0C0709", "#1A0F13", "#E5484D", "#E8A33D"],
  },
  chroma: {
    label: "Chroma Night",
    desc: "Neutro + ambiente multicolor",
    preview: ["#090A0E", "#14161C", "#7C8CF8", "#22C5C2"],
  },
};

export const THEME_ORDER: PresetThemeId[] = [
  "onyx",
  "blurple",
  "ocean",
  "forest",
  "emerald",
  "amethyst",
  "crimson",
  "chroma",
];

export const DEFAULT_THEME: PresetThemeId = "blurple";

export function isPresetTheme(v: string | null | undefined): v is PresetThemeId {
  return !!v && Object.prototype.hasOwnProperty.call(THEMES, v);
}

/* ============================================================
   TEMA PERSONALIZADO
   ============================================================ */

export type CustomTheme = {
  /** 2 a 5 cores. A primeira é o acento; as demais alimentam o gradiente. */
  colors: string[];
  /** direção do gradiente ambiental, em graus */
  angle: number;
  /** intensidade do ambiente (0.3 – 1.4) */
  intensity: number;
};

export const DEFAULT_CUSTOM: CustomTheme = {
  colors: ["#5865F2", "#22C5C2", "#EC4899"],
  angle: 135,
  intensity: 1,
};

export const CUSTOM_MIN_COLORS = 2;
export const CUSTOM_MAX_COLORS = 5;

/* --- utilidades de cor (sem dependência externa) --- */

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [88, 101, 242];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`;
}

/** Mistura linear entre duas cores. t=0 devolve a, t=1 devolve b. */
function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const k = clamp(t, 0, 1);
  return rgbToHex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k);
}

/** Luminância relativa (WCAG) — usada para decidir texto sobre o acento. */
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto legível sobre uma cor sólida. */
export function readableOn(hex: string) {
  return luminance(hex) > 0.42 ? "#0A0B0D" : "#FFFFFF";
}

/** Garante que o acento tenha presença suficiente sobre fundo escuro. */
function ensureVivid(hex: string) {
  const l = luminance(hex);
  if (l < 0.06) return mix(hex, "#FFFFFF", 0.42); // acento quase preto some no fundo
  return hex;
}

/**
 * Constrói os tokens CSS do tema personalizado.
 *
 * A luminosidade da base é FIXA e escura. As cores do usuário entram apenas
 * como matiz (tint sutil nas surfaces) e como acento/ambiente. Por isso é
 * impossível o tema personalizado virar claro, independente do que for escolhido.
 */
export function buildCustomTheme(custom: CustomTheme): Record<string, string> {
  const colors = (custom.colors.length ? custom.colors : DEFAULT_CUSTOM.colors).slice(0, CUSTOM_MAX_COLORS);
  const accent = ensureVivid(colors[0] || DEFAULT_CUSTOM.colors[0]);
  const second = ensureVivid(colors[1] || accent);
  const third = ensureVivid(colors[2] || second);
  const intensity = clamp(custom.intensity ?? 1, 0.3, 1.4);
  const angle = ((custom.angle ?? 135) % 360 + 360) % 360;

  // Bases neutras escuras, levemente tingidas pelo acento (no máximo 10%).
  const bg = mix("#08090C", accent, 0.05);
  const bgSoft = mix("#0D0F13", accent, 0.06);
  const sidebar = mix("#0A0B0F", accent, 0.05);
  const card = mix("#12141A", accent, 0.07);
  const cardSoft = mix("#181B22", accent, 0.08);
  const elevated = mix("#1E222A", accent, 0.09);
  const muted = mix("#1D212A", accent, 0.08);

  // Posições do gradiente derivadas do ângulo escolhido.
  const rad = (angle * Math.PI) / 180;
  const px = Math.round(50 + Math.cos(rad) * 45);
  const py = Math.round(50 + Math.sin(rad) * 45);

  return {
    "--background": bg,
    "--background-soft": bgSoft,
    "--sidebar": sidebar,
    "--card": card,
    "--card-foreground": "#E9ECF2",
    "--card-soft": cardSoft,
    "--elevated": elevated,
    "--popover": cardSoft,
    "--popover-foreground": "#E9ECF2",
    "--foreground": "#E9ECF2",
    "--border": rgba(accent, 0.12),
    "--border-strong": rgba(accent, 0.24),
    "--muted": muted,
    "--muted-foreground": "#9AA1AF",
    "--faint": "#78808E",
    "--accent": accent,
    "--accent-strong": mix(accent, "#000000", 0.18),
    "--accent-soft": rgba(accent, 0.16),
    "--accent-foreground": readableOn(accent),
    "--ring": accent,
    "--selection": rgba(accent, 0.3),
    "--glow": rgba(accent, 0.34),
    "--ambient-1": rgba(accent, 0.18),
    "--ambient-2": rgba(second, 0.12),
    "--ambient-3": rgba(third, 0.1),
    "--ambient-intensity": String(intensity),
    "--ambient-x": `${px}%`,
    "--ambient-y": `${py}%`,
    "--chart-1": accent,
    "--chart-2": second,
    "--chart-3": third,
    "--chart-4": colors[3] ? ensureVivid(colors[3]) : mix(accent, "#FFFFFF", 0.35),
    "--chart-5": colors[4] ? ensureVivid(colors[4]) : mix(second, "#FFFFFF", 0.35),
    "--positive": "#4ADE80",
    "--negative": "#F87171",
    "--warning": "#FBBF24",
  };
}

/** Chaves aplicadas inline — usado para limpar ao sair do tema personalizado. */
export const CUSTOM_VAR_KEYS = Object.keys(buildCustomTheme(DEFAULT_CUSTOM));
