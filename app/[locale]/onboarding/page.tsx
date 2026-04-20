"use client";

// Onboarding flow voor TulipDay — volledig scherm per stap, Duolingo-stijl
// Screens: 0 Welkom · 1 Activiteit · 2 Duur · 3 Locatie · 4 Laden · 5 Resultaat

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MapPin } from "lucide-react";
import { buildGeneratedRoute } from "@/lib/routeGenerator";
import type { GeneratedRoute } from "@/lib/routeGenerator";
import { useWeather } from "@/hooks/useWeather";
import RouteMapPreview from "@/components/routes/RouteMapPreview";

// ── Types ─────────────────────────────────────────────────────────────────────

type Activity = "cycling" | "walking";
type Duration = "short"   | "normal"  | "long";

interface StartLocation {
  type:   "gps" | "preset";
  coords: { lat: number; lng: number };
  label:  string;
}

interface OnboardingState {
  activity:      Activity | null;
  duration:      Duration | null;
  startLocation: StartLocation | null;
  completedAt:   Date | null;
}

// ── Constanten ────────────────────────────────────────────────────────────────

const STORAGE_KEY      = "tulipday_onboarding";
const PREF_STORAGE_KEY = "tulipday_preferences";

const PRESET_LOCATIONS = [
  { key: "keukenhof",  name: "Keukenhof",  lat: 52.2697, lng: 4.5461, emoji: "🌷" },
  { key: "lisse",      name: "Lisse",      lat: 52.2553, lng: 4.5573, emoji: "🏡" },
  { key: "hillegom",   name: "Hillegom",   lat: 52.2917, lng: 4.5783, emoji: "🌾" },
  { key: "sassenheim", name: "Sassenheim", lat: 52.2239, lng: 4.5208, emoji: "🌿" },
  { key: "noordwijk",  name: "Noordwijk",  lat: 52.2378, lng: 4.4436, emoji: "🌊" },
  { key: "voorhout",   name: "Voorhout",   lat: 52.2131, lng: 4.4936, emoji: "🌻" },
];

const LOADING_TEXTS = [
  "Bollenvelden ophalen...",
  "Bloeistatus controleren...",
  "Beste route berekenen...",
  "Fietsroute klaarzetten...",
  "Bijna klaar...",
];

// Activiteit + duur → maximale afstand in km
function getMaxKm(activity: Activity, duration: Duration): number {
  const map: Record<Activity, Record<Duration, number>> = {
    cycling: { short: 8,  normal: 12, long: 20 },
    walking: { short: 4,  normal: 7,  long: 12 },
  };
  return map[activity][duration];
}

// Duur → maximaal aantal velden
function getMaxFields(duration: Duration): number {
  return { short: 5, normal: 8, long: 12 }[duration];
}

// ── Animatie-varianten ────────────────────────────────────────────────────────

