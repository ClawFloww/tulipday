"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useT } from "@/lib/i18n-context";
import type { Locale } from "@/lib/i18n-context";

const LANGUAGES: { locale: Locale; flag: string; label: string; primary: boolean }[] = [
  { locale: "nl", flag: "🇳🇱", label: "Nederlands",  primary: true  },
  { locale: "en", flag: "🇬🇧", label: "English",     primary: false },
  { locale: "de", flag: "🇩🇪", label: "Deutsch",     primary: false },
  { locale: "fr", flag: "🇫🇷", label: "Français",    primary: false },
  { locale: "es", flag: "🇪🇸", label: "Español",     primary: false },
  { locale: "zh", flag: "🇨🇳", label: "中文",        primary: false },
];

export default function SplashPage() {
  const router = useRouter();
  const { t, setLocale } = useT();

  function handleLanguage(locale: Locale) {
    setLocale(locale);
    router.push(`/${locale}/onboarding`);
  }

  return (
    <div className="relative min-h-screen bg-warm flex flex-col items-center justify-center overflow-hidden px-6">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-tulip-100 rounded-full opacity-60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-32 w-[28rem] h-[28rem] bg-petal/30 rounded-full opacity-50 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-48 h-48 bg-leaf/40 rounded-full opacity-70 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        <div className="mb-6 select-none">
          <Image src="/logo.png" alt="TulipDay" width={360} height={240} className="object-contain drop-shadow-sm" priority />
        </div>

        <p className="text-sm text-tulip-400 font-semibold tracking-widest uppercase mb-8">
          {t("splash.tagline")}
        </p>

        <div className="w-10 h-0.5 bg-tulip-200 rounded-full mb-8" />

        <div className="flex flex-col gap-2.5 w-full">
          {LANGUAGES.map(({ locale, flag, label, primary }) => (
            <button
              key={locale}
              onClick={() => handleLanguage(locale)}
              className={`w-full py-3.5 rounded-xl font-bold text-base transition-all duration-200 active:scale-[0.98]
                ${primary
                  ? "bg-tulip-500 text-white shadow-lg shadow-tulip-200 hover:bg-tulip-600"
                  : "bg-white text-tulip-500 border-2 border-tulip-200 shadow-sm hover:border-tulip-400 hover:bg-tulip-50"
                }`}
            >
              <span className="mr-2">{flag}</span>{label}
            </button>
          ))}
        </div>

        <p className="mt-8 text-xs text-tulip-200 font-medium tracking-wide">
          {t("splash.footer")}
        </p>
      </div>
    </div>
  );
}
