"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ThemeId, DEFAULT_THEME, THEMES } from "@/lib/themes";

type Ctx = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  themes: typeof THEMES;
};

const ThemeCtx = createContext<Ctx | null>(null);
const STORAGE = "rise_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE) as ThemeId) || null;
    const initial = saved && THEMES[saved] ? saved : DEFAULT_THEME;
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(STORAGE, t);
      // persist to DB if authenticated (fire and forget)
      fetch("/api/settings/theme", { method: "POST", body: JSON.stringify({ theme: t }), headers: { "Content-Type": "application/json" } }).catch(() => {});
    } catch {}
  };

  // avoid flash - apply transition after mount
  useEffect(() => {
    if (mounted) document.documentElement.style.transition = "background-color .4s ease, color .4s ease";
  }, [mounted]);

  return <ThemeCtx.Provider value={{ theme, setTheme, themes: THEMES }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme must be inside ThemeProvider");
  return c;
}
