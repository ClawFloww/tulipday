"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flower2, Camera, Navigation, Users, UtensilsCrossed, Waves,
  Car, Bike, Footprints, Clock, CloudSun, Sun, ChevronLeft,
} from "lucide-react";
import { useT } from "@/lib/i18n-context";

const ICON_SIZE = 26;

type OptionId = string;
type StepKey  = "intent" | "transport" | "time";

const STEP_ICONS: Record<string, React.ReactNode> = {
  blooming_fields: <Flower2        size={ICON_SIZE} />,
  photo_spots:     <Camera         size={ICON_SIZE} />,
  quiet_route:     <Navigation     size={ICON_SIZE} />,
  family_trip:     <Users          size={ICON_SIZE} />,
  flowers_lunch:   <UtensilsCrossed size={ICON_SIZE} />,
  flowers_beach:   <Waves          size={ICON_SIZE} />,
  car:             <Car            size={ICON_SIZE} />,
  bike:            <Bike           size={ICON_SIZE} />,
  walking:         <Footprints     size={ICON_SIZE} />,
  short:           <Clock          size={ICON_SIZE} />,
  half_day:        <CloudSun       size={ICON_SIZE} />,
  full_day:        <Sun            size={ICON_SIZE} />,
};

const STEP_KEYS: { key: StepKey; options: OptionId[] }[] = [
  { key: "intent",    options: ["blooming_fields", "photo_spots", "quiet_route", "family_trip", "flowers_lunch", "flowers_beach"] },
  { key: "transport", options: ["car", "bike", "walking"] },
  { key: "time",      options: ["short", "half_day", "full_day"] },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { t }  = useT();

  const [step, setStep]         = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [animating, setAnimating] = useState(false);

  const current  = STEP_KEYS[step];
  const progress = ((step + 1) / STEP_KEYS.length) * 100;
  const isGrid   = current.options.length === 6;

  function handleSelect(optionId: string) {
    if (animating) return;
    const updated = { ...selected, [current.key]: optionId };
    setSelected(updated);
    setAnimating(true);
    setTimeout(() => {
      if (step < STEP_KEYS.length - 1) {
        setStep((s) => s + 1);
        setAnimating(false);
      } else {
        localStorage.setItem("tulipday_onboarding", JSON.stringify(updated));
        router.push("/home");
      }
    }, 320);
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
    else router.push("/");
  }

  return (
    <div className="relative min-h-screen bg-warm flex flex-col overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-tulip-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-80 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-leaf/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-tulip-400 hover:text-tulip-600 transition-colors text-sm font-semibold"
          >
            <ChevronLeft size={18} />
            {step === 0 ? t("common.back") : t("common.previous")}
          </button>
          <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">
            {t("onboarding.step_of", { n: step + 1, total: STEP_KEYS.length })}
          </span>
        </div>

        <div className="w-full h-1.5 bg-tulip-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-tulip-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="relative z-10 px-5 mb-8">
        <h2 className="text-2xl font-extrabold text-[#1A1A1A] leading-snug">
          {t(`onboarding.${current.key}.question`)}
        </h2>
      </div>

      {/* Options */}
      <div className="relative z-10 flex-1 px-5 pb-10">
        <div className={isGrid ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
          {current.options.map((optionId) => {
            const isActive = selected[current.key] === optionId;
            const hasSub   = !!t(`onboarding.${current.key}.${optionId}_sub`).startsWith("onboarding") === false;

            return (
              <button
                key={optionId}
                onClick={() => handleSelect(optionId)}
                className={`
                  relative flex items-center gap-4 px-5 py-4 rounded-2xl border-2
                  text-left transition-all duration-200 active:scale-[0.97]
                  ${isGrid ? "flex-col items-start gap-2 px-4 py-5" : ""}
                  ${isActive
                    ? "border-tulip-500 bg-tulip-50 shadow-md shadow-tulip-100"
                    : "border-gray-200 bg-white hover:border-tulip-300 hover:bg-tulip-50/50"
                  }
                `}
              >
                <div className={`flex-shrink-0 rounded-xl p-2.5 transition-colors duration-200
                  ${isActive ? "bg-tulip-500 text-white" : "bg-tulip-50 text-tulip-500"}`}>
                  {STEP_ICONS[optionId]}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm leading-tight ${isActive ? "text-tulip-700" : "text-[#1A1A1A]"}`}>
                    {t(`onboarding.${current.key}.${optionId}`)}
                  </p>
                  {hasSub && !isGrid && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {t(`onboarding.${current.key}.${optionId}_sub`)}
                    </p>
                  )}
                </div>

                {isActive && !isGrid && (
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-tulip-500 flex items-center justify-center">
                    <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                {isActive && isGrid && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-tulip-500 flex items-center justify-center">
                    <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 pb-8 flex justify-center">
        <span className="text-2xl opacity-20 select-none">🌷</span>
      </div>
    </div>
  );
}
