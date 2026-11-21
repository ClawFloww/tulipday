"use client";

// Onboarding flow — Scherm 0: Juridisch · Scherm 1: Welkom · daarna PlannerFlow
// PlannerFlow vervangt de oude activiteit/duur/locatie/laad/resultaat-schermen.

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { tap } from "@/lib/haptics";
import { useT } from "@/lib/i18n-context";
import { TERMS_VERSION, TERMS_DATE, getLegalDocs } from "@/constants/legal";
import { PLANNER_PROFILE_KEY } from "@/lib/planner/types";
import PlannerFlow from "@/components/planner/PlannerFlow";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import type { PlannerProfile } from "@/lib/planner/types";

// ── Constanten ────────────────────────────────────────────────────────────────

const STORAGE_KEY      = "tulipday_onboarding";
const PREF_STORAGE_KEY = "tulipday_preferences";

// ── Animaties ─────────────────────────────────────────────────────────────────

const slide = {
  enter:  (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

// ── Geanimeerde checkbox ──────────────────────────────────────────────────────

function LegalCheckbox({ checked, animating }: { checked: boolean; animating: boolean }) {
  return (
    <motion.div
      animate={animating ? { scale: [1, 0.8, 1.1, 1.0] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
      aria-hidden
      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-base
                  ${checked ? "border-primary bg-primary" : "border-line-strong bg-transparent"}`}
    >
      <svg viewBox="0 0 10 8" fill="none" className="w-3.5 h-3.5">
        <motion.path
          d="M1 4l2.5 2.5L9 1"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}

// ── Acceptatierij: echte checkbox voor schermlezers, link opent het document ──

function LegalRow({ checked, animating, onToggle, prefix, link, suffix, onOpenDoc }: {
  checked: boolean; animating: boolean; onToggle: () => void;
  prefix: string; link: string; suffix: string; onOpenDoc: () => void;
}) {
  return (
    <div className="flex items-center gap-4 min-h-[56px] rounded-xl px-3 -mx-3">
      <button type="button" role="checkbox" aria-checked={checked} aria-label={`${prefix}${link}${suffix}`}
              onClick={onToggle}
              className="flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface
                         before:absolute before:content-[''] relative before:-inset-2">
        <LegalCheckbox checked={checked} animating={animating} />
      </button>
      <p className="text-body flex-1 leading-snug text-ink-2" onClick={onToggle}>
        {prefix}
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpenDoc(); }}
                className="font-semibold underline underline-offset-2 text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {link}
        </button>
        {suffix}
      </p>
    </div>
  );
}

// ── Hoofdcomponent ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? "nl";
  const { t }  = useT();

  const [screen,        setScreen]       = useState(0);   // 0 = legal, 1 = welkom
  const [direction,     setDirection]    = useState(1);
  const [plannerActive, setPlannerActive] = useState(false);

  // Legal state
  const [acceptedTerms,      setAcceptedTerms]      = useState(false);
  const [acceptedPrivacy,    setAcceptedPrivacy]    = useState(false);
  const [acceptedEtiquette,  setAcceptedEtiquette]  = useState(false);
  const [termsAnimating,     setTermsAnimating]     = useState(false);
  const [privacyAnimating,   setPrivacyAnimating]   = useState(false);
  const [etiquetteAnimating, setEtiquetteAnimating] = useState(false);
  const [openDoc,            setOpenDoc]            = useState<"terms" | "privacy" | "etiquette" | null>(null);

  // Controleer of onboarding al gedaan is
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.completedAt) router.replace(`/${locale}/home`);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function advanceTo(s: number) {
    setDirection(1);
    setScreen(s);
  }

  function toggleTerms() {
    tap();
    if (!acceptedTerms) { setTermsAnimating(true); setTimeout(() => setTermsAnimating(false), 450); }
    setAcceptedTerms((v) => !v);
  }
  function togglePrivacy() {
    tap();
    if (!acceptedPrivacy) { setPrivacyAnimating(true); setTimeout(() => setPrivacyAnimating(false), 450); }
    setAcceptedPrivacy((v) => !v);
  }
  function toggleEtiquette() {
    tap();
    if (!acceptedEtiquette) { setEtiquetteAnimating(true); setTimeout(() => setEtiquetteAnimating(false), 450); }
    setAcceptedEtiquette((v) => !v);
  }

  function devReset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PREF_STORAGE_KEY);
      localStorage.removeItem(PLANNER_PROFILE_KEY);
    } catch {}
    window.location.reload();
  }

  // Opslaan na voltooien PlannerFlow
  function handlePlannerComplete(profile: PlannerProfile) {
    // Sla plannerprofield op (gebruikt door /plan/results)
    localStorage.setItem(PLANNER_PROFILE_KEY, JSON.stringify(profile));

    // Sla legacy-formaat op zodat home-pagina routesuggesties kan aanpassen
    const transportLegacy =
      profile.transport === "cycling" ? "bike"
      : profile.transport === "car"   ? "car"
      : "walking";
    const timeLegacy =
      profile.time === "2h"   ? "short"
      : profile.time === "half" ? "half_day"
      : "full_day";

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        completedAt: new Date().toISOString(),
        intent:      "blooming_fields",
        transport:   transportLegacy,
        time:        timeLegacy,
      }));
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify({
        transport:       transportLegacy,
        time:            timeLegacy,
        defaultDuration: timeLegacy,
      }));
    } catch {}

    router.push(`/${locale}/home`);
  }

  // PlannerFlow toont zichzelf na het welkomstscherm
  if (plannerActive) {
    return <PlannerFlow onComplete={handlePlannerComplete} />;
  }

  function renderScreen() {
    switch (screen) {

      // ── Scherm 0: Juridische acceptatie ──────────────────────────────────
      case 0: {
        const allAccepted = acceptedTerms && acceptedPrivacy && acceptedEtiquette;
        const { termsContent, privacyContent, etiquetteContent } = getLegalDocs(locale);
        const tl = (k: string) => t(`onboarding.legal.${k}`);

        return (
          <div className="flex flex-col min-h-screen px-6 pt-safe pb-safe bg-surface">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center mt-8 mb-6"
            >
              <Image src="/logo.png" alt="TulipDay" width={210} height={140} className="object-contain" priority />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mb-8"
            >
              <h1 className="text-display text-ink mb-2">{tl("title")}</h1>
              <p className="text-body leading-relaxed text-ink-3">{tl("subtitle")}</p>
            </motion.div>

            {/* Checkboxrijen */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="space-y-2 mb-8"
            >
              <LegalRow checked={acceptedTerms} animating={termsAnimating} onToggle={toggleTerms}
                        prefix={tl("terms_prefix")} link={tl("terms_link")} suffix={tl("terms_suffix")}
                        onOpenDoc={() => setOpenDoc("terms")} />
              <LegalRow checked={acceptedPrivacy} animating={privacyAnimating} onToggle={togglePrivacy}
                        prefix={tl("privacy_prefix")} link={tl("privacy_link")} suffix={tl("privacy_suffix")}
                        onOpenDoc={() => setOpenDoc("privacy")} />
              <LegalRow checked={acceptedEtiquette} animating={etiquetteAnimating} onToggle={toggleEtiquette}
                        prefix={tl("etiquette_prefix")} link={tl("etiquette_link")} suffix={tl("etiquette_suffix")}
                        onOpenDoc={() => setOpenDoc("etiquette")} />
            </motion.div>

            {/* Doorgaan */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-auto space-y-3"
            >
              <Button size="lg" fullWidth disabled={!allAccepted} onClick={() => advanceTo(1)}>
                {tl("continue")}
              </Button>
              <p className="text-center text-caption pb-4 text-ink-3">
                v{TERMS_VERSION} · {TERMS_DATE} · info@tulipday.online
              </p>
            </motion.div>

            {/* Documenten — één sheet, inhoud wisselt mee */}
            <BottomSheet
              open={openDoc !== null}
              onClose={() => setOpenDoc(null)}
              size="full"
              showClose
              title={openDoc ? tl(`${openDoc}_title`) : ""}
            >
              <pre className="text-label font-normal leading-relaxed whitespace-pre-wrap font-sans text-ink-2 pb-4">
                {openDoc === "terms" ? termsContent : openDoc === "privacy" ? privacyContent : openDoc === "etiquette" ? etiquetteContent : ""}
              </pre>
              <Button variant="secondary" fullWidth onClick={() => setOpenDoc(null)}>{tl("close")}</Button>
            </BottomSheet>
          </div>
        );
      }

      // ── Scherm 1: Welkom ──────────────────────────────────────────────────
      case 1:
        return (
          <div className="flex flex-col items-center justify-between min-h-screen px-6 pt-safe pb-safe bg-surface">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className="mb-6"
              >
                <Image src="/logo.png" alt="TulipDay" width={300} height={200} className="object-contain" priority />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <h1 className="text-display text-ink mb-3">{t("onboarding.welcome_title")}</h1>
                <p className="text-body leading-relaxed max-w-xs text-ink-3">{t("onboarding.welcome_body")}</p>
              </motion.div>
            </div>

            <motion.div
              className="w-full space-y-2 pb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <Button size="lg" fullWidth onClick={() => setPlannerActive(true)}>
                {t("onboarding.start")}
              </Button>
              <Button variant="ghost" fullWidth onClick={() => router.push(`/${locale}/account`)}>
                {t("onboarding.have_account")}
              </Button>
              {/* Alleen tijdens ontwikkeling: onboarding opnieuw doorlopen */}
              {process.env.NODE_ENV === "development" && (
                <button onClick={devReset} className="w-full py-1.5 text-caption text-ink-3 opacity-50">
                  ↺ Reset onboarding
                </button>
              )}
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="overflow-hidden">
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={screen}
          custom={direction}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
