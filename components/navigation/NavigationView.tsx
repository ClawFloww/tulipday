"use client";

// Volledig-scherm navigatie UI — voor fietsers, automobilisten en wandelaars
// GPS via watchPosition + refs voor vloeiend bijhouden zonder useCallback-loops

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight,
  RotateCcw, Navigation, Flag,
  Flower2, Layers, Locate, Volume2, VolumeX,
} from "lucide-react";
import { haversineDistance } from "@/lib/tulipFields";
import { snapToPolyline } from "@/lib/routeSnapping";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n-context";
import {
  speak as speakInstruction, cancelSpeech,
  getVoiceEnabled, setVoiceEnabled as persistVoiceEnabled,
  isVoiceSupported,
} from "@/lib/speech";

import ManeuverBanner from "./ManeuverBanner";
import ThenPreview from "./ThenPreview";
import SpeedIndicator from "./SpeedIndicator";
import NavigationActionSheet from "./NavigationActionSheet";
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
const SNAP_THRESHOLD = 30; // meter — binnen deze afstand snappen we de gebruiker-dot aan de route

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
  const [sheetExpanded,   setSheetExpanded]   = useState(false);
  const [showBloom,       setShowBloom]       = useState(false);
  const [showMapsPicker,  setShowMapsPicker]  = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [mapStyle,        setMapStyle]        = useState<MapStyle>("streets");
  const [voiceEnabled,    setVoiceEnabled]    = useState(false);
  const [speed,           setSpeed]           = useState<number | null>(null); // m/s
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

  // Laad opgeslagen spraak-voorkeur bij mount
  useEffect(() => {
    if (isVoiceSupported()) setVoiceEnabled(getVoiceEnabled());
    return () => cancelSpeech(); // stop bij unmount
  }, []);

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
        // Snelheid in m/s — null als GPS geen snelheid levert (bv. eerste fix)
        setSpeed(pos.coords.speed);

        // Snap-to-route voor stabielere blauwe dot + betrouwbare heading.
        // Tijdens approach gebruiken we de approach-geometrie (van startpunt
        // naar eerste stop), anders de hoofdroute. Snap-distance > drempel
        // → val terug op rauwe GPS-waarden (gebruiker is off-route).
        const activeGeom = approachPhaseRef.current
          ? (navRoute.approachGeometry ?? null)
          : navRoute.geometry;
        let displayLat = lat;
        let displayLng = lng;
        let displayHeading: number | null = null;
        if (activeGeom && activeGeom.length >= 2) {
          const snap = snapToPolyline(lat, lng, activeGeom);
          if (snap && snap.distance < SNAP_THRESHOLD) {
            displayLat     = snap.lat;
            displayLng     = snap.lng;
            displayHeading = snap.heading;
          }
        }
        setUserPos([displayLat, displayLng]);
        if (displayHeading !== null) {
          setHeading(displayHeading);
        } else if (hdg !== null && !isNaN(hdg)) {
          setHeading(hdg);
        }

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

  // ── Spraak-instructie bij step-wissel ──────────────────────────────────────
  // Bouwt een korte zin uit het OSRM step-type/modifier en spreekt hem uit
  // via Web Speech API. Cancel-on-new gedrag voorkomt overlap.
  function buildVoiceText(step: NavStep): string {
    const street = step.streetName || "";
    if (step.type === "arrive")            return t("navigation.voice_arrive");
    if (step.type === "depart")            return t("navigation.voice_depart", { street });
    switch (step.modifier) {
      case "left":         return t("navigation.voice_left",         { street });
      case "sharp left":   return t("navigation.voice_sharp_left",   { street });
      case "slight left":  return t("navigation.voice_slight_left",  { street });
      case "right":        return t("navigation.voice_right",        { street });
      case "sharp right":  return t("navigation.voice_sharp_right",  { street });
      case "slight right": return t("navigation.voice_slight_right", { street });
      case "uturn":        return t("navigation.voice_uturn");
      default:             return t("navigation.voice_continue",     { street });
    }
  }

  useEffect(() => {
    if (!voiceEnabled) return;
    const step = approachPhase ? activeApproachStep : activeStep;
    if (!step) return;
    speakInstruction(buildVoiceText(step), locale);
    // buildVoiceText gebruikt t() — t verandert niet tijdens een sessie
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, currentApproachStep, approachPhase, voiceEnabled]);

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

  const reportedBloom = activeStop ? bloomLocal[activeStop.id] : null;

  // ── Inhoud voor de ManeuverBanner + ThenPreview ──────────────────────────
  let maneuverIconNode: React.ReactNode;
  let maneuverStreet:   string;
  let maneuverDistance: string;

  if (approachPhase) {
    maneuverIconNode = activeApproachStep
      ? <ManeuverIcon type={activeApproachStep.type} modifier={activeApproachStep.modifier} size={32} />
      : <Navigation size={32} />;
    maneuverStreet = activeApproachStep?.streetName || t("navigation.to_start");
    maneuverDistance = distToStart !== null
      ? formatDist(distToStart)
      : activeApproachStep
        ? formatDist(activeApproachStep.distance)
        : t("navigation.approach_calculated");
  } else if (activeStep) {
    maneuverIconNode = <ManeuverIcon type={activeStep.type} modifier={activeStep.modifier} size={32} />;
    maneuverStreet   = activeStep.streetName || activeStop?.name || navRoute.name;
    maneuverDistance = distToStop !== null ? formatDist(distToStop) : formatDist(activeStep.distance);
  } else {
    maneuverIconNode = <Navigation size={32} />;
    maneuverStreet   = activeStop?.name ?? navRoute.name;
    maneuverDistance = distToStop !== null
      ? formatDist(distToStop)
      : gpsStatus === "waiting" ? t("navigation.locating") : "—";
  }

  // ThenPreview: volgende OSRM step (of volgende stop, of approach → route)
  const nextStep    = approachPhase
    ? approachSteps[currentApproachStep + 1]
    : steps[currentStep + 1];
  const nextStop    = navRoute.stops[currentStop + 1];
  let thenIconNode: React.ReactNode | null = null;
  let thenText:     string | null = null;
  if (nextStep) {
    thenIconNode = <ManeuverIcon type={nextStep.type} modifier={nextStep.modifier} size={14} />;
    thenText     = nextStep.streetName || t("navigation.continue_label");
  } else if (!approachPhase && nextStop) {
    thenIconNode = <Flag size={14} />;
    thenText     = nextStop.name;
  } else if (approachPhase) {
    thenIconNode = <Flag size={14} />;
    thenText     = navRoute.name;
  }

  // Onderkant — afgeleide waarden voor de ActionSheet
  const arrivalTime = (() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + etaMinutes);
    return now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  })();

  function handleToggleVoice() {
    if (!isVoiceSupported()) return;
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    persistVoiceEnabled(next);
    if (!next) cancelSpeech();
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

      {/* ── ManeuverBanner + ThenPreview (boven) ─────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3"
           style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}>
        <ManeuverBanner
          icon={maneuverIconNode}
          distanceLabel={maneuverDistance}
          streetName={maneuverStreet}
          approachPhase={approachPhase}
          onClose={() => router.back()}
        />
        {thenText && thenIconNode && (
          <ThenPreview
            icon={thenIconNode}
            label={t("navigation.after_that_label")}
            text={thenText}
          />
        )}
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

        {/* Floating column rechts: Recenter / Layers / Volume / Bloei */}
        <div
          className="absolute right-3 z-30 flex flex-col gap-2"
          style={{ top: "calc(max(env(safe-area-inset-top), 12px) + 120px)" }}
        >
          <AnimatePresence>
            {!locked && userPos && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={() => setLocked(true)}
                className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
                style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                aria-label={t("navigation.recenter")}
              >
                <Locate size={18} className="text-tulip-500" />
              </motion.button>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setMapStyle((s) => (s === "streets" ? "satellite" : "streets"))}
            className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
            style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
            aria-label={t("navigation.layers_toggle")}
          >
            <Layers size={18} style={{ color: mapStyle === "satellite" ? "#E8102A" : "var(--color-text-2)" }} />
          </button>

          {isVoiceSupported() && (
            <button
              type="button"
              onClick={handleToggleVoice}
              className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
              aria-label={voiceEnabled ? t("navigation.voice_off") : t("navigation.voice_on")}
            >
              {voiceEnabled
                ? <Volume2 size={18} className="text-tulip-500" />
                : <VolumeX size={18} style={{ color: "var(--color-text-3)" }} />}
            </button>
          )}

          {isFlower && !approachPhase && (
            <button
              type="button"
              onClick={() => setShowBloom(true)}
              className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
              style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
              aria-label={t("navigation.report_bloom")}
            >
              <Flower2 size={18} className="text-tulip-500" />
            </button>
          )}
        </div>

        {/* SpeedIndicator linksonder */}
        <div
          className="absolute left-3 z-30"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)" }}
        >
          <SpeedIndicator speedMps={speed} />
        </div>
      </div>

      {/* ── Bottom action sheet (collapsed ETA / expanded acties+stops) ── */}
      <NavigationActionSheet
        etaMinutes={etaMinutes}
        distanceLabel={formatDist(distRemaining)}
        arrivalTime={arrivalTime}
        expanded={sheetExpanded}
        onToggle={() => setSheetExpanded((v) => !v)}
        activeStop={activeStop}
        approachPhase={approachPhase}
        routeName={navRoute.name}
        stops={navRoute.stops}
        currentIdx={currentStop}
        visited={visited}
        isFlower={isFlower}
        reportedBloom={reportedBloom ?? null}
        onReportBloom={() => setShowBloom(true)}
        onTakePhoto={() => setShowPhotoUpload(true)}
        onMarkArrived={() => handleMarkArrived(currentStop)}
        onOpenMapsPicker={() => setShowMapsPicker(true)}
        t={t}
      />

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

