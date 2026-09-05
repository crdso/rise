"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { settingsService } from "@/lib/services/settingsService";
import { useDashboardStore, type WidgetId } from "@/lib/store/dashboardStore";
import {
  THEMES,
  THEME_ORDER,
  DEFAULT_THEME,
  DEFAULT_CUSTOM,
  buildCustomTheme,
  isPresetTheme,
  CUSTOM_VAR_KEYS,
  type ThemeId,
  type CustomTheme,
} from "@/lib/themes";

export type Density = "comfortable" | "compact";

type Ctx = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  themes: typeof THEMES;
  order: typeof THEME_ORDER;
  custom: CustomTheme;
  setCustom: (c: CustomTheme) => void;
  resetCustom: () => void;
  /** Preview temporário: aplica sem persistir. Passar null cancela. */
  previewCustom: (c: CustomTheme | null) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  density: Density;
  setDensity: (d: Density) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

const K_THEME = "rise_theme";
const K_CUSTOM = "rise_custom_theme";
const K_MOTION = "rise_reduced_motion";
const K_DENSITY = "rise_density";

/** Salva no servidor no máximo uma vez por segundo — o slider dispara muito. */
function makeDebouncer(ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (fn: () => void) => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}
const debounceSave = makeDebouncer(800);

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [custom, setCustomState] = useState<CustomTheme>(DEFAULT_CUSTOM);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [density, setDensityState] = useState<Density>("comfortable");
  const previewRef = useRef<CustomTheme | null>(null);

  /** Escreve as variáveis do tema personalizado direto no <html>. */
  const applyCustomVars = useCallback((c: CustomTheme | null) => {
    const root = document.documentElement;
    if (!c) {
      for (const k of CUSTOM_VAR_KEYS) root.style.removeProperty(k);
      return;
    }
    const vars = buildCustomTheme(c);
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  }, []);

  /** A intensidade do ambiente vale para TODOS os temas, não só o personalizado. */
  const applyAmbient = useCallback((intensity: number) => {
    document.documentElement.style.setProperty("--ambient-intensity", String(intensity));
  }, []);

  // hidratação inicial
  useEffect(() => {
    const savedTheme = localStorage.getItem(K_THEME);
    const initial: ThemeId = savedTheme === "custom" || isPresetTheme(savedTheme) ? (savedTheme as ThemeId) : DEFAULT_THEME;
    const savedCustom = readJSON<CustomTheme>(K_CUSTOM, DEFAULT_CUSTOM);
    const savedMotion = localStorage.getItem(K_MOTION) === "1";
    const savedDensity = (localStorage.getItem(K_DENSITY) as Density) || "comfortable";

    setThemeState(initial);
    setCustomState(savedCustom);
    setReducedMotionState(savedMotion);
    setDensityState(savedDensity);

    const root = document.documentElement;
    root.setAttribute("data-theme", initial);
    root.setAttribute("data-density", savedDensity);
    if (savedMotion) root.setAttribute("data-motion", "reduced");
    if (initial === "custom") applyCustomVars(savedCustom);
    applyAmbient(savedCustom.intensity);

    // Em modo Supabase o servidor é a fonte da verdade; o localStorage acima
    // só evitou o flash. Se houver preferência salva, ela sobrescreve.
    let cancelled = false;
    settingsService.load().then((remote) => {
      if (cancelled || !remote) return;
      const root = document.documentElement;

      let resolvedTheme = initial;
      if (remote.theme && (remote.theme === "custom" || isPresetTheme(remote.theme))) {
        const t = remote.theme as ThemeId;
        resolvedTheme = t;
        setThemeState(t);
        root.setAttribute("data-theme", t);
        try { localStorage.setItem(K_THEME, t); } catch {}
      }
      const nextCustom: CustomTheme = {
        ...savedCustom,
        ...(remote.custom_theme ?? {}),
        intensity: remote.ambient_intensity ?? remote.custom_theme?.intensity ?? savedCustom.intensity,
      };
      setCustomState(nextCustom);
      applyAmbient(nextCustom.intensity);
      if (resolvedTheme === "custom") applyCustomVars(nextCustom);
      else applyCustomVars(null);
      try { localStorage.setItem(K_CUSTOM, JSON.stringify(nextCustom)); } catch {}

      if (typeof remote.reduced_motion === "boolean") {
        setReducedMotionState(remote.reduced_motion);
        if (remote.reduced_motion) root.setAttribute("data-motion", "reduced");
        else root.removeAttribute("data-motion");
        try { localStorage.setItem(K_MOTION, remote.reduced_motion ? "1" : "0"); } catch {}
      }
      if (remote.density) {
        setDensityState(remote.density);
        root.setAttribute("data-density", remote.density);
        try { localStorage.setItem(K_DENSITY, remote.density); } catch {}
      }
      if (remote.dashboard?.order) {
        const d = useDashboardStore.getState();
        d.setOrder(remote.dashboard.order as WidgetId[]);
        for (const id of (remote.dashboard.hidden || []) as WidgetId[]) {
          if (!d.hidden.includes(id)) d.toggleHidden(id);
        }
      }
    });
    return () => { cancelled = true; };
  }, [applyCustomVars, applyAmbient]);

  const setTheme = useCallback(
    (t: ThemeId) => {
      previewRef.current = null;
      setThemeState(t);
      document.documentElement.setAttribute("data-theme", t);
      if (t === "custom") applyCustomVars(custom);
      else applyCustomVars(null);
      try {
        localStorage.setItem(K_THEME, t);
      } catch {}
      void settingsService.save({ theme: t });
    },
    [custom, applyCustomVars]
  );

  const setCustom = useCallback(
    (c: CustomTheme) => {
      previewRef.current = null;
      setCustomState(c);
      applyAmbient(c.intensity);
      if (theme === "custom") applyCustomVars(c);
      try {
        localStorage.setItem(K_CUSTOM, JSON.stringify(c));
      } catch {}
      debounceSave(() => {
        void settingsService.save({ custom_theme: { colors: c.colors, angle: c.angle, intensity: c.intensity }, ambient_intensity: c.intensity });
      });
    },
    [theme, applyCustomVars, applyAmbient]
  );

  const resetCustom = useCallback(() => setCustom(DEFAULT_CUSTOM), [setCustom]);

  const previewCustom = useCallback(
    (c: CustomTheme | null) => {
      previewRef.current = c;
      if (c) {
        applyCustomVars(c);
        applyAmbient(c.intensity);
      } else {
        applyCustomVars(theme === "custom" ? custom : null);
        applyAmbient(custom.intensity);
      }
    },
    [theme, custom, applyCustomVars, applyAmbient]
  );

  const setReducedMotion = useCallback((v: boolean) => {
    setReducedMotionState(v);
    const root = document.documentElement;
    if (v) root.setAttribute("data-motion", "reduced");
    else root.removeAttribute("data-motion");
    try {
      localStorage.setItem(K_MOTION, v ? "1" : "0");
    } catch {}
    void settingsService.save({ reduced_motion: v });
  }, []);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    document.documentElement.setAttribute("data-density", d);
    try {
      localStorage.setItem(K_DENSITY, d);
    } catch {}
    void settingsService.save({ density: d });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      setTheme,
      themes: THEMES,
      order: THEME_ORDER,
      custom,
      setCustom,
      resetCustom,
      previewCustom,
      reducedMotion,
      setReducedMotion,
      density,
      setDensity,
    }),
    [theme, setTheme, custom, setCustom, resetCustom, previewCustom, reducedMotion, setReducedMotion, density, setDensity]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme deve ser usado dentro do ThemeProvider");
  return c;
}

/** Hook utilitário: true quando o usuário pediu menos movimento (config ou SO). */
export function usePrefersReducedMotion() {
  const { reducedMotion } = useTheme();
  const [system, setSystem] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setSystem(mq.matches);
    const on = () => setSystem(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reducedMotion || system;
}
