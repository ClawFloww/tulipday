"use client";

// Volledig-scherm navigatie UI — voor fietsers, automobilisten en wandelaars
// GPS via watchPosition + refs voor vloeiend bijhouden zonder useCallback-loops

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight,
  RotateCcw, Navigation, Navigation2, Flag, Bike, Car, Footprints,
  Flower2, Camera, Check, ChevronRight, Layers, Locate, Route as RouteIcon,
} from "lucide-react";
import { haversineDistance } from "@/lib/tulipFields";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n-context";

import TopProgressPill from "./TopProgressPill";
import MapsPickerSheet from "./MapsPickerSheet";
import PhotoUploadSheet from "@/components/ui/PhotoUploadSheet";

const NavigationMap = dynamic(() => import("./NavigationMap"), { ssr: false });

type MapStyle = "streets" | "satellite";

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
  const { t } = useT();

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
  const [showList,        setShowList]        = useState(false);
  const [showBloom,       setShowBloom]       = useState(false);
  const [showMapsPicker,  setShowMapsPicker]  = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [mapStyle,        setMapStyle]        = useState<MapStyle>("streets");
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
        <h2 className="text-2xl font-extrabold mb-2" style={{ color: "var(--color-text)" }}>{t("active_route.completed")}</h2>
        <p className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}>
          {navRoute.stops.length} stops · {navRoute.distanceKm} km
        </p>
        <p className="text-base font-extrabold mb-10 text-tulip-500">{t("active_route.well_done")}</p>
        <button onClick={() => router.push(`/${locale}/home`)}
                className="w-full max-w-sm py-4 rounded-2xl text-white font-extrabold text-base active:scale-[0.97] transition-transform bg-tulip-500">
          {t("common.back_home")}
        </button>
      </div>
    );
  }

  const ModeIcon      = navRoute.mode === "bike" ? Bike : navRoute.mode === "car" ? Car : Footprints;
  const reportedBloom = activeStop ? bloomLocal[activeStop.id] : null;

  // ── Inhoud voor de bovenste voortgang-pil ────────────────────────────────
  // Drie content-modi: aanrijdroute / hoofdroute met turn-by-turn step /
  // hoofdroute zonder step (initiële weergave of tussen stops in).
  const stopOfTotal = t("navigation.stop_of_total", { current: currentStop + 1, total: navRoute.stops.length });
  let pillIcon: React.ReactNode;
  let pillTitle: string;
  let pillSubtitle: string;

  if (approachPhase) {
    pillIcon = activeApproachStep
      ? <ManeuverIcon type={activeApproachStep.type} modifier={activeApproachStep.modifier} size={18} />
      : <Navigation size={18} />;
    pillTitle = activeApproachStep?.streetName || t("navigation.to_start");
    const distLabel = distToStart !== null
      ? formatDist(distToStart)
      : activeApproachStep
        ? formatDist(activeApproachStep.distance)
        : t("navigation.approach_calculated");
    pillSubtitle = `${distLabel} · ${t("navigation.then_begins_named", { name: navRoute.name })}`;
  } else if (activeStep) {
    pillIcon = <ManeuverIcon type={activeStep.type} modifier={activeStep.modifier} size={18} />;
    pillTitle = activeStep.streetName || activeStop?.name || navRoute.name;
    const distLabel = distToStop !== null
      ? formatDist(distToStop)
      : formatDist(activeStep.distance);
    pillSubtitle = `${distLabel} · ${stopOfTotal}`;
  } else {
    pillIcon = <Navigation2 size={18} />;
    pillTitle = activeStop
      ? t("navigation.next_stop_named", { name: activeStop.name })
      : navRoute.name;
    const distLabel = distToStop !== null
      ? formatDist(distToStop)
      : gpsStatus === "waiting" ? t("navigation.locating") : "—";
    pillSubtitle = `${distLabel} · ${stopOfTotal}`;
  }

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
            <p className="text-white font-bold text-base">{t("navigation.locating")}</p>
            <p className="text-white/60 text-sm">{t("navigation.enable_gps")}</p>
          </motion.div>
        )}
        {gpsStatus === "denied" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 px-8 bg-black/70"
          >
            <Locate size={40} className="text-white" />
            <p className="text-white font-extrabold text-lg text-center">{t("navigation.no_gps_title")}</p>
            <p className="text-white/70 text-sm text-center">
              {t("navigation.no_gps_body")}
            </p>
            <button onClick={() => router.back()}
                    className="mt-2 px-6 py-3 rounded-2xl bg-white text-tulip-600 font-bold">
              {t("common.back")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Voortgang-pil (boven) ────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3"
           style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
        <TopProgressPill
          icon={pillIcon}
          title={pillTitle}
          subtitle={pillSubtitle}
          stops={navRoute.stops}
          currentIdx={currentStop}
          visited={visited}
          approachPhase={approachPhase}
          onClose={() => router.back()}
        />
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
          mapStyle={mapStyle}
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

        {/* Kaart-lagen toggle (rechts) */}
        <button
          type="button"
          onClick={() => setMapStyle((s) => (s === "streets" ? "satellite" : "streets"))}
          className="absolute top-24 right-3 z-30 w-10 h-10 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
          style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
          aria-label={t("navigation.layers_toggle")}
        >
          <Layers size={18} style={{ color: mapStyle === "satellite" ? "#E8102A" : "var(--color-text-2)" }} />
        </button>
      </div>

      {/* ── Bottom sheet — focus op huidige stop + acties ──────────────── */}
      <motion.div
        initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl shadow-2xl"
        style={{
          backgroundColor: "var(--color-surface-2)",
          borderTop: "1px solid var(--color-border)",
          paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        }}
      >
        {/* Drag handle — togglet stoplijst */}
        <button
          type="button"
          onClick={() => setShowList((v) => !v)}
          className="w-full flex justify-center pt-2.5 pb-1"
          aria-label={showList ? t("navigation.hide_stops") : t("navigation.show_stops")}
        >
          <span className="block w-9 h-1 rounded-full" style={{ backgroundColor: "var(--color-border)" }} />
        </button>

        {/* Stop card */}
        <div className="px-5 pb-3">
          <p className="text-[11px] font-extrabold tracking-wider uppercase text-tulip-500 mb-1">
            {approachPhase ? t("navigation.to_start") : t("navigation.next_stop_label")}
          </p>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-lg font-extrabold truncate" style={{ color: "var(--color-text)" }}>
              {approachPhase ? navRoute.name : (activeStop?.name ?? navRoute.name)}
            </p>
            <p className="text-sm font-bold flex-shrink-0" style={{ color: "var(--color-text-3)" }}>
              {approachPhase
                ? (distToStart !== null ? formatDist(distToStart) : "—")
                : (distToStop  !== null ? formatDist(distToStop)  : `${formatETA(etaMinutes)} · ${formatDist(distRemaining)}`)}
            </p>
          </div>

          {/* Bloeistatus-regel (alleen bollenvelden) */}
          {isFlower && !approachPhase && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs" style={{ color: "var(--color-text-2)" }}>
              <span
                className="block w-2 h-2 rounded-full"
                style={{
                  backgroundColor: reportedBloom === "in_bloom" || activeStop?.bloom_status === "peak" || activeStop?.bloom_status === "blooming"
                    ? "#2D7D46"
                    : reportedBloom === "fading" || activeStop?.bloom_status === "early"
                      ? "#FF9800"
                      : reportedBloom === "finished" || activeStop?.bloom_status === "ending"
                        ? "#9E9E9E"
                        : "var(--color-border)",
                }}
              />
              <span>
                {reportedBloom === "in_bloom" ? t("navigation.reported_in_bloom")
                  : reportedBloom === "fading" ? t("navigation.reported_fading")
                  : reportedBloom === "finished" ? t("navigation.reported_finished")
                  : t("navigation.bloom_unknown")}
              </span>
            </div>
          )}
        </div>

        {/* Primary CTA — Navigeer met kaart-app */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setShowMapsPicker(true)}
            className="w-full bg-tulip-500 text-white py-3.5 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ boxShadow: "0 6px 18px rgba(232,16,42,0.32)" }}
          >
            <Navigation2 size={18} />
            {t("navigation.navigate_with_maps")}
          </button>
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-4 gap-2 px-3 pb-3">
          <ActionButton
            icon={<Flower2 size={18} className="text-tulip-500" />}
            label={t("navigation.action_bloom")}
            disabled={!isFlower || approachPhase}
            onClick={() => setShowBloom(true)}
          />
          <ActionButton
            icon={<Camera size={18} />}
            label={t("navigation.action_photo")}
            disabled={!activeStop || approachPhase}
            onClick={() => setShowPhotoUpload(true)}
          />
          <ActionButton
            icon={<Check size={18} />}
            label={t("common.check_in")}
            disabled={approachPhase}
            onClick={() => handleMarkArrived(currentStop)}
          />
          <ActionButton
            icon={<RouteIcon size={18} />}
            label={t("navigation.action_all_stops")}
            onClick={() => setShowList((v) => !v)}
            active={showList}
          />
        </div>

        {/* Modus-indicator klein */}
        <div className="flex items-center justify-center gap-1.5 pb-3 text-[11px]" style={{ color: "var(--color-text-3)" }}>
          <ModeIcon size={11} />
          <span>{formatDist(distRemaining)} · ~{formatETA(etaMinutes)}</span>
        </div>

        {/* Expandable stoplijst */}
        <AnimatePresence initial={false}>
          {showList && (
            <motion.div
              key="stoplist"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <div className="max-h-[40vh] overflow-y-auto py-2">
                {navRoute.stops.map((stop, idx) => {
                  const isVisited = visited.has(idx);
                  const isActive  = idx === currentStop;
                  return (
                    <div key={stop.id}
                         className="flex items-center gap-3 px-5 py-3"
                         style={{
                           backgroundColor: isActive ? "var(--color-surface-3)" : "transparent",
                           borderLeft: isActive ? "3px solid #E8102A" : "3px solid transparent",
                           opacity: isVisited ? 0.6 : 1,
                         }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                           style={{ backgroundColor: isVisited ? "#2D7D46" : isActive ? "#E8102A" : "var(--color-border)" }}>
                        {isVisited ? <Check size={13} /> : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{stop.name}</p>
                        {isActive && <p className="text-[11px] font-bold text-tulip-500">{t("navigation.navigate_now")}</p>}
                      </div>
                      {!isVisited && !isActive && <ChevronRight size={14} style={{ color: "var(--color-text-3)" }} />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Bloei-melden modal (verhuisd uit floating widget) ─────────── */}
      <AnimatePresence>
        {showBloom && activeStop && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowBloom(false)}
            className="fixed inset-0 z-[55] bg-black/50 flex items-end sm:items-center justify-center px-3 pb-3"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-5"
              style={{ backgroundColor: "var(--color-surface-2)" }}
            >
              <p className="text-[11px] font-extrabold tracking-wider uppercase text-tulip-500 mb-1">
                {t("navigation.report_bloom")}
              </p>
              <p className="text-lg font-extrabold mb-4 truncate" style={{ color: "var(--color-text)" }}>
                {activeStop.name}
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { value: "in_bloom", label: t("navigation.bloom_in_bloom"), color: "#2D7D46" },
                  { value: "fading",   label: t("navigation.bloom_fading"),   color: "#FF9800" },
                  { value: "finished", label: t("navigation.bloom_finished"), color: "#9E9E9E" },
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => handleBloomReport(opt.value)}
                          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left text-sm font-semibold active:scale-[0.99] transition-transform"
                          style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text)" }}>
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                    <span>{opt.label}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setShowBloom(false)}
                        className="w-full py-3 text-sm font-bold mt-1 text-tulip-500">
                  {t("common.cancel")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Maps picker (Google / Apple / Komoot) ─────────────────────── */}
      {showMapsPicker && activeStop && !approachPhase && (
        <MapsPickerSheet
          stop={activeStop}
          mode={navRoute.mode}
          onClose={() => setShowMapsPicker(false)}
        />
      )}
      {showMapsPicker && approachPhase && navRoute.geometry[0] && (
        <MapsPickerSheet
          stop={{
            id: "approach-start",
            name: navRoute.name,
            lat: navRoute.geometry[0][1],
            lng: navRoute.geometry[0][0],
            category: "route_start",
          }}
          mode={navRoute.mode}
          onClose={() => setShowMapsPicker(false)}
        />
      )}

      {/* ── Foto-upload sheet ─────────────────────────────────────────── */}
      {showPhotoUpload && activeStop && (
        <PhotoUploadSheet
          locationId={activeStop.location_id ?? activeStop.id}
          onClose={() => setShowPhotoUpload(false)}
          onUploaded={() => setShowPhotoUpload(false)}
        />
      )}
    </div>
  );
}

// ─── Compacte secundaire actie-knop ─────────────────────────────────────────

function ActionButton({
  icon, label, onClick, disabled, active,
}: {
  icon:     React.ReactNode;
  label:    string;
  onClick:  () => void;
  disabled?: boolean;
  active?:   boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
      style={{
        backgroundColor: active ? "var(--color-surface-3)" : "var(--color-surface-3)",
        color: "var(--color-text)",
        outline: active ? "1.5px solid #E8102A" : "none",
      }}
    >
      {icon}
      <span className="truncate max-w-full">{label}</span>
    </button>
  );
}
