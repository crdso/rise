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
  /** cores do mini-preview: [fundo, sidebar, card, acento] */
  preview: [string, string, string, string];
};

export const THEMES: Record<PresetThemeId, ThemeMeta> = {
  onyx: {
    label: "Onyx",
    desc: "Grafite quase preto",
    preview: ["#08090B", "#0A0C0F", "#101317", "#D3D9E2"],
  },
  blurple: {
    label: "Midnight Blurple",
    desc: "Navy profundo + blurple",
    preview: ["#080913", "#0A0C18", "#121424", "#5865F2"],
  },
  ocean: {
    label: "Deep Ocean",
    desc: "Navy + ciano profundo",
    preview: ["#041016", "#05141C", "#0A2130", "#22B8CF"],
  },
  forest: {
    label: "Forest",
    desc: "Verde floresta profundo",
    preview: ["#060B08", "#070F0A", "#0E1A13", "#3DA35D"],
  },
  emerald: {
    label: "Emerald Night",
    desc: "Preto-esverdeado + esmeralda",
    preview: ["#030A07", "#040E09", "#0A1B13", "#10B981"],
  },
  amethyst: {
    label: "Amethyst",
    desc: "Charcoal + roxo sofisticado",
    preview: ["#0A090F", "#0C0A13", "#16141F", "#8B5CF6"],
  },
  crimson: {
    label: "Crimson Dusk",
    desc: "Vinho + vermelho discreto",
    preview: ["#0C0709", "#0E080B", "#1A0F13", "#E5484D"],
  },
  chroma: {
    label: "Chroma Night",
    desc: "Neutro + ambiente multicolor",
    preview: ["#090A0E", "#0B0C11", "#14161C", "#7C8CF8"],
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
  /** 2 a 5 cores distribuídas automaticamente nos stops do gradiente. */
  colors: string[];
  /** Direção do gradiente, em graus. */
  angle: number;
  /** Influência das cores nas surfaces escuras, de 0 a 100. */
  intensity: number;
  /** Preset de origem; alterações manuais limpam esse vínculo. */
  presetId: string | null;
};

export const DEFAULT_CUSTOM: CustomTheme = {
  colors: ["#2C3FE7", "#261D83"],
  angle: 48,
  intensity: 80,
  presetId: "deep-blurple",
};

export const CUSTOM_MIN_COLORS = 2;
export const CUSTOM_MAX_COLORS = 5;

export type CustomGradientPreset = {
  id: string;
  label: string;
  colors: string[];
  angle: number;
  intensity: number;
};

export const CUSTOM_GRADIENT_PRESETS: CustomGradientPreset[] = [
  { id: "midnight-indigo", label: "Midnight Indigo", colors: ["#5348CA", "#140730"], angle: 48, intensity: 80 },
  { id: "crimson-night", label: "Crimson Night", colors: ["#950909", "#000000"], angle: 65, intensity: 84 },
  { id: "deep-blurple", label: "Deep Blurple", colors: ["#2C3FE7", "#261D83"], angle: 48, intensity: 80 },
  { id: "deep-ocean", label: "Deep Ocean", colors: ["#003E52", "#001019"], angle: 42, intensity: 76 },
  { id: "emerald-night", label: "Emerald Night", colors: ["#065F46", "#020B09"], angle: 54, intensity: 78 },
  { id: "amethyst", label: "Amethyst", colors: ["#5B21B6", "#16072D"], angle: 52, intensity: 82 },
  { id: "cyan-abyss", label: "Cyan Abyss", colors: ["#007C87", "#00141D"], angle: 45, intensity: 80 },
  { id: "onyx", label: "Onyx", colors: ["#18181B", "#050505"], angle: 135, intensity: 45 },
  { id: "chroma-night", label: "Chroma Night", colors: ["#140730", "#2C3FE7", "#007C87"], angle: 48, intensity: 74 },
];

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

export function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`;
}

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Converte temas antigos (intensidade 0.3–1.4) para a escala atual de 0–100. */
export function normalizeCustomTheme(value: Partial<CustomTheme> | null | undefined): CustomTheme {
  const requestedColors = Array.isArray(value?.colors) ? value.colors.filter(isHex).slice(0, CUSTOM_MAX_COLORS) : [];
  const colors = requestedColors.length >= CUSTOM_MIN_COLORS ? requestedColors : DEFAULT_CUSTOM.colors;
  const rawIntensity = Number(value?.intensity);
  const intensity = Number.isFinite(rawIntensity)
    ? rawIntensity <= 2
      ? Math.round(clamp((rawIntensity - 0.3) / 1.1, 0, 1) * 100)
      : Math.round(clamp(rawIntensity, 0, 100))
    : DEFAULT_CUSTOM.intensity;
  const rawAngle = Number(value?.angle);
  const angle = Number.isFinite(rawAngle) ? clamp(Math.round(rawAngle), 0, 360) : DEFAULT_CUSTOM.angle;
  const presetId = typeof value?.presetId === "string" && CUSTOM_GRADIENT_PRESETS.some((preset) => preset.id === value.presetId)
    ? value.presetId
    : null;
  return { colors, angle, intensity, presetId };
}

export function ambientIntensityForCustom(custom: CustomTheme): number {
  return 0.3 + (normalizeCustomTheme(custom).intensity / 100) * 1.1;
}

/** Luminância relativa (WCAG) — usada para decidir texto sobre o acento. */
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relação de contraste WCAG entre duas cores opacas. */
export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Texto legível sobre o acento: escolhe a opção com maior contraste WCAG. */
export function readableOn(hex: string) {
  const white = "#FFFFFF";
  const dark = "#0A0B0D";
  return contrastRatio(white, hex) >= contrastRatio(dark, hex) ? white : dark;
}

/**
 * Constrói os tokens CSS do tema personalizado.
 *
 * A luminosidade da base é FIXA e escura. As cores do usuário entram apenas
 * como matiz (tint sutil nas surfaces) e como acento/ambiente. Por isso é
 * impossível o tema personalizado virar claro, independente do que for escolhido.
 */
export function buildCustomTheme(custom: CustomTheme): Record<string, string> {
  // Precisa ser autocontida: o layout serializa esta mesma função no <head>
  // para gerar exatamente os mesmos tokens antes da hidratação.
  const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const toRgb = (hex: string) => {
    let value = hex.replace("#", "").trim();
    if (value.length === 3) value = value.split("").map((part) => part + part).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return [88, 101, 242] as const;
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)] as const;
  };
  const toHex = (red: number, green: number, blue: number) => {
    const part = (value: number) => clampValue(Math.round(value), 0, 255).toString(16).padStart(2, "0");
    return `#${part(red)}${part(green)}${part(blue)}`;
  };
  const mixValue = (first: string, second: string, amount: number) => {
    const [r1, g1, b1] = toRgb(first);
    const [r2, g2, b2] = toRgb(second);
    const ratio = clampValue(amount, 0, 1);
    return toHex(r1 + (r2 - r1) * ratio, g1 + (g2 - g1) * ratio, b1 + (b2 - b1) * ratio);
  };
  const rgbaValue = (hex: string, alpha: number) => {
    const [red, green, blue] = toRgb(hex);
    return `rgba(${red},${green},${blue},${clampValue(alpha, 0, 1)})`;
  };
  const luminanceValue = (hex: string) => {
    const [red, green, blue] = toRgb(hex).map((component) => {
      const value = component / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const ensureVividValue = (hex: string) => luminanceValue(hex) < 0.06 ? mixValue(hex, "#FFFFFF", 0.42) : hex;
  const readableValue = (hex: string) => {
    const contrast = (first: string, second: string) => {
      const [light, dark] = [luminanceValue(first), luminanceValue(second)].sort((a, b) => b - a);
      return (light + 0.05) / (dark + 0.05);
    };
    return contrast("#FFFFFF", hex) >= contrast("#0A0B0D", hex) ? "#FFFFFF" : "#0A0B0D";
  };
  const value = (custom && typeof custom === "object" ? custom : {}) as Partial<CustomTheme>;
  const requestedColors = Array.isArray(value.colors)
    ? value.colors.filter((color): color is string => typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)).slice(0, 5)
    : [];
  const colors = requestedColors.length >= 2 ? requestedColors : ["#2C3FE7", "#261D83"];
  const rawIntensity = Number(value.intensity);
  const intensity = Number.isFinite(rawIntensity)
    ? rawIntensity <= 2
      ? Math.round(clampValue((rawIntensity - 0.3) / 1.1, 0, 1) * 100)
      : Math.round(clampValue(rawIntensity, 0, 100))
    : 80;
  const rawAngle = Number(value.angle);
  const angle = Number.isFinite(rawAngle) ? clampValue(Math.round(rawAngle), 0, 360) : 48;
  const accent = ensureVividValue(colors[0]);
  const second = ensureVividValue(colors[1] || accent);
  const third = ensureVividValue(colors[2] || second);
  const influence = intensity / 100;
  const gradientStops = colors.map((color, index) => `${color} ${Math.round((index / (colors.length - 1)) * 100)}%`).join(", ");
  const gradient = `linear-gradient(${angle}deg, ${gradientStops})`;
  const surfaceTint = 0.015 + influence * 0.115;
  const backgroundTint = 0.01 + influence * 0.075;
  const gradientAlpha = 0.04 + influence * 0.26;

  // Bases continuam escuras; o gradiente só as tinge, sem reduzir contraste.
  const bg = mixValue("#08090C", accent, backgroundTint);
  const bgSoft = mixValue("#0D0F13", second, backgroundTint);
  const sidebar = mixValue("#0A0B0F", second, surfaceTint * 0.85);
  const card = mixValue("#12141A", accent, surfaceTint);
  const cardSoft = mixValue("#181B22", second, surfaceTint * 1.1);
  const elevated = mixValue("#1E222A", third, surfaceTint * 1.2);
  const muted = mixValue("#1D212A", accent, surfaceTint);

  // Posições do gradiente derivadas do ângulo escolhido.
  const rad = (angle * Math.PI) / 180;
  const px = Math.round(50 + Math.cos(rad) * 45);
  const py = Math.round(50 + Math.sin(rad) * 45);

  return {
    "--theme-color-1": colors[0],
    "--theme-color-2": colors[1],
    "--theme-color-3": colors[2] || colors[1],
    "--theme-color-4": colors[3] || colors[2] || colors[1],
    "--theme-color-5": colors[4] || colors[3] || colors[2] || colors[1],
    "--theme-gradient-angle": `${angle}deg`,
    "--theme-gradient": gradient,
    "--theme-intensity": `${intensity}%`,
    "--theme-background-gradient": `linear-gradient(${angle}deg, ${rgbaValue(colors[0], gradientAlpha)}, ${colors.slice(1).map((color) => rgbaValue(color, gradientAlpha * 0.78)).join(", ")})`,
    "--theme-sidebar-gradient": `linear-gradient(${(angle + 22) % 360}deg, ${rgbaValue(second, gradientAlpha * 0.44)}, ${rgbaValue(accent, gradientAlpha * 0.2)})`,
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
    "--border": rgbaValue(accent, 0.12),
    "--border-strong": rgbaValue(accent, 0.24),
    "--muted": muted,
    "--muted-foreground": "#9AA1AF",
    "--faint": "#78808E",
    "--accent": accent,
    "--accent-strong": mixValue(accent, "#000000", 0.18),
    "--accent-soft": rgbaValue(accent, 0.16),
    "--accent-foreground": readableValue(accent),
    "--ring": accent,
    "--selection": rgbaValue(accent, 0.3),
    "--glow": rgbaValue(accent, 0.34),
    "--ambient-1": rgbaValue(accent, 0.05 + influence * 0.16),
    "--ambient-2": rgbaValue(second, 0.04 + influence * 0.12),
    "--ambient-3": rgbaValue(third, 0.03 + influence * 0.1),
    "--ambient-x": `${px}%`,
    "--ambient-y": `${py}%`,
    "--chart-1": accent,
    "--chart-2": second,
    "--chart-3": third,
    "--chart-4": colors[3] ? ensureVividValue(colors[3]) : mixValue(accent, "#FFFFFF", 0.35),
    "--chart-5": colors[4] ? ensureVividValue(colors[4]) : mixValue(second, "#FFFFFF", 0.35),
    "--positive": "#4ADE80",
    "--negative": "#F87171",
    "--warning": "#FBBF24",
  };
}

/** Chaves aplicadas inline — usado para limpar ao sair do tema personalizado. */
export const CUSTOM_VAR_KEYS = Object.keys(buildCustomTheme(DEFAULT_CUSTOM));