const slide = {
  enter:  (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

// ── Hulpcomponenten ───────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  // step 1–3 → 33/66/100%
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: "#E8527A" }}
        initial={false}
        animate={{ width: `${Math.round((step / 3) * 100)}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

function CheckIcon() {
  return (
    <motion.span
      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
      style={{ backgroundColor: "#E8527A" }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
    >
      <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.span>
  );
}

// ── Hoofdcomponent ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? "nl";

  const [screen,          setScreen]        = useState(0);
  const [direction,       setDirection]     = useState(1);
  const [obState,         setObState]       = useState<OnboardingState>({
    activity: null, duration: null, startLocation: null, completedAt: null,
  });
  const [generatedRoute,  setGeneratedRoute] = useState<GeneratedRoute | null>(null);
  const [progress,        setProgress]      = useState(0);
  const [loadingTextIdx,  setLoadingTextIdx] = useState(0);
  const [gpsError,        setGpsError]      = useState(false);
  const advancedRef = useRef(false);

  // Weerdata voor het resultaat-scherm (laadt op de achtergrond)
  const weather = useWeather(obState.startLocation?.coords ?? null);

  // ── Ga door of terug ───────────────────────────────────────────────────────

  function advanceTo(s: number) {
    setDirection(1);
    setScreen(s);
  }

  function goBack() {
    if (screen <= 1) return;
    setDirection(-1);
    setScreen((s) => Math.max(1, s - 1));
  }

  // ── Sla op en voltooi onboarding ──────────────────────────────────────────

  function saveAndComplete(state: OnboardingState) {
    const completedState = { ...state, completedAt: new Date() };

    // Bewaar in nieuw formaat
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(completedState)); } catch {}

    // Bewaar ook in oud formaat voor bestaande home-page compatibiliteit
    const legacyPrefs = {
      intent:    "blooming_fields",
      transport: state.activity === "cycling" ? "bike" : "walking",
      time:      state.duration === "short" ? "short"
               : state.duration === "normal" ? "half_day"
               : "full_day",
    };
    // Merge met completedState zodat bestaande lezers werken
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...completedState, ...legacyPrefs }));
    } catch {}

    // Gebruikersvoorkeuren
    if (state.startLocation) {
      const prefs = {
        activity:         state.activity,
        defaultDuration:  state.duration,
        defaultLocation:  { ...state.startLocation.coords, label: state.startLocation.label },
      };
      try { localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs)); } catch {}
    }
  }

  // ── Controleer bij mount of onboarding al gedaan is ──────────────────────

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

  // ── Loading-scherm: wisselende tekst ──────────────────────────────────────

  useEffect(() => {
    if (screen !== 4) return;
    setLoadingTextIdx(0);
    const id = setInterval(() => {
      setLoadingTextIdx((i) => (i + 1) % LOADING_TEXTS.length);
    }, 1200);
    return () => clearInterval(id);
  }, [screen]);

  // ── Loading-scherm: route genereren + voortgangsbalk ──────────────────────

  useEffect(() => {
    if (screen !== 4) return;
    if (!obState.startLocation || !obState.activity || !obState.duration) return;

    advancedRef.current = false;
    setProgress(0);

    const progressDone = { current: false };
    const routeDone    = { current: false };
    const routeData    = { current: null as GeneratedRoute | null };

    function tryAdvance() {
      if (!progressDone.current || !routeDone.current) return;
      if (advancedRef.current) return;
      advancedRef.current = true;
      setTimeout(() => {
        setGeneratedRoute(routeData.current);
        advanceTo(5);
      }, 300);
    }

    // Voortgangsbalk: 0 → 100% in ~3.3 seconden
    let prog = 0;
    const intervalId = setInterval(() => {
      prog = Math.min(prog + 1.5, 100);
      setProgress(prog);
      if (prog >= 100) {
        clearInterval(intervalId);
        progressDone.current = true;
        tryAdvance();
      }
    }, 50);

    // Route genereren
    const { activity, duration, startLocation } = obState;
    const maxKm     = getMaxKm(activity, duration);
    const maxFields = getMaxFields(duration);

    buildGeneratedRoute(
      { lat: startLocation.coords.lat, lng: startLocation.coords.lng, label: startLocation.label },
      maxKm,
      maxFields,
    )
      .then((route) => { routeData.current = route; })
      .catch(() => {})
      .finally(() => { routeDone.current = true; tryAdvance(); });

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ── Selectie-handlers ──────────────────────────────────────────────────────

  function selectActivity(activity: Activity) {
    const next = { ...obState, activity };
    setObState(next);
    setTimeout(() => advanceTo(2), 350);
  }

  function selectDuration(duration: Duration) {
    const next = { ...obState, duration };
    setObState(next);
    setTimeout(() => advanceTo(3), 350);
  }

  function selectPreset(loc: (typeof PRESET_LOCATIONS)[number]) {
    const startLocation: StartLocation = {
      type:   "preset",
      coords: { lat: loc.lat, lng: loc.lng },
      label:  loc.name,
    };
    const next = { ...obState, startLocation };
    setObState(next);
    setTimeout(() => advanceTo(4), 350);
  }

  function requestGPS() {
    if (!navigator.geolocation) { setGpsError(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const startLocation: StartLocation = {
          type:   "gps",
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          label:  "Jouw locatie",
        };
        const next = { ...obState, startLocation };
        setObState(next);
        setTimeout(() => advanceTo(4), 350);
      },
      () => setGpsError(true),
      { timeout: 10_000 },
    );
  }

  function completeOnboarding() {
    saveAndComplete(obState);
    router.push(`/${locale}/home`);
  }

  function devReset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PREF_STORAGE_KEY);
    } catch {}
    window.location.reload();
  }

  // ── Scherm renderen ────────────────────────────────────────────────────────

  function renderScreen() {
    switch (screen) {

      // ── Scherm 0: Welkom ─────────────────────────────────────────────────
      case 0:
        return (
          <div className="flex flex-col items-center justify-between min-h-screen px-6 pt-20 pb-12"
               style={{ backgroundColor: "#FFF9E6" }}>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              {/* Groeiende tulp */}
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
                <h1 className="text-3xl font-extrabold text-gray-900 mb-3 leading-tight">
                  Welkom bij TulipDay
                </h1>
                <p className="text-base text-gray-500 leading-relaxed max-w-xs">
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
                onClick={() => advanceTo(1)}
                className="w-full py-4 rounded-2xl text-white font-extrabold text-base
                           active:scale-[0.97] transition-transform"
                style={{ backgroundColor: "#E8527A" }}
              >
                Start
              </button>
              <button
                disabled
                className="w-full py-2 text-gray-400 text-sm font-medium disabled:cursor-not-allowed"
              >
                Al een account? Inloggen
              </button>

              {/* Dev-hulp: reset onboarding */}
              <button
                onClick={devReset}
                className="w-full py-1.5 text-gray-300 text-[10px] font-medium"
              >
                ↺ Reset onboarding
              </button>
            </motion.div>
          </div>
        );

      // ── Scherm 1: Activiteit ─────────────────────────────────────────────
      case 1: {
        const options: { value: Activity; emoji: string; label: string; sub: string }[] = [
          { value: "cycling", emoji: "🚴", label: "Fietsen", sub: "Ontdek meer velden" },
          { value: "walking", emoji: "🚶", label: "Wandelen", sub: "Rustig genieten" },
        ];
        return (
          <div className="flex flex-col min-h-screen px-5 pt-16 pb-10"
               style={{ backgroundColor: "#FAFAF7" }}>
            <div className="mb-8">
              <ProgressBar step={1} />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1.5">Hoe ga jij op pad?</h2>
            <p className="text-sm text-gray-400 mb-8">We passen je route hierop aan</p>

            <div className="flex flex-col gap-3 flex-1">
              {options.map((opt) => {
                const active = obState.activity === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => selectActivity(opt.value)}
                    className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl border-2 text-left transition-colors"
                    style={{
                      borderColor:     active ? "#E8527A" : "#E8E8E0",
                      backgroundColor: active ? "#FFF0F3" : "#FFFFFF",
                    }}
                  >
                    <span className="text-4xl leading-none">{opt.emoji}</span>
                    <div className="flex-1">
                      <p className="font-extrabold text-gray-900 text-base">{opt.label}</p>
                      <p className="text-sm text-gray-400 mt-0.5">{opt.sub}</p>
                    </div>
                    {active && <CheckIcon />}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      }

      // ── Scherm 2: Duur ───────────────────────────────────────────────────
      case 2: {
        const options: { value: Duration; emoji: string; label: string; sub: string }[] = [
          { value: "short",  emoji: "⚡", label: "Kort",   sub: "30 – 60 minuten" },
          { value: "normal", emoji: "🌷", label: "Normaal", sub: "1 – 2 uur" },
          { value: "long",   emoji: "🗺️", label: "Lang",   sub: "2 – 3 uur" },
        ];
        return (
          <div className="flex flex-col min-h-screen px-5 pt-16 pb-10"
               style={{ backgroundColor: "#FAFAF7" }}>
            <div className="mb-8 flex items-center gap-3">
              <button onClick={goBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
                <ChevronLeft size={22} />
              </button>
              <div className="flex-1">
                <ProgressBar step={2} />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1.5">
              Hoe lang wil je onderweg zijn?
            </h2>
            <p className="text-sm text-gray-400 mb-8">We kiezen de juiste routelengte</p>

            <div className="flex flex-col gap-3 flex-1">
              {options.map((opt) => {
                const active = obState.duration === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => selectDuration(opt.value)}
                    className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl border-2 text-left transition-colors"
                    style={{
                      borderColor:     active ? "#E8527A" : "#E8E8E0",
                      backgroundColor: active ? "#FFF0F3" : "#FFFFFF",
                    }}
                  >
                    <span className="text-4xl leading-none">{opt.emoji}</span>
                    <div className="flex-1">
                      <p className="font-extrabold text-gray-900 text-base">{opt.label}</p>
                      <p className="text-sm text-gray-400 mt-0.5">{opt.sub}</p>
                    </div>
                    {active && <CheckIcon />}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      }

      // ── Scherm 3: Locatie ────────────────────────────────────────────────
      case 3: {
        const selected = obState.startLocation;
        return (
          <div className="flex flex-col min-h-screen px-5 pt-16 pb-10"
               style={{ backgroundColor: "#FAFAF7" }}>
            <div className="mb-8 flex items-center gap-3">
              <button onClick={goBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
                <ChevronLeft size={22} />
              </button>
              <div className="flex-1">
                <ProgressBar step={3} />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1.5">
              Waar begin je je tocht?
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Zo vinden we velden bij jou in de buurt
            </p>

            {/* GPS optie */}
            {!gpsError && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={requestGPS}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 mb-5 text-left transition-colors"
                style={{
                  borderColor:     selected?.type === "gps" ? "#E8527A" : "#E8527A",
                  backgroundColor: selected?.type === "gps" ? "#FFF0F3" : "#FFF0F3",
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                     style={{ backgroundColor: "#E8527A" }}>
                  <MapPin size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-gray-900 text-sm">Gebruik mijn locatie</p>
                  <p className="text-xs text-gray-400 mt-0.5">Meest nauwkeurig</p>
                </div>
                {selected?.type === "gps" && <CheckIcon />}
              </motion.button>
            )}
            {gpsError && (
              <p className="text-xs text-orange-500 font-semibold mb-5 px-1">
                Locatie niet beschikbaar · Kies hieronder een startplaats
              </p>
            )}

            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
              Of kies een startplaats
            </p>

            {/* 2×3 grid van steden */}
            <div className="grid grid-cols-2 gap-3">
              {PRESET_LOCATIONS.map((loc) => {
                const active = selected?.label === loc.name;
                return (
                  <motion.button
                    key={loc.key}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => selectPreset(loc)}
                    className="flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-colors"
                    style={{
                      borderColor:     active ? "#E8527A" : "#E8E8E0",
                      backgroundColor: active ? "#FFF0F3" : "#FFFFFF",
                    }}
                  >
                    <span className="text-2xl leading-none">{loc.emoji}</span>
                    <p className="text-xs font-bold text-gray-700">{loc.name}</p>
                    {active && (
                      <motion.span
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#E8527A" }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <svg viewBox="0 0 10 8" fill="none" className="w-2 h-2">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      }

      // ── Scherm 4: Laden ──────────────────────────────────────────────────
      case 4:
        return (
          <div className="flex flex-col items-center justify-center min-h-screen px-6 pb-12"
               style={{ backgroundColor: "#FFF9E6" }}>
            {/* Pulserende tulp */}
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="text-[80px] leading-none mb-10 select-none"
            >
              🌷
            </motion.div>

            {/* Wisselende laadtekst */}
            <AnimatePresence mode="wait">
              <motion.p
                key={loadingTextIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-base font-bold text-gray-700 mb-8 text-center"
              >
                {LOADING_TEXTS[loadingTextIdx]}
              </motion.p>
            </AnimatePresence>

            {/* Voortgangsbalk */}
            <div className="w-64 h-2 bg-amber-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "#E8527A" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.08, ease: "linear" }}
              />
            </div>
            <p className="text-xs text-amber-400 font-semibold mt-2">{Math.round(progress)}%</p>
          </div>
        );

      // ── Scherm 5: Resultaat ──────────────────────────────────────────────
      case 5: {
        const route = generatedRoute;
        const cyclingLabel = weather.current?.cyclingLabel ?? "Goed fietsweer";

        return (
          <div className="flex flex-col min-h-screen pb-10"
               style={{ backgroundColor: "#FAFAF7" }}>

            {/* Header */}
            <div className="px-5 pt-14 pb-6 text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="text-5xl mb-3 select-none"
              >
                🌷
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-extrabold text-gray-900"
              >
                Jouw route is klaar!
              </motion.h2>
            </div>

            {route ? (
              <>
                {/* RouteMapPreview */}
                <motion.div
                  className="mx-5 rounded-2xl overflow-hidden shadow-card mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.35 }}
                >
                  <RouteMapPreview route={route} className="w-full" />
                  <div className="bg-white px-4 py-3">
                    <p className="text-sm font-extrabold text-gray-900 truncate">{route.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Vertrekt bij {route.startLocation.label}
                    </p>
                  </div>
                </motion.div>

                {/* Drie highlights */}
                <div className="mx-5 mb-6 space-y-2.5">
                  {[
                    `${route.fields.length} bollenvelden onderweg`,
                    `${route.distanceKm} km · ±${route.estimatedMinutes} minuten`,
                    `Weerbericht: ${cyclingLabel}`,
                  ].map((text, i) => (
                    <motion.div
                      key={text}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.15 }}
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "#F0FDF4" }}
                      >
                        <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                          <path d="M1 4l2.5 2.5L9 1" stroke="#2D7D46" strokeWidth="1.8"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <p className="text-sm font-semibold text-gray-700">{text}</p>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              // Geen route gegenereerd (fout)
              <div className="mx-5 mb-6 rounded-2xl bg-orange-50 border border-orange-100 p-4 text-center">
                <p className="text-sm font-bold text-orange-700">Route niet beschikbaar</p>
                <p className="text-xs text-orange-400 mt-1">
                  Probeer een andere locatie of afstand
                </p>
              </div>
            )}

            {/* Knoppen */}
            <motion.div
              className="px-5 space-y-3 mt-auto"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <button
                onClick={completeOnboarding}
                className="w-full py-4 rounded-2xl text-white font-extrabold text-base
                           active:scale-[0.97] transition-transform"
                style={{ backgroundColor: "#E8527A" }}
              >
                Start mijn route
              </button>
              <button
                onClick={() => { saveAndComplete(obState); router.push(`/${locale}/fietsroutes`); }}
                className="w-full py-2 text-gray-500 text-sm font-semibold"
              >
                Bekijk alle routes
              </button>
            </motion.div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
