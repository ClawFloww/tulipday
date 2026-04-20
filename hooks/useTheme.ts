"use client";

// useTheme — beheert licht/donker/systeem thema
// Slaat voorkeur op in localStorage en past .dark klasse op <html> aan

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "tulipday_theme";

/** Bepaal het effectieve (resolved) thema op basis van voorkeur + systeeminstelling */
function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "light") return "light";
  if (theme === "dark")  return "dark";
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

/** Pas de .dark en .light klassen direct toe op <html> */
function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark",  resolved === "dark");
  document.documentElement.classList.toggle("light", resolved === "light");
}

export interface UseThemeResult {
  theme:         Theme;
  setTheme:      (t: Theme) => void;
  resolvedTheme: "light" | "dark";
  isSystem:      boolean;
}

export function useTheme(): UseThemeResult {
  const [theme, setThemeState] = useState<Theme>("system");

  // Lees opgeslagen voorkeur bij mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored && ["light", "dark", "system"].includes(stored)) {
        setThemeState(stored);
        applyTheme(stored);
      }
    } catch { /* geen localStorage beschikbaar */ }
  }, []);

  // Luister naar systeemwijzigingen als 'system' actief is
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try { localStorage.setItem(STORAGE_KEY, newTheme); } catch {}
    applyTheme(newTheme);
  }, []);

  return {
    theme,
    setTheme,
    resolvedTheme: resolveTheme(theme),
    isSystem:      theme === "system",
  };
}
