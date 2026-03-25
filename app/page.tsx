"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n-context";

export default function SplashPage() {
  const router = useRouter();
  const { t, setLocale } = useT();

  function handleLanguage(locale: "en" | "nl") {
    setLocale(locale);
    router.push("/onboarding");
  }

  return (
    <div className="relative min-h-screen bg-warm flex flex-col items-center justify-center overflow-hidden px-6">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-tulip-100 rounded-full opacity-60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-32 w-[28rem] h-[28rem] bg-petal/30 rounded-full opacity-50 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-48 h-48 bg-leaf/40 rounded-full opacity-70 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        <div className="mb-3 select-none">
          <span className="text-[88px] leading-none drop-shadow-sm">🌷</span>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-tulip-500 mb-2">TulipDay</h1>

        <p className="text-sm text-tulip-400 font-semibold tracking-widest uppercase mb-10">
          {t("splash.tagline")}
        </p>

        <div className="w-10 h-0.5 bg-tulip-200 rounded-full mb-10" />

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => handleLanguage("en")}
            className="w-full py-4 rounded-xl bg-tulip-500 text-white font-bold text-lg
                       shadow-lg shadow-tulip-200 hover:bg-tulip-600 active:scale-[0.98] transition-all duration-200"
          >
            <span className="mr-2">🇬🇧</span>English
          </button>

          <button
            onClick={() => handleLanguage("nl")}
            className="w-full py-4 rounded-xl bg-white text-tulip-500 font-bold text-lg
                       border-2 border-tulip-200 shadow-sm hover:border-tulip-400 hover:bg-tulip-50
                       active:scale-[0.98] transition-all duration-200"
          >
            <span className="mr-2">🇳🇱</span>Nederlands
          </button>
        </div>

        <p className="mt-10 text-xs text-tulip-200 font-medium tracking-wide">
          {t("splash.footer")}
        </p>
      </div>
    </div>
  );
}
