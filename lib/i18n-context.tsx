"use client";

import { createContext, useContext, useEffect, useState } from "react";
import en from "@/messages/en.json";
import nl from "@/messages/nl.json";
import de from "@/messages/de.json";
import fr from "@/messages/fr.json";
import zh from "@/messages/zh.json";
import es from "@/messages/es.json";

export type Locale = "en" | "nl" | "de" | "fr" | "zh" | "es";

const VALID_LOCALES: Locale[] = ["en", "nl", "de", "fr", "zh", "es"];

type Messages = typeof en;
const MESSAGES: Record<Locale, Messages> = { en, nl, de: de as Messages, fr: fr as Messages, zh: zh as Messages, es: es as Messages };

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
    if (stored && VALID_LOCALES.includes(stored)) setLocaleState(stored);

    function onStorage(e: StorageEvent) {
      if (e.key === "tulipday_locale" && e.newValue && VALID_LOCALES.includes(e.newValue as Locale)) {
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
