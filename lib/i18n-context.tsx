"use client";

import { createContext, useContext, useEffect, useState } from "react";
import en from "@/messages/en.json";
import nl from "@/messages/nl.json";

export type Locale = "en" | "nl";

type Messages = typeof en;
const MESSAGES: Record<Locale, Messages> = { en, nl };

function resolve(obj: unknown, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    str
  );
}

type I18nCtx = {
  t: (key: string, params?: Record<string, string | number>) => string;
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const I18nContext = createContext<I18nCtx>({
  t: (key) => key,
  locale: "nl",
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("nl");

  useEffect(() => {
    const stored = localStorage.getItem("tulipday_locale") as Locale | null;
    if (stored === "en" || stored === "nl") setLocaleState(stored);

    // Keep locale in sync when other tabs / components change it
    function onStorage(e: StorageEvent) {
      if (e.key === "tulipday_locale" && (e.newValue === "en" || e.newValue === "nl")) {
        setLocaleState(e.newValue as Locale);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("tulipday_locale", l);
  }

  function t(key: string, params?: Record<string, string | number>): string {
    const raw = resolve(MESSAGES[locale], key);
    return interpolate(raw, params);
  }

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  return useContext(I18nContext);
}
