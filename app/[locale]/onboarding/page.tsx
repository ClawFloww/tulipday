"use client";

// Onboarding flow — Scherm 0: Juridisch · Scherm 1: Welkom · daarna PlannerFlow
// PlannerFlow vervangt de oude activiteit/duur/locatie/laad/resultaat-schermen.

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { TERMS_VERSION, TERMS_DATE, getLegalDocs } from "@/constants/legal";
import { PLANNER_PROFILE_KEY } from "@/lib/planner/types";
import type { PlannerProfile } from "@/lib/planner/types";
import PlannerFlow from "@/components/planner/PlannerFlow";

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
      className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0"
      style={{
        borderColor:     checked ? "#E8102A" : "var(--color-border-strong)",
        backgroundColor: checked ? "#E8102A" : "transparent",
        transition:      "background-color 0.2s, border-color 0.2s",
      }}
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

// ── Document bottom-sheet ─────────────────────────────────────────────────────

function LegalDocSheet({
  title, content, closeLabel, onClose,
}: {
  title:      string;
  content:    string;
  closeLabel: string;
  onClose:    () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl flex flex-col"
        style={{ backgroundColor: "var(--color-surface-2)", maxHeight: "85vh" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "var(--color-border-strong)" }} />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3"
             style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3 className="text-base font-bold" style={{ color: "var(--color-text)" }}>{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className="text-[13px] leading-relaxed whitespace-pre-wrap font-sans"
               style={{ color: "var(--color-text-2)" }}>
            {content}
          </pre>
        </div>
        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--color-border)" }}>
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl text-sm font-bold"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text)" }}
          >
            {closeLabel}
          </button>
        </div>
      </motion.div>
    </>
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
    if (!acceptedTerms) { setTermsAnimating(true); setTimeout(() => setTermsAnimating(false), 450); }
    setAcceptedTerms((v) => !v);
  }
  function togglePrivacy() {
    if (!acceptedPrivacy) { setPrivacyAnimating(true); setTimeout(() => setPrivacyAnimating(false), 450); }
    setAcceptedPrivacy((v) => !v);
  }
  function toggleEtiquette() {
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
          <div
            className="flex flex-col min-h-screen px-6 pt-14 pb-10"
            style={{ backgroundColor: "var(--color-surface)" }}
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center mb-10"
            >
              <span className="text-5xl mb-2 select-none">🌷</span>
              <span className="text-xl font-extrabold" style={{ color: "#E8102A" }}>TulipDay</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mb-8"
            >
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: "var(--color-text)" }}>
                {tl("title")}
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-3)" }}>
                {tl("subtitle")}
              </p>
            </motion.div>

            {/* Checkboxrijen */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="space-y-2 mb-8"
            >
              <div
                role="button" tabIndex={0}
                onClick={toggleTerms}
                onKeyDown={(e) => e.key === "Enter" && toggleTerms()}
                className="flex items-center gap-4 py-3.5 rounded-xl px-3 -mx-3 transition-colors"
                style={{ minHeight: 48, cursor: "pointer" }}
              >
                <LegalCheckbox checked={acceptedTerms} animating={termsAnimating} />
                <p className="text-sm flex-1 leading-snug" style={{ color: "var(--color-text-2)" }}>
                  {tl("terms_prefix")}
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenDoc("terms"); }}
                    className="font-semibold underline"
                    style={{ color: "#E8102A" }}
                  >
                    {tl("terms_link")}
                  </button>
                  {tl("terms_suffix")}
                </p>
              </div>

              <div
                role="button" tabIndex={0}
                onClick={togglePrivacy}
                onKeyDown={(e) => e.key === "Enter" && togglePrivacy()}
                className="flex items-center gap-4 py-3.5 rounded-xl px-3 -mx-3 transition-colors"
                style={{ minHeight: 48, cursor: "pointer" }}
              >
                <LegalCheckbox checked={acceptedPrivacy} animating={privacyAnimating} />
                <p className="text-sm flex-1 leading-snug" style={{ color: "var(--color-text-2)" }}>
                  {tl("privacy_prefix")}
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenDoc("privacy"); }}
                    className="font-semibold underline"
                    style={{ color: "#E8102A" }}
                  >
                    {tl("privacy_link")}
                  </button>
                  {tl("privacy_suffix")}
                </p>
              </div>

              <div
                role="button" tabIndex={0}
                onClick={toggleEtiquette}
                onKeyDown={(e) => e.key === "Enter" && toggleEtiquette()}
                className="flex items-center gap-4 py-3.5 rounded-xl px-3 -mx-3 transition-colors"
                style={{ minHeight: 48, cursor: "pointer" }}
              >
                <LegalCheckbox checked={acceptedEtiquette} animating={etiquetteAnimating} />
                <p className="text-sm flex-1 leading-snug" style={{ color: "var(--color-text-2)" }}>
                  {tl("etiquette_prefix")}
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenDoc("etiquette"); }}
                    className="font-semibold underline"
                    style={{ color: "#E8102A" }}
                  >
                    {tl("etiquette_link")}
                  </button>
                  {tl("etiquette_suffix")}
                </p>
              </div>
            </motion.div>

            {/* Doorgaan */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-auto space-y-3"
            >
              <button
                onClick={() => allAccepted && advanceTo(1)}
                className="w-full py-4 rounded-2xl text-white font-extrabold text-base
                           active:scale-[0.97] transition-all"
                style={{
                  backgroundColor: allAccepted ? "#E8527A" : "var(--color-surface-3)",
                  color:            allAccepted ? "white"   : "var(--color-text-3)",
                  cursor:           allAccepted ? "pointer" : "not-allowed",
                }}
              >
                {tl("continue")}
              </button>
              <p className="text-center text-[11px]" style={{ color: "var(--color-text-3)" }}>
                v{TERMS_VERSION} · {TERMS_DATE} · info@tulipday.online
              </p>
            </motion.div>

            {/* Document sheets */}
            <AnimatePresence>
              {openDoc === "terms" && (
                <LegalDocSheet title={tl("terms_title")} content={termsContent} closeLabel={tl("close")} onClose={() => setOpenDoc(null)} />
              )}
              {openDoc === "privacy" && (
                <LegalDocSheet title={tl("privacy_title")} content={privacyContent} closeLabel={tl("close")} onClose={() => setOpenDoc(null)} />
              )}
              {openDoc === "etiquette" && (
                <LegalDocSheet title={tl("etiquette_title")} content={etiquetteContent} closeLabel={tl("close")} onClose={() => setOpenDoc(null)} />
              )}
            </AnimatePresence>
          </div>
        );
      }

      // ── Scherm 1: Welkom ──────────────────────────────────────────────────
      case 1:
        return (
          <div className="flex flex-col items-center justify-between min-h-screen px-6 pt-20 pb-12"
               style={{ backgroundColor: "var(--color-surface)" }}>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className="text-[100px] leading-none mb-8 select-none"
              >
                🌷
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <h1 className="text-3xl font-extrabold mb-3 leading-tight" style={{ color: "var(--color-text)" }}>
                  Welkom bij TulipDay
                </h1>
                <p className="text-base leading-relaxed max-w-xs" style={{ color: "var(--color-text-3)" }}>
                  Ontdek de mooiste bollenvelden van de Bollenstreek
                </p>
              </motion.div>
            </div>

            <motion.div
              className="w-full space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <button
                onClick={() => setPlannerActive(true)}
                className="w-full py-4 rounded-2xl text-white font-extrabold text-base
                           active:scale-[0.97] transition-transform"
                style={{ backgroundColor: "#E8527A" }}
              >
                Start
              </button>
              <button
                disabled
                className="w-full py-2 text-sm font-medium disabled:cursor-not-allowed"
                style={{ color: "var(--color-text-3)" }}
              >
                Al een account? Inloggen
              </button>
              <button
                onClick={devReset}
                className="w-full py-1.5 text-[10px] font-medium"
                style={{ color: "var(--color-text-3)", opacity: 0.5 }}
              >
                ↺ Reset onboarding
              </button>
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
