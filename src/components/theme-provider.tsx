"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { settingsService } from "@/lib/services/settingsService";
import { useDashboardStore, type WidgetId } from "@/lib/store/dashboardStore";
import {
  THEMES,
  THEME_ORDER,
  DEFAULT_THEME,
  DEFAULT_CUSTOM,
  ambientIntensityForCustom,
  buildCustomTheme,
  isPresetTheme,
  needsCustomThemeUpgrade,
  normalizeCustomTheme,
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
  flushCustom: () => void;
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
  let pending: ((keepalive: boolean) => void) | null = null;
  const run = (keepalive = false) => {
    if (t) clearTimeout(t);
    t = null;
    const fn = pending;
    pending = null;
    fn?.(keepalive);
  };
  return {
    schedule(fn: (keepalive: boolean) => void) {
      pending = fn;
      if (t) clearTimeout(t);
      t = setTimeout(() => run(), ms);
    },
    flush(keepalive = false) {
      run(keepalive);
    },
  };
}

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
  const [customSave] = useState(() => makeDebouncer(800));
  const unsyncedCustomRef = useRef<CustomTheme | null>(null);
  const customRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customRetryCountRef = useRef(0);
  const persistCustomRef = useRef<(custom: CustomTheme, keepalive?: boolean) => Promise<void>>(async () => {});

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

  /** Aplica a opacidade ambiental já normalizada pela escala percentual customizada. */
  const applyAmbient = useCallback((intensity: number) => {
    document.documentElement.style.setProperty("--ambient-intensity", String(intensity));
  }, []);

  const persistCustom = useCallback(async (custom: CustomTheme, keepalive = false) => {
    try {
      await settingsService.save(
        { custom_theme: custom, ambient_intensity: ambientIntensityForCustom(custom) },
        { keepalive }
      );
      if (unsyncedCustomRef.current === custom) {
        unsyncedCustomRef.current = null;
        customRetryCountRef.current = 0;
      }
    } catch {
      unsyncedCustomRef.current = custom;
      if (customRetryCountRef.current++ === 0) {
        customRetryTimerRef.current = setTimeout(() => {
          customRetryTimerRef.current = null;
          const unsynced = unsyncedCustomRef.current;
          if (unsynced) void persistCustomRef.current(unsynced);
        }, 3_000);
      }
      console.warn("[rise-settings] custom theme sync failed; one retry was scheduled.");
    }
  }, []);

  const flushCustom = useCallback(() => customSave.flush(), [customSave]);

  useEffect(() => {
    persistCustomRef.current = persistCustom;
    return () => {
      if (customRetryTimerRef.current) clearTimeout(customRetryTimerRef.current);
    };
  }, [persistCustom]);

  useEffect(() => {
    const flushOnExit = () => customSave.flush(true);
    const retryWhenOnline = () => {
      const unsynced = unsyncedCustomRef.current;
      if (!unsynced) return;
      if (customRetryTimerRef.current) clearTimeout(customRetryTimerRef.current);
      customRetryTimerRef.current = null;
      customRetryCountRef.current = 0;
      void persistCustom(unsynced);
    };
    window.addEventListener("pagehide", flushOnExit);
    window.addEventListener("online", retryWhenOnline);
    return () => {
      window.removeEventListener("pagehide", flushOnExit);
      window.removeEventListener("online", retryWhenOnline);
    };
  }, [customSave, persistCustom]);

  // hidratação inicial
  useEffect(() => {
    const savedTheme = localStorage.getItem(K_THEME);
    const initial: ThemeId = savedTheme === "custom" || isPresetTheme(savedTheme) ? (savedTheme as ThemeId) : DEFAULT_THEME;
    const savedCustom = normalizeCustomTheme(readJSON<CustomTheme>(K_CUSTOM, DEFAULT_CUSTOM));
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
    if (initial === "custom") {
      applyCustomVars(savedCustom);
      applyAmbient(ambientIntensityForCustom(savedCustom));
    }

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
      const remoteCustom = remote.custom_theme ?? savedCustom;
      const nextCustom = normalizeCustomTheme(remoteCustom);
      setCustomState(nextCustom);
      if (resolvedTheme === "custom") {
        applyCustomVars(nextCustom);
        applyAmbient(ambientIntensityForCustom(nextCustom));
      } else {
        applyCustomVars(null);
        root.style.removeProperty("--ambient-intensity");
      }
      try { localStorage.setItem(K_CUSTOM, JSON.stringify(nextCustom)); } catch {}
      if (needsCustomThemeUpgrade(remote.custom_theme)) {
        void settingsService.save({ custom_theme: nextCustom, ambient_intensity: ambientIntensityForCustom(nextCustom) }).catch(() => console.warn("[rise-settings] custom theme upgrade sync failed."));
      }

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
      if (t === "custom") {
        applyCustomVars(custom);
        applyAmbient(ambientIntensityForCustom(custom));
      } else {
        applyCustomVars(null);
        document.documentElement.style.removeProperty("--ambient-intensity");
      }
      try {
        localStorage.setItem(K_THEME, t);
      } catch {}
      void settingsService.save({ theme: t }).catch(() => console.warn("[rise-settings] theme sync failed."));
    },
    [custom, applyCustomVars, applyAmbient]
  );

  const setCustom = useCallback(
    (c: CustomTheme) => {
      const next = normalizeCustomTheme(c);
      previewRef.current = null;
      setCustomState(next);
      applyAmbient(ambientIntensityForCustom(next));
      if (theme === "custom") applyCustomVars(next);
      try {
        localStorage.setItem(K_CUSTOM, JSON.stringify(next));
      } catch {}
      customRetryCountRef.current = 0;
      if (customRetryTimerRef.current) {
        clearTimeout(customRetryTimerRef.current);
        customRetryTimerRef.current = null;
      }
      customSave.schedule((keepalive) => void persistCustom(next, keepalive));
    },
    [theme, applyCustomVars, applyAmbient, customSave, persistCustom]
  );

  const resetCustom = useCallback(() => setCustom(DEFAULT_CUSTOM), [setCustom]);

  const previewCustom = useCallback(
    (c: CustomTheme | null) => {
      previewRef.current = c;
      if (c) {
        applyCustomVars(c);
        applyAmbient(ambientIntensityForCustom(c));
      } else {
        if (theme === "custom") {
          applyCustomVars(custom);
          applyAmbient(ambientIntensityForCustom(custom));
        } else {
          applyCustomVars(null);
          document.documentElement.style.removeProperty("--ambient-intensity");
        }
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
    void settingsService.save({ reduced_motion: v }).catch(() => console.warn("[rise-settings] motion preference sync failed."));
  }, []);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    document.documentElement.setAttribute("data-density", d);
    try {
      localStorage.setItem(K_DENSITY, d);
    } catch {}
    void settingsService.save({ density: d }).catch(() => console.warn("[rise-settings] density sync failed."));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      theme,
      setTheme,
      themes: THEMES,
      order: THEME_ORDER,
      custom,
      setCustom,
      flushCustom,
      resetCustom,
      previewCustom,
      reducedMotion,
      setReducedMotion,
      density,
      setDensity,
    }),
    [theme, setTheme, custom, setCustom, flushCustom, resetCustom, previewCustom, reducedMotion, setReducedMotion, density, setDensity]
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
