"use client";

// Volledig-scherm navigatie UI — voor fietsers, automobilisten en wandelaars
// Toont: live GPS-positie op kaart, afslag-instructies, bloom-status widget, stop-overzicht

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  X, ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight,
  RotateCcw, Navigation, Flag, Bike, Car, Footprints,
  Flower2, Check, ChevronRight, List,
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
  distance:    number;           // m tot dit keerpunt
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
  if (type === "arrive")                           return <Flag        size={size} />;
  if (type === "depart")                           return <Navigation  size={size} />;
  if (modifier === "uturn")                        return <RotateCcw   size={size} />;
  if (modifier === "left"  || modifier === "sharp left")  return <ArrowLeft  size={size} />;
  if (modifier === "right" || modifier === "sharp right") return <ArrowRight size={size} />;
  if (modifier === "slight left")                  return <ArrowUpLeft  size={size} />;
  if (modifier === "slight right")                 return <ArrowUpRight size={size} />;
  return <ArrowUp size={size} />;
}

// ─── Hoofd-component ─────────────────────────────────────────────────────────

const ARRIVAL_RADIUS  = 80;   // meter
const GPS_INTERVAL_MS = 4000; // 4 s

export default function NavigationView({ navRoute, locale }: { navRoute: NavRoute; locale: string }) {
  const router = useRouter();

  // Navigatiestatus
  const [userPos,       setUserPos]       = useState<[number, number] | null>(null); // [lat, lng]
  const [heading,       setHeading]       = useState(0);
  const [currentStop,   setCurrentStop]   = useState(0);
  const [visited,       setVisited]       = useState<Set<number>>(new Set());
  const [distToStop,    setDistToStop]    = useState<number | null>(null);
  const [currentStep,   setCurrentStep]   = useState(0);
  const [finished,      setFinished]      = useState(false);

  // UI-staat
  const [showList,      setShowList]      = useState(false);
  const [showBloom,     setShowBloom]     = useState(false);
  const [bloomLocal,    setBloomLocal]    = useState<Record<string, string>>({});

  const gpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeStop = navRoute.stops[currentStop] ?? null;
  const isFlower   = activeStop?.category === "flower_field";
  const steps      = navRoute.steps ?? [];

  // Geschatte resterende afstand & ETA
  const doneFraction   = navRoute.stops.length > 0 ? visited.size / navRoute.stops.length : 0;
  const distRemaining  = Math.round(navRoute.distanceKm * (1 - doneFraction) * 1000);
  const etaMinutes     = Math.max(1, Math.round(navRoute.durationMinutes * (1 - doneFraction)));

  // Huidige stap (dichtstbijzijnde niet-gepasseerde step)
  const activeStep = steps[currentStep] ?? null;

  // ── GPS ────────────────────────────────────────────────────────────────────

  const checkGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const hdg = pos.coords.heading;

        setUserPos([lat, lng]);
        if (hdg !== null && !isNaN(hdg)) setHeading(hdg);

        if (activeStop) {
          const d = haversineDistance(lat, lng, activeStop.lat, activeStop.lng);
          setDistToStop(Math.round(d));
          if (d <= ARRIVAL_RADIUS) {
            // Inline arrival — vermijdt circulaire useCallback-afhankelijkheid
            setVisited((prev) => {
              const next = new Set([...Array.from(prev), currentStop]);
              const nextIdx = navRoute.stops.findIndex((_, i) => !next.has(i));
              if (nextIdx === -1) setFinished(true);
              else { setCurrentStop(nextIdx); setCurrentStep(0); setDistToStop(null); }
              return next;
            });
          }
        }

        // Stap-tracking: zoek dichtstbijzijnde niet-gepasseerde step
        if (steps.length > 0) {
          let nearest = currentStep;
          let nearestDist = Infinity;
          for (let i = currentStep; i < steps.length; i++) {
            const [sLng, sLat] = steps[i].location;
            const d = haversineDistance(lat, lng, sLat, sLng);
            if (d < nearestDist) { nearestDist = d; nearest = i; }
            if (nearestDist < 30) break; // dichtbij genoeg
          }
          if (nearest !== currentStep && nearestDist < 60) {
            setCurrentStep(nearest + 1 < steps.length ? nearest + 1 : nearest);
          }
        }
      },
      () => {},
      { timeout: 8000, maximumAge: 15_000, enableHighAccuracy: true },
    );
  }, [activeStop, currentStop, steps, currentStep]);

  useEffect(() => {
    checkGPS();
    gpsTimerRef.current = setInterval(checkGPS, GPS_INTERVAL_MS);
    return () => { if (gpsTimerRef.current) clearInterval(gpsTimerRef.current); };
  }, [checkGPS]);

  // ── Acties ─────────────────────────────────────────────────────────────────

  function handleMarkArrived(idx: number) {
    const next = new Set([...Array.from(visited), idx]);
    setVisited(next);
    const nextIdx = navRoute.stops.findIndex((_, i) => !next.has(i));
    if (nextIdx === -1) {
      setFinished(true);
    } else {
      setCurrentStop(nextIdx);
      setCurrentStep(0);
      setDistToStop(null);
    }
  }

  async function handleBloomReport(status: string) {
    if (!activeStop) return;
    setBloomLocal(prev => ({ ...prev, [activeStop.id]: status }));
    setShowBloom(false);

    // Sla op in database (als location_id beschikbaar)
    const locId = activeStop.location_id ?? activeStop.id;
    if (locId) {
      await supabase.from("locations").update({ bloom_status: status }).eq("id", locId);
    }
  }

  // ── Voltooid-scherm ────────────────────────────────────────────────────────

  if (finished) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 18 }}
          className="text-7xl mb-5 select-none"
        >
          🌷
        </motion.div>
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: "var(--color-text)" }}>
          Route voltooid!
        </h2>
        <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>
          {navRoute.stops.length} stops · {navRoute.distanceKm} km
        </p>
        <p className="text-base font-extrabold mb-10 text-tulip-500">
          Goed gedaan!
        </p>
        <button
          onClick={() => router.push(`/${locale}/home`)}
          className="w-full max-w-sm py-4 rounded-2xl text-white font-extrabold text-base active:scale-[0.97] transition-transform bg-tulip-500"
        >
          Terug naar home
        </button>
      </div>
    );
  }

  const ModeIcon = navRoute.mode === "bike" ? Bike : navRoute.mode === "car" ? Car : Footprints;
  const reportedBloom = activeStop ? bloomLocal[activeStop.id] : null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* ── Instructie-balk (boven) ──────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 pt-safe-top" style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: "#E8102A" }}
        >
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            {/* Maneuver-icoon */}
            <div className="w-12 h-12 rounded-xl bg-white/25 flex items-center justify-center flex-shrink-0 text-white">
              {activeStep
                ? <ManeuverIcon type={activeStep.type} modifier={activeStep.modifier} size={22} />
                : <Navigation size={22} />}
            </div>

            {/* Instructie-tekst */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-extrabold text-lg leading-tight truncate">
                {activeStep?.streetName || activeStop?.name || navRoute.name}
              </p>
              <p className="text-white/80 text-sm font-semibold mt-0.5">
                {distToStop !== null
                  ? formatDist(distToStop)
                  : activeStep
                    ? formatDist(activeStep.distance)
                    : ""}
              </p>
            </div>

            {/* Sluit-knop */}
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-white flex-shrink-0 active:scale-90 transition-transform"
            >
              <X size={18} />
            </button>
          </div>

          {/* Volgende stop preview */}
          {navRoute.stops[currentStop + 1] && (
            <div className="px-4 pb-2.5 flex items-center gap-1.5">
              <span className="text-white/60 text-[11px] font-medium">Daarna →</span>
              <span className="text-white/90 text-[11px] font-bold truncate">
                {navRoute.stops[currentStop + 1].name}
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Kaart (volledig scherm) ──────────────────────────────────────── */}
      <div className="flex-1 relative">
        <NavigationMap
          geometry={navRoute.geometry}
          stops={navRoute.stops}
          activeStopIdx={currentStop}
          visitedStops={visited}
          userPos={userPos}
          heading={heading}
        />

        {/* Bloom-status widget (alleen bollenvelden) */}
        {isFlower && (
          <div className="absolute bottom-4 left-3 z-30">
            <AnimatePresence mode="wait">
              {showBloom ? (
                <motion.div
                  key="picker"
                  initial={{ opacity: 0, scale: 0.92, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 8 }}
                  transition={{ duration: 0.15 }}
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
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleBloomReport(opt.value)}
                      className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 mb-1"
                      style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text)" }}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowBloom(false)}
                    className="w-full py-1.5 text-xs font-medium rounded-lg"
                    style={{ color: "var(--color-text-3)" }}
                  >
                    Annuleren
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="pill"
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
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

        {/* Stop-teller / lijst-knop */}
        <button
          type="button"
          onClick={() => setShowList(true)}
          className="absolute bottom-4 right-3 z-30 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-sm font-semibold active:scale-95 transition-transform"
          style={{
            backgroundColor: "var(--color-surface-2)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
          }}
        >
          <List size={14} style={{ color: "var(--color-text-3)" }} />
          <span className="font-extrabold text-tulip-500">{currentStop + 1}</span>
          <span style={{ color: "var(--color-text-3)" }}>/ {navRoute.stops.length}</span>
        </button>
      </div>

      {/* ── Onderste balk ───────────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center px-4 py-3 gap-3">
            {/* Modus-icoon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "var(--color-surface-3)" }}
            >
              <ModeIcon size={18} className="text-tulip-500" />
            </div>

            {/* Afstand + ETA */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-extrabold leading-tight" style={{ color: "var(--color-text)" }}>
                {formatDist(distRemaining)}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
                ~{formatETA(etaMinutes)} · stop {currentStop + 1} van {navRoute.stops.length}
              </p>
            </div>

            {/* Aftekenen-knop */}
            <button
              type="button"
              onClick={() => handleMarkArrived(currentStop)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-sm font-bold active:scale-95 transition-transform bg-tulip-500"
            >
              <Check size={15} /> Aftekenen
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Stop-lijst sheet ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showList && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setShowList(false)}
            />
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
                    <div
                      key={stop.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                      style={{
                        backgroundColor: isActive ? "var(--color-surface-3)" : "transparent",
                        border: isActive ? "1.5px solid #E8102A" : "1.5px solid transparent",
                        opacity: isVisited ? 0.5 : 1,
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                        style={{
                          backgroundColor: isVisited ? "#2D7D46"
                            : isActive ? "#E8102A"
                            : "var(--color-border)",
                        }}
                      >
                        {isVisited ? <Check size={13} /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
                          {stop.name}
                        </p>
                        {isActive && (
                          <p className="text-xs font-bold text-tulip-500">Nu navigeren</p>
                        )}
                      </div>
                      {!isVisited && !isActive && (
                        <ChevronRight size={14} style={{ color: "var(--color-text-3)" }} />
                      )}
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
