"use client";

// Volledig-scherm navigatie UI — voor fietsers, automobilisten en wandelaars
// GPS via watchPosition + refs voor vloeiend bijhouden zonder useCallback-loops

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  X, ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight,
  RotateCcw, Navigation, Flag, Bike, Car, Footprints,
  Flower2, Check, ChevronRight, List, Locate,
} from "lucide-react";
import { haversineDistance } from "@/lib/tulipFields";
import { supabase } from "@/lib/supabase";

const NavigationMap = dynamic(() => import("./NavigationMap"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  bloom_status?: string | null;
  location_id?: string;
}

export interface NavStep {
  instruction: string;
  streetName:  string;
  distance:    number;
  location:    [number, number]; // [lng, lat]
  type:        string;
  modifier?:   string;
}

export interface NavRoute {
  name:            string;
  mode:            "bike" | "car" | "walk";
  stops:           NavStop[];
  geometry:        [number, number][]; // [lng, lat]
  distanceKm:      number;
  durationMinutes: number;
  steps?:          NavStep[];
  // Aanrijdroute: van huidige locatie naar start van de route
  approachGeometry?:  [number, number][] | null;
  approachSteps?:     NavStep[];
  approachDistanceM?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDist(m: number) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m / 25) * 25} m`;
}

function formatETA(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return `${h}u ${m}m`;
}

// ─── Maneuver-icoon ──────────────────────────────────────────────────────────

function ManeuverIcon({ type, modifier, size = 22 }: { type: string; modifier?: string; size?: number }) {
  if (type === "arrive")                                    return <Flag        size={size} />;
  if (type === "depart")                                    return <Navigation  size={size} />;
  if (modifier === "uturn")                                 return <RotateCcw   size={size} />;
  if (modifier === "left"  || modifier === "sharp left")    return <ArrowLeft   size={size} />;
  if (modifier === "right" || modifier === "sharp right")   return <ArrowRight  size={size} />;
  if (modifier === "slight left")                           return <ArrowUpLeft  size={size} />;
  if (modifier === "slight right")                          return <ArrowUpRight size={size} />;
  return <ArrowUp size={size} />;
}

// ─── Hoofd-component ─────────────────────────────────────────────────────────

const ARRIVAL_RADIUS = 80; // meter

export default function NavigationView({ navRoute, locale }: { navRoute: NavRoute; locale: string }) {
  const router = useRouter();

  // Navigatiestatus
  const [userPos,     setUserPos]     = useState<[number, number] | null>(null);
  const [heading,     setHeading]     = useState(0);
  const [currentStop, setCurrentStop] = useState(0);
  const [visited,     setVisited]     = useState<Set<number>>(new Set());
  const [distToStop,  setDistToStop]  = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [finished,    setFinished]    = useState(false);

  // GPS-staat
  const [gpsStatus,   setGpsStatus]   = useState<"waiting" | "active" | "denied">("waiting");
  const [locked,      setLocked]      = useState(true); // kaart vergrendeld op gebruikerslocatie

  // Aanrijdroute-staat
  const hasApproach = (navRoute.approachGeometry?.length ?? 0) > 0;
  const [approachPhase,        setApproachPhase]        = useState(hasApproach);
  const [distToStart,          setDistToStart]          = useState<number | null>(null);
  const [currentApproachStep,  setCurrentApproachStep]  = useState(0);

  // UI-staat
  const [showList,  setShowList]  = useState(false);
  const [showBloom, setShowBloom] = useState(false);
  const [bloomLocal, setBloomLocal] = useState<Record<string, string>>({});

  // Refs voor gebruik binnen watchPosition (vermijdt opnieuw aanmaken)
  const currentStopRef         = useRef(currentStop);
  const visitedRef             = useRef(visited);
  const stepsRef               = useRef(navRoute.steps ?? []);
  const currentStepRef         = useRef(currentStep);
  const stopsRef               = useRef(navRoute.stops);
  const approachPhaseRef       = useRef(hasApproach);
  const currentApproachStepRef = useRef(0);
  const approachStepsRef       = useRef(navRoute.approachSteps ?? []);

  // Synchroniseer refs met state
  useEffect(() => { currentStopRef.current        = currentStop; },       [currentStop]);
  useEffect(() => { visitedRef.current             = visited; },           [visited]);
  useEffect(() => { currentStepRef.current         = currentStep; },       [currentStep]);
  useEffect(() => { approachPhaseRef.current       = approachPhase; },     [approachPhase]);
  useEffect(() => { currentApproachStepRef.current = currentApproachStep; }, [currentApproachStep]);

  const activeStop = navRoute.stops[currentStop] ?? null;
  const isFlower   = activeStop?.category === "flower_field";
  const steps      = navRoute.steps ?? [];

  const doneFraction  = navRoute.stops.length > 0 ? visited.size / navRoute.stops.length : 0;
  const distRemaining = Math.round(navRoute.distanceKm * (1 - doneFraction) * 1000);
  const etaMinutes    = Math.max(1, Math.round(navRoute.durationMinutes * (1 - doneFraction)));
  const activeStep    = steps[currentStep] ?? null;

  // Aanrijdroute
  const approachSteps    = navRoute.approachSteps ?? [];
  const activeApproachStep = approachSteps[currentApproachStep] ?? null;

  // ── GPS via watchPosition (één keer gestart, refs voor mutable waarden) ──

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("denied");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const hdg = pos.coords.heading;

        setGpsStatus("active");
        setUserPos([lat, lng]);
        if (hdg !== null && !isNaN(hdg)) setHeading(hdg);

        // ── Aanrijdroute-fase: navigeer naar het startpunt ─────────────────
        if (approachPhaseRef.current) {
          const [startLng, startLat] = navRoute.geometry[0] ?? [0, 0];
          const dToStart = haversineDistance(lat, lng, startLat, startLng);
          setDistToStart(Math.round(dToStart));

          if (dToStart <= 100) {
            // Gebruiker heeft het startpunt bereikt → overschakelen naar hoofdroute
            setApproachPhase(false);
            approachPhaseRef.current = false;
            setDistToStart(null);
            // Doorvallen naar de normale stop-detectie hieronder
          } else {
            // Stap-tracking voor aanrijdroute
            const aSteps = approachStepsRef.current;
            if (aSteps.length > 0) {
              let nearestA = currentApproachStepRef.current;
              let nearestDistA = Infinity;
              for (let i = currentApproachStepRef.current; i < aSteps.length; i++) {
                const [sLng, sLat] = aSteps[i].location;
                const d = haversineDistance(lat, lng, sLat, sLng);
                if (d < nearestDistA) { nearestDistA = d; nearestA = i; }
                if (nearestDistA < 25) break;
              }
              if (nearestA !== currentApproachStepRef.current && nearestDistA < 50) {
                const next = Math.min(nearestA + 1, aSteps.length - 1);
                setCurrentApproachStep(next);
                currentApproachStepRef.current = next;
              }
            }
            return; // Niet de hoofd-stoproutine uitvoeren tijdens aanrijden
          }
        }

        // Aankomstdetectie huidige stop
        const stop = stopsRef.current[currentStopRef.current];
        if (stop) {
          const d = haversineDistance(lat, lng, stop.lat, stop.lng);
          setDistToStop(Math.round(d));

          if (d <= ARRIVAL_RADIUS && !visitedRef.current.has(currentStopRef.current)) {
            setVisited((prev) => {
              const next = new Set([...Array.from(prev), currentStopRef.current]);
              visitedRef.current = next;
              const nextIdx = stopsRef.current.findIndex((_, i) => !next.has(i));
              if (nextIdx === -1) {
                setFinished(true);
              } else {
                setCurrentStop(nextIdx);
                currentStopRef.current = nextIdx;
                setCurrentStep(0);
                currentStepRef.current = 0;
                setDistToStop(null);
              }
              return next;
            });
          }
        }

        // Stap-tracking
        const allSteps = stepsRef.current;
        if (allSteps.length > 0) {
          let nearest     = currentStepRef.current;
          let nearestDist = Infinity;
          for (let i = currentStepRef.current; i < allSteps.length; i++) {
            const [sLng, sLat] = allSteps[i].location;
            const d = haversineDistance(lat, lng, sLat, sLng);
            if (d < nearestDist) { nearestDist = d; nearest = i; }
            if (nearestDist < 25) break;
          }
          if (nearest !== currentStepRef.current && nearestDist < 50) {
            const next = Math.min(nearest + 1, allSteps.length - 1);
            setCurrentStep(next);
            currentStepRef.current = next;
          }
        }
      },
      (err) => {
        if (err.code === 1) setGpsStatus("denied"); // toestemming geweigerd
        // code 2 (onbeschikbaar) of 3 (timeout) → blijf "waiting"
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 3_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // watchPosition één keer starten; refs zorgen voor actuele waarden

  // ── Acties ─────────────────────────────────────────────────────────────────

  function handleMarkArrived(idx: number) {
    const next = new Set([...Array.from(visited), idx]);
    visitedRef.current = next;
    setVisited(next);
    const nextIdx = navRoute.stops.findIndex((_, i) => !next.has(i));
    if (nextIdx === -1) {
      setFinished(true);
    } else {
      setCurrentStop(nextIdx);
      currentStopRef.current = nextIdx;
      setCurrentStep(0);
      currentStepRef.current = 0;
      setDistToStop(null);
    }
  }

  async function handleBloomReport(status: string) {
    if (!activeStop) return;
    setBloomLocal(prev => ({ ...prev, [activeStop.id]: status }));
    setShowBloom(false);
    const locId = activeStop.location_id ?? activeStop.id;
    if (locId) await supabase.from("locations").update({ bloom_status: status }).eq("id", locId);
  }

  // ── Voltooid-scherm ────────────────────────────────────────────────────────

  if (finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
           style={{ backgroundColor: "var(--color-surface)" }}>
        <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                    className="text-7xl mb-5 select-none">🌷</motion.div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: "var(--color-text)" }}>Route voltooid!</h2>
        <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>
          {navRoute.stops.length} stops · {navRoute.distanceKm} km
        </p>
        <p className="text-base font-extrabold mb-10 text-tulip-500">Goed gedaan!</p>
        <button onClick={() => router.push(`/${locale}/home`)}
                className="w-full max-w-sm py-4 rounded-2xl text-white font-extrabold text-base active:scale-[0.97] transition-transform bg-tulip-500">
          Terug naar home
        </button>
      </div>
    );
  }

  const ModeIcon      = navRoute.mode === "bike" ? Bike : navRoute.mode === "car" ? Car : Footprints;
  const reportedBloom = activeStop ? bloomLocal[activeStop.id] : null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* ── GPS-wacht overlay ───────────────────────────────────────────── */}
      <AnimatePresence>
        {gpsStatus === "waiting" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm"
          >
            <div className="w-10 h-10 rounded-full border-3 border-white border-t-transparent animate-spin" />
            <p className="text-white font-bold text-base">Locatie bepalen…</p>
            <p className="text-white/60 text-sm">Zorg dat GPS is ingeschakeld</p>
          </motion.div>
        )}
        {gpsStatus === "denied" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 px-8 bg-black/70"
          >
            <Locate size={40} className="text-white" />
            <p className="text-white font-extrabold text-lg text-center">Geen locatietoegang</p>
            <p className="text-white/70 text-sm text-center">
              Sta locatietoegang toe in je browserinstellingen om te navigeren.
            </p>
            <button onClick={() => router.back()}
                    className="mt-2 px-6 py-3 rounded-2xl bg-white text-tulip-600 font-bold">
              Terug
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Instructie-balk (boven) ──────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3"
           style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="rounded-2xl shadow-2xl overflow-hidden"
                    style={{ backgroundColor: approachPhase ? "#1F2937" : "#E8102A" }}>
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            {/* Maneuver-icoon */}
            <div className="w-12 h-12 rounded-xl bg-white/25 flex items-center justify-center flex-shrink-0 text-white">
              {approachPhase
                ? (activeApproachStep
                    ? <ManeuverIcon type={activeApproachStep.type} modifier={activeApproachStep.modifier} size={22} />
                    : <Navigation size={22} />)
                : (activeStep
                    ? <ManeuverIcon type={activeStep.type} modifier={activeStep.modifier} size={22} />
                    : <Navigation size={22} />)}
            </div>

            {/* Instructie */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-extrabold text-lg leading-tight truncate">
                {approachPhase
                  ? (activeApproachStep?.streetName || "Naar startpunt")
                  : (activeStep?.streetName || activeStop?.name || navRoute.name)}
              </p>
              <p className="text-white/80 text-sm font-semibold mt-0.5">
                {approachPhase
                  ? (distToStart !== null
                      ? formatDist(distToStart)
                      : activeApproachStep
                        ? formatDist(activeApproachStep.distance)
                        : "Aanrijdroute berekend")
                  : (distToStop !== null
                      ? formatDist(distToStop)
                      : activeStep
                        ? formatDist(activeStep.distance)
                        : gpsStatus === "waiting" ? "Locatie bepalen…" : "")}
              </p>
            </div>

            {/* Sluit-knop */}
            <button type="button" onClick={() => router.back()}
                    className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-white flex-shrink-0 active:scale-90 transition-transform">
              <X size={18} />
            </button>
          </div>

          {/* Onderbalk: aanrijdroute → routenaam / hoofdroute → volgende stop */}
          {approachPhase ? (
            <div className="px-4 pb-2.5 flex items-center gap-1.5">
              <span className="text-white/60 text-[11px] font-medium">Dan begint →</span>
              <span className="text-white/90 text-[11px] font-bold truncate">{navRoute.name}</span>
            </div>
          ) : navRoute.stops[currentStop + 1] ? (
            <div className="px-4 pb-2.5 flex items-center gap-1.5">
              <span className="text-white/60 text-[11px] font-medium">Daarna →</span>
              <span className="text-white/90 text-[11px] font-bold truncate">
                {navRoute.stops[currentStop + 1].name}
              </span>
            </div>
          ) : null}
        </motion.div>
      </div>

      {/* ── Kaart ───────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        <NavigationMap
          geometry={navRoute.geometry}
          approachGeometry={approachPhase ? (navRoute.approachGeometry ?? null) : null}
          stops={navRoute.stops}
          activeStopIdx={currentStop}
          visitedStops={visited}
          userPos={userPos}
          heading={heading}
          locked={locked}
          onUserPan={() => setLocked(false)}
        />

        {/* Recenter-knop (verschijnt als gebruiker kaart heeft verschoven) */}
        <AnimatePresence>
          {!locked && userPos && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={() => setLocked(true)}
              className="absolute top-4 right-3 z-30 w-10 h-10 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            >
              <Locate size={18} className="text-tulip-500" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Bloom-status widget (alleen bollenvelden) */}
        {isFlower && (
          <div className="absolute bottom-28 left-3 z-30">
            <AnimatePresence mode="wait">
              {showBloom ? (
                <motion.div key="picker"
                  initial={{ opacity: 0, scale: 0.92, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 8 }} transition={{ duration: 0.15 }}
                  className="rounded-2xl shadow-xl p-3 w-52 mb-1"
                  style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  <p className="text-xs font-bold mb-2 px-0.5" style={{ color: "var(--color-text-2)" }}>
                    Staat dit veld in bloei?
                  </p>
                  {[
                    { value: "in_bloom",  label: "🌷 Volop in bloei" },
                    { value: "fading",    label: "🌸 Aan het vervagen" },
                    { value: "finished",  label: "🍃 Uitgebloeid" },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => handleBloomReport(opt.value)}
                            className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 mb-1"
                            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text)" }}>
                      {opt.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => setShowBloom(false)}
                          className="w-full py-1.5 text-xs font-medium rounded-lg"
                          style={{ color: "var(--color-text-3)" }}>
                    Annuleren
                  </button>
                </motion.div>
              ) : (
                <motion.button key="pill" type="button"
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  onClick={() => setShowBloom(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-sm font-semibold active:scale-95 transition-transform"
                  style={{
                    backgroundColor: "var(--color-surface-2)",
                    color: reportedBloom ? "#2D7D46" : "var(--color-text)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Flower2 size={14} className="text-tulip-500" />
                  {reportedBloom === "in_bloom" ? "In bloei ✓"
                    : reportedBloom === "fading" ? "Vervagend ✓"
                    : reportedBloom === "finished" ? "Uitgebloeid ✓"
                    : "Bloei melden"}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Stop-teller */}
        <button type="button" onClick={() => setShowList(true)}
                className="absolute bottom-28 right-3 z-30 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-sm font-semibold active:scale-95 transition-transform"
                style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
          <List size={14} style={{ color: "var(--color-text-3)" }} />
          <span className="font-extrabold text-tulip-500">{currentStop + 1}</span>
          <span style={{ color: "var(--color-text-3)" }}>/ {navRoute.stops.length}</span>
        </button>
      </div>

      {/* ── Onderste balk ───────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-3"
           style={{ paddingBottom: "calc(max(env(safe-area-inset-bottom), 0px) + 80px)" }}>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="rounded-2xl shadow-2xl overflow-hidden"
                    style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center px-4 py-3 gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ backgroundColor: "var(--color-surface-3)" }}>
              <ModeIcon size={18} className={approachPhase ? "text-gray-400" : "text-tulip-500"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-extrabold leading-tight" style={{ color: "var(--color-text)" }}>
                {approachPhase
                  ? (distToStart !== null ? formatDist(distToStart) : "Naar startpunt")
                  : formatDist(distRemaining)}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
                {approachPhase
                  ? `Dan begint ${navRoute.name}`
                  : `~${formatETA(etaMinutes)} · stop ${currentStop + 1} van ${navRoute.stops.length}`}
              </p>
            </div>
            {!approachPhase && (
              <button type="button" onClick={() => handleMarkArrived(currentStop)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-bold active:scale-95 transition-transform bg-tulip-500">
                <Check size={15} /> Aftekenen
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Stop-lijst sheet ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showList && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/40" onClick={() => setShowList(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-4 pt-3 pb-10 max-h-[72vh] overflow-y-auto"
              style={{ backgroundColor: "var(--color-surface-2)" }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: "var(--color-border)" }} />
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-extrabold uppercase tracking-wide" style={{ color: "var(--color-text-2)" }}>
                  {navRoute.name}
                </h3>
                <button type="button" onClick={() => setShowList(false)}>
                  <X size={18} style={{ color: "var(--color-text-3)" }} />
                </button>
              </div>
              <div className="space-y-2">
                {navRoute.stops.map((stop, idx) => {
                  const isVisited = visited.has(idx);
                  const isActive  = idx === currentStop;
                  return (
                    <div key={stop.id}
                         className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                         style={{
                           backgroundColor: isActive ? "var(--color-surface-3)" : "transparent",
                           border: isActive ? "1.5px solid #E8102A" : "1.5px solid transparent",
                           opacity: isVisited ? 0.5 : 1,
                         }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                           style={{ backgroundColor: isVisited ? "#2D7D46" : isActive ? "#E8102A" : "var(--color-border)" }}>
                        {isVisited ? <Check size={13} /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{stop.name}</p>
                        {isActive && <p className="text-xs font-bold text-tulip-500">Nu navigeren</p>}
                      </div>
                      {!isVisited && !isActive && <ChevronRight size={14} style={{ color: "var(--color-text-3)" }} />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
