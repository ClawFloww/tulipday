"use client";

// Volledig-scherm turn-by-turn navigatie (fiets, wandel, auto).
// Elke GPS-fix wordt langs de actieve lijn gevolgd (lib/navigation/tracker):
// de hoofdroute, of een aanrij-/terugleidroute ("leg") van OSRM. Daaruit
// volgen de eerstvolgende afslag, resterende afstand en tijd, off-route-
// herberekening, aankomst bij stops en gesproken instructies.

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  ArrowUp, ArrowLeft, ArrowRight, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight,
  RotateCcw, RefreshCw, Navigation, Flag, Flower2, Layers, Locate, LocateOff, Volume2, VolumeX, SignalLow,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n-context";
import { track } from "@/lib/analytics";
import { tap, success as hapticSuccess } from "@/lib/haptics";
import { speak, cancelSpeech, getVoiceEnabled, setVoiceEnabled as persistVoiceEnabled, isVoiceSupported } from "@/lib/speech";
import { bearingAt, distanceM, pointAt, project, type LngLat, type NavLine } from "@/lib/navigation/geometry";
import { maneuverKey, nextManeuverIndex, roundDistance, type Maneuver, type ManeuverKind } from "@/lib/navigation/maneuvers";
import { fetchOsrmRoute, type RoutedLine, type TravelMode } from "@/lib/navigation/osrm";
import { initialTrackState, trackFix, OFF_ROUTE_M, type TrackState } from "@/lib/navigation/tracker";
import { keepScreenOn } from "@/lib/navigation/wakeLock";

import ManeuverBanner from "./ManeuverBanner";
import ThenPreview from "./ThenPreview";
import SpeedIndicator from "./SpeedIndicator";
import NavigationActionSheet from "./NavigationActionSheet";
import MapsPickerSheet from "./MapsPickerSheet";
import PhotoUploadSheet from "@/components/ui/PhotoUploadSheet";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { toast } from "@/components/ui/Toast";
import type { MapStyle, PuckFix } from "./NavigationMap";

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

export interface NavRoute {
  name:            string;
  mode:            TravelMode;
  stops:           NavStop[];
  /** Hoofdroute; bij presetroutes de ongewijzigde BRouter-lijn. */
  line:            NavLine;
  maneuvers:       Maneuver[];
  /** Geschatte duur van de hoofdroute; 0 = onbekend. */
  durationMinutes: number;
  /** Aanrijroute van het startpunt naar het begin van de route. */
  approach:        RoutedLine | null;
}

type Leg = RoutedLine & { kind: "approach" | "rejoin"; joinAlong: number; id: number };

type Progress = {
  onLeg:    boolean;
  /** Plek langs de actieve lijn (leg of hoofdroute). */
  along:    number;
  mainAlong: number;
  offset:   number;
  rerouting: boolean;
};

// ─── Instellingen per vervoer ────────────────────────────────────────────────

const MODE = {
  walk: { speed: 1.3,  zoom: 17.6, far: 100, near: 20, approachField: 150 },
  bike: { speed: 4.2,  zoom: 17.1, far: 200, near: 40, approachField: 200 },
  car:  { speed: 10,   zoom: 16.2, far: 500, near: 80, approachField: 400 },
} as const;

const ARRIVE_STOP_M    = 60;   // zo dichtbij een stop telt als aangekomen
const PASSED_STOP_M    = 120;  // zo ver voorbij een stop langs de route: overgeslagen
const FINISH_M         = 30;
const REJOIN_AHEAD_M   = 40;   // terugleiden naar iets vóór je, niet naar achter je
const REROUTE_COOLDOWN = 12_000;
const WEAK_ACCURACY_M  = 50;
const SIGNAL_LOST_MS   = 15_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MANEUVER_ICON: Record<ManeuverKind, typeof ArrowUp> = {
  depart: Navigation, straight: ArrowUp, arrive: Flag, uturn: RotateCcw, roundabout: RefreshCw,
  slight_left: ArrowUpLeft, left: ArrowLeft, sharp_left: CornerUpLeft,
  slight_right: ArrowUpRight, right: ArrowRight, sharp_right: CornerUpRight,
};

function ManeuverIcon({ kind, size }: { kind: ManeuverKind; size: number }) {
  const Icon = MANEUVER_ICON[kind];
  return <Icon size={size} strokeWidth={2.6} aria-hidden />;
}

/** Tijd langs de route: met de opgegeven routeduur als die er is, anders gemiddelde snelheid. */
function secondsFor(meters: number, line: NavLine, totalSeconds: number, mode: TravelMode) {
  if (totalSeconds > 0 && line.length > 0) return (meters / line.length) * totalSeconds;
  return meters / MODE[mode].speed;
}

// ─── Hoofd-component ─────────────────────────────────────────────────────────

export default function NavigationView({ navRoute, locale }: { navRoute: NavRoute; locale: string }) {
  const router = useRouter();
  const { t }  = useT();
  const main   = navRoute.line;
  const cfg    = MODE[navRoute.mode];

  // Plek van elke stop langs de hoofdroute, op volgorde (rondjes komen langs dezelfde plek)
  const stopAlong = useMemo(() => {
    let min = 0;
    return navRoute.stops.map((s) => {
      const p = project(main, [s.lng, s.lat], min);
      if (!p || p.offset > 150) return null;
      min = p.along;
      return p.along;
    });
  }, [main, navRoute.stops]);

  // ── Staat ────────────────────────────────────────────────────────────────
  const [leg,        setLeg]        = useState<Leg | null>(() =>
    navRoute.approach ? { ...navRoute.approach, kind: "approach", joinAlong: 0, id: 1 } : null);
  const [progress,   setProgress]   = useState<Progress | null>(null);
  const [fix,        setFix]        = useState<PuckFix | null>(null);
  const [speed,      setSpeed]      = useState<number | null>(null);
  const [accuracy,   setAccuracy]   = useState<number | null>(null);
  const [visited,    setVisited]    = useState<Set<number>>(new Set());
  const [finished,   setFinished]   = useState(false);
  const [gpsStatus,  setGpsStatus]  = useState<"waiting" | "active" | "lost" | "denied" | "unsupported">("waiting");
  const [locked,     setLocked]     = useState(true);

  const [sheetExpanded,   setSheetExpanded]   = useState(false);
  const [showBloom,       setShowBloom]       = useState(false);
  const [showMapsPicker,  setShowMapsPicker]  = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [mapStyle,        setMapStyle]        = useState<MapStyle>("streets");
  const [voiceEnabled,    setVoiceEnabled]    = useState(false);
  const [bloomLocal,      setBloomLocal]      = useState<Record<string, string>>({});

  // Refs voor de GPS-callback (die wordt één keer geregistreerd)
  const legRef       = useRef(leg);
  const mainTrack    = useRef<TrackState>(initialTrackState);
  const legTrack     = useRef<TrackState>(initialTrackState);
  const visitedRef   = useRef(visited);
  const finishedRef  = useRef(false);
  const lastBearing  = useRef(0);
  const lastFixAt    = useRef(0);
  const rerouting    = useRef(false);
  const lastReroute  = useRef(0);
  const legIds       = useRef(1);
  const alertedStops = useRef(new Set<number>());
  const spoken       = useRef(new Set<string>());
  useEffect(() => { legRef.current = leg; }, [leg]);
  useEffect(() => { visitedRef.current = visited; }, [visited]);

  const currentStop = navRoute.stops.findIndex((_, i) => !visited.has(i));
  const activeStop  = currentStop === -1 ? null : navRoute.stops[currentStop];
  const isFlower    = activeStop?.category === "flower_field";

  // ── Tekst ────────────────────────────────────────────────────────────────
  const formatDistance = (m: number) => {
    const { value, unit } = roundDistance(m);
    return `${value.toLocaleString(locale)} ${unit}`;
  };
  const spokenDistance = (m: number) => {
    const { value, unit } = roundDistance(m);
    return t(unit === "km" ? "navigation.dist_km" : "navigation.dist_m", { n: value.toLocaleString(locale) });
  };
  const actionText = (m: Maneuver) => t(maneuverKey(m), { exit: m.exit ?? "" });
  const fullInstruction = (m: Maneuver) =>
    m.street && m.kind !== "arrive" ? t("navigation.onto_street", { action: actionText(m), street: m.street }) : actionText(m);

  // ── Opstart: scherm aan, spraakvoorkeur, event ──────────────────────────
  useEffect(() => {
    if (isVoiceSupported()) setVoiceEnabled(getVoiceEnabled());
    const release = keepScreenOn();
    track("nav_start", { mode: navRoute.mode, stops: navRoute.stops.length, approach: navRoute.approach !== null });
    return () => { release(); cancelSpeech(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Herberekenen: OSRM vanaf hier terug naar de route ───────────────────
  async function reroute(pos: LngLat, current: Leg | null) {
    const now = Date.now();
    if (rerouting.current || now - lastReroute.current < REROUTE_COOLDOWN) return;
    rerouting.current = true;
    lastReroute.current = now;
    setProgress((p) => (p ? { ...p, rerouting: true } : p));
    if (voiceEnabled) speak(t("navigation.rerouting"), locale);

    // Doel: bij aanrijden het begin van de route; anders het dichtstbijzijnde stuk route vóór je
    let joinAlong: number;
    if (current?.kind === "approach") {
      joinAlong = 0;
    } else {
      const base = mainTrack.current.along ?? 0;
      const ahead = project(main, pos, base);
      joinAlong = Math.min(main.length, Math.max(base, ahead?.along ?? base) + REJOIN_AHEAD_M);
    }
    const routed = await fetchOsrmRoute([pos, pointAt(main, joinAlong)], navRoute.mode);
    rerouting.current = false;
    if (finishedRef.current) return;

    if (routed) {
      legIds.current += 1;
      const next: Leg = { ...routed, kind: current?.kind ?? "rejoin", joinAlong, id: legIds.current };
      legRef.current = next;
      legTrack.current = initialTrackState;
      setLeg(next);
      toast.info(t("navigation.rerouted"));
      track("nav_reroute", { mode: navRoute.mode });
    } else {
      toast.error(t("navigation.reroute_failed"));
    }
    setProgress((p) => (p ? { ...p, rerouting: false } : p));
  }

  function leaveLeg(mainAlong: number) {
    legRef.current = null;
    legTrack.current = initialTrackState;
    mainTrack.current = { along: mainAlong, offCount: 0 };
    setLeg(null);
  }

  // ── GPS ──────────────────────────────────────────────────────────────────
  // De callback leest alles via refs; spraak en voorkeur via de ref hieronder
  const voiceRef = useRef(voiceEnabled);
  useEffect(() => { voiceRef.current = voiceEnabled; }, [voiceEnabled]);
  const handlerRef = useRef<(pos: GeolocationPosition) => void>(() => undefined);

  handlerRef.current = (geo: GeolocationPosition) => {
    if (finishedRef.current) return;
    const pos: LngLat = [geo.coords.longitude, geo.coords.latitude];
    const acc = Number.isFinite(geo.coords.accuracy) ? geo.coords.accuracy : null;
    const spd = geo.coords.speed !== null && Number.isFinite(geo.coords.speed) ? geo.coords.speed : null;
    lastFixAt.current = Date.now();
    setGpsStatus("active");
    setSpeed(spd);
    setAccuracy(acc);

    let currentLeg = legRef.current;

    // Op een leg: terug op de hoofdroute of aan het eind van de leg → leg loslaten
    if (currentLeg) {
      const base = mainTrack.current.along ?? 0;
      const back = project(main, pos, Math.max(0, base - 40), currentLeg.joinAlong + 300);
      const legRes = trackFix(currentLeg.line, pos, acc, legTrack.current);
      const legDone = legRes && legRes.along >= currentLeg.line.length - 25;
      if ((back && back.offset < 15 && (currentLeg.kind === "rejoin" || back.along < 300)) || legDone) {
        leaveLeg(back && back.offset < 30 ? back.along : currentLeg.joinAlong);
        currentLeg = null;
      } else if (legRes) {
        legTrack.current = legRes.state;
        if (legRes.offRoute) reroute(pos, currentLeg);
        const bearing = legRes.onRoute
          ? bearingAt(currentLeg.line, legRes.along)
          : spd !== null && spd > 1.5 && geo.coords.heading !== null ? geo.coords.heading : lastBearing.current;
        lastBearing.current = bearing;
        setFix({ point: legRes.onRoute ? legRes.point : pos, bearing, accuracy: acc, along: legRes.onRoute ? legRes.along : null, onLeg: true });
        setProgress({ onLeg: true, along: legRes.along, mainAlong: currentLeg.joinAlong, offset: legRes.offset, rerouting: rerouting.current });
        return;
      }
    }

    // Hoofdroute
    const res = trackFix(main, pos, acc, mainTrack.current);
    if (!res) return;
    mainTrack.current = res.state;
    if (res.offRoute) reroute(pos, null);

    const bearing = res.onRoute
      ? bearingAt(main, res.along)
      : spd !== null && spd > 1.5 && geo.coords.heading !== null ? geo.coords.heading : lastBearing.current;
    lastBearing.current = bearing;
    setFix({ point: res.onRoute ? res.point : pos, bearing, accuracy: acc, along: res.onRoute ? res.along : null, onLeg: false });
    setProgress({ onLeg: false, along: res.along, mainAlong: res.along, offset: res.offset, rerouting: rerouting.current });

    // Stops: aangekomen, voorbij gereden, of bijna bij een bollenveld
    const nextVisited = new Set(visitedRef.current);
    navRoute.stops.forEach((stop, i) => {
      if (nextVisited.has(i)) return;
      const sa = stopAlong[i];
      const direct = distanceM(pos, [stop.lng, stop.lat]);
      if (direct <= ARRIVE_STOP_M) {
        nextVisited.add(i);
        hapticSuccess();
        toast.success(t("navigation.arrived_at", { name: stop.name }));
        if (voiceRef.current) speak(t("navigation.arrived_at", { name: stop.name }), locale);
        return;
      }
      if (sa === null || !res.onRoute) return;
      if (res.along > sa + PASSED_STOP_M) { nextVisited.add(i); return; }
      const ahead = sa - res.along;
      if (stop.category === "flower_field" && ahead > 0 && ahead <= cfg.approachField && !alertedStops.current.has(i)) {
        alertedStops.current.add(i);
        tap();
        const msg = t("navigation.approaching_field", { name: stop.name, distance: spokenDistance(ahead) });
        toast.info(msg);
        if (voiceRef.current) speak(msg, locale);
      }
    });
    if (nextVisited.size !== visitedRef.current.size) {
      visitedRef.current = nextVisited;
      setVisited(nextVisited);
    }

    // Einde van de route
    if (res.onRoute && res.along >= main.length - FINISH_M) finish();
  };

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("unsupported");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => handlerRef.current(pos),
      (err) => { if (err.code === err.PERMISSION_DENIED) setGpsStatus("denied"); },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 2_000 },
    );
    // Signaal kwijt: al een tijd geen fix meer
    const lostTimer = setInterval(() => {
      if (lastFixAt.current && Date.now() - lastFixAt.current > SIGNAL_LOST_MS) {
        setGpsStatus((s) => (s === "active" ? "lost" : s));
      }
    }, 3000);
    return () => { navigator.geolocation.clearWatch(watchId); clearInterval(lostTimer); };
  }, []);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    hapticSuccess();
    cancelSpeech();
    if (voiceRef.current) speak(t("navigation.m_arrive"), locale);
    track("nav_finish", { mode: navRoute.mode });
  }

  function stopNavigation() {
    track("nav_stop", {
      mode: navRoute.mode,
      progress: main.length > 0 ? Math.round(((progress?.mainAlong ?? 0) / main.length) * 100) : 0,
    });
    router.back();
  }

  // ── Afgeleide waarden voor de weergave ──────────────────────────────────
  const activeManeuvers = leg?.maneuvers ?? navRoute.maneuvers;
  const along           = progress?.along ?? 0;
  const nextIdx         = nextManeuverIndex(activeManeuvers, along);
  const nextManeuver    = activeManeuvers[nextIdx] ?? null;
  const distToNext      = nextManeuver ? Math.max(0, nextManeuver.along - along) : 0;
  const offRoute        = progress !== null && progress.offset > OFF_ROUTE_M;

  const mainSeconds = navRoute.durationMinutes * 60;
  const remainingMain = Math.max(0, main.length - (leg ? leg.joinAlong : (progress?.mainAlong ?? 0)));
  const remainingLeg  = leg ? Math.max(0, leg.line.length - (progress?.onLeg ? along : 0)) : 0;
  const remainingM    = remainingMain + remainingLeg;
  const remainingS    = secondsFor(remainingMain, main, mainSeconds, navRoute.mode)
    + (leg ? secondsFor(remainingLeg, leg.line, leg.durationS, navRoute.mode) : 0);
  const etaMinutes    = Math.max(1, Math.round(remainingS / 60));
  const arrivalTime   = new Date(Date.now() + remainingS * 1000).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  // Zoom: dichterbij bij een afslag, verder weg bij hoge snelheid
  const zoom = cfg.zoom + (distToNext < cfg.near * 3 ? 0.7 : 0) - (speed !== null && speed > 12 ? 0.6 : 0);

  // ── Gesproken instructies ───────────────────────────────────────────────
  useEffect(() => {
    if (!voiceEnabled || !nextManeuver || !progress || offRoute || finished) return;
    const key = `${leg?.id ?? 0}:${nextIdx}`;
    if (distToNext <= cfg.near && !spoken.current.has(`${key}:near`)) {
      spoken.current.add(`${key}:near`).add(`${key}:far`);
      speak(fullInstruction(nextManeuver), locale);
    } else if (distToNext <= cfg.far && distToNext > cfg.near * 1.5 && !spoken.current.has(`${key}:far`)) {
      spoken.current.add(`${key}:far`);
      speak(t("navigation.voice_in", { distance: spokenDistance(distToNext), instruction: fullInstruction(nextManeuver) }), locale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distToNext, nextIdx, leg?.id, voiceEnabled, offRoute, finished]);

  function handleToggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    persistVoiceEnabled(next);
    if (next && nextManeuver) speak(fullInstruction(nextManeuver), locale);
  }

  function handleMarkArrived(idx: number) {
    if (idx < 0) return;
    const next = new Set(visited).add(idx);
    visitedRef.current = next;
    setVisited(next);
    hapticSuccess();
    if (next.size === navRoute.stops.length) finish();
  }

  async function handleBloomReport(status: string) {
    if (!activeStop) return;
    setBloomLocal((prev) => ({ ...prev, [activeStop.id]: status }));
    setShowBloom(false);
    const locId = activeStop.location_id ?? activeStop.id;
    if (locId) await supabase.from("locations").update({ bloom_status: status }).eq("id", locId);
  }

  // ── Aangekomen ─────────────────────────────────────────────────────────
  if (finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-surface pt-safe pb-safe">
        <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }} className="mb-6">
          <Image src="/logo.png" alt="TulipDay" width={88} height={88} className="rounded-3xl shadow-lg" />
        </motion.div>
        <h2 className="text-title font-display text-ink mb-2">{t("active_route.completed")}</h2>
        <p className="text-body text-ink-2 mb-1">
          {navRoute.name} · <span className="font-mono">{formatDistance(main.length)}</span>
        </p>
        <p className="text-headline text-primary mb-10">{t("active_route.well_done")}</p>
        <Button fullWidth size="lg" className="max-w-sm" onClick={() => router.push(`/${locale}/home`)}>
          {t("common.back_home")}
        </Button>
      </div>
    );
  }

  // ── Geen GPS mogelijk: uitleg en een uitweg ─────────────────────────────
  if (gpsStatus === "denied" || gpsStatus === "unsupported") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 bg-surface pt-safe pb-safe">
        <EmptyState
          tone="error"
          icon={<LocateOff size={28} />}
          title={t("navigation.no_gps_title")}
          description={t(gpsStatus === "denied" ? "navigation.no_gps_body" : "navigation.no_gps_unsupported")}
          actionLabel={t("navigation.open_in_maps")}
          onAction={() => setShowMapsPicker(true)}
        />
        <Button variant="ghost" onClick={() => router.back()}>{t("common.back")}</Button>
        {showMapsPicker && activeStop && (
          <MapsPickerSheet stop={activeStop} mode={navRoute.mode} onClose={() => setShowMapsPicker(false)} />
        )}
      </div>
    );
  }

  // ── Inhoud van de instructiebanner ─────────────────────────────────────
  let bannerIcon: React.ReactNode;
  let bannerDistance: string;
  let bannerText: string;
  if (!progress) {
    bannerIcon = <Locate size={34} aria-hidden />;
    bannerDistance = t("navigation.locating");
    bannerText = navRoute.name;
  } else if (progress.rerouting) {
    bannerIcon = <RefreshCw size={34} className="animate-spin" aria-hidden />;
    bannerDistance = t("navigation.rerouting");
    bannerText = t("navigation.rerouting_body");
  } else if (offRoute) {
    bannerIcon = <RotateCcw size={34} aria-hidden />;
    bannerDistance = formatDistance(progress.offset);
    bannerText = t("navigation.back_to_route");
  } else if (nextManeuver) {
    bannerIcon = <ManeuverIcon kind={nextManeuver.kind} size={40} />;
    bannerDistance = formatDistance(distToNext);
    bannerText = nextManeuver.street && nextManeuver.kind !== "arrive"
      ? nextManeuver.street
      : actionText(nextManeuver);
  } else {
    bannerIcon = <ArrowUp size={40} aria-hidden />;
    bannerDistance = formatDistance(remainingM);
    bannerText = navRoute.name;
  }
  const bannerSub = progress && !offRoute && !progress.rerouting && nextManeuver?.street && nextManeuver.kind !== "arrive"
    ? actionText(nextManeuver)
    : leg?.kind === "approach" && !offRoute ? t("navigation.to_start") : null;

  // "Daarna": de afslag erna, alleen als die er vlak achteraan komt
  const thenManeuver = !offRoute && progress ? activeManeuvers[nextIdx + 1] : undefined;
  const showThen = thenManeuver && nextManeuver && thenManeuver.along - nextManeuver.along < 250;

  const signalProblem = gpsStatus === "lost" ? t("navigation.signal_lost")
    : accuracy !== null && accuracy > WEAK_ACCURACY_M ? t("navigation.weak_gps") : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-surface">
      {/* ── Kaart ───────────────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <NavigationMap
          route={main}
          leg={leg?.line ?? null}
          stops={navRoute.stops}
          activeStopIdx={currentStop}
          visitedStops={visited}
          fix={fix}
          zoom={zoom}
          locked={locked}
          onUserPan={() => setLocked(false)}
          mapStyle={mapStyle}
          insets={{ top: 170, bottom: 110 }}
        />
      </div>

      {/* ── Instructie (boven) ──────────────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 z-20 px-3 pt-safe">
        <div className="pt-3">
          <ManeuverBanner
            icon={bannerIcon}
            distanceLabel={bannerDistance}
            streetName={bannerText}
            subLabel={bannerSub}
            muted={!progress || offRoute || progress.rerouting}
            closeLabel={t("navigation.stop")}
            onClose={stopNavigation}
          />
          {showThen && (
            <ThenPreview
              icon={<ManeuverIcon kind={thenManeuver.kind} size={14} />}
              label={t("navigation.after_that_label")}
              text={thenManeuver.street ?? actionText(thenManeuver)}
            />
          )}
          {signalProblem && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-caption text-warning shadow-md" role="status">
              <SignalLow size={14} aria-hidden /> {signalProblem}
            </div>
          )}
        </div>
      </div>

      {/* ── Knoppen rechts ──────────────────────────────────────────────── */}
      <div className="absolute right-3 z-30 flex flex-col gap-2" style={{ top: "calc(env(safe-area-inset-top) + 150px)" }}>
        <IconButton aria-label={t("navigation.layers_toggle")} onClick={() => setMapStyle((s) => (s === "streets" ? "satellite" : "streets"))}>
          <Layers size={18} className={mapStyle === "satellite" ? "text-primary" : undefined} />
        </IconButton>
        {isVoiceSupported() && (
          <IconButton aria-label={voiceEnabled ? t("navigation.voice_off") : t("navigation.voice_on")} onClick={handleToggleVoice}>
            {voiceEnabled ? <Volume2 size={18} className="text-primary" /> : <VolumeX size={18} className="text-ink-3" />}
          </IconButton>
        )}
        {isFlower && !leg && (
          <IconButton aria-label={t("navigation.report_bloom")} onClick={() => setShowBloom(true)}>
            <Flower2 size={18} className="text-primary" />
          </IconButton>
        )}
      </div>

      {/* ── Links onder: snelheid · rechts onder: hercentreren ─────────── */}
      <div className="absolute inset-x-3 z-30 flex items-end justify-between pointer-events-none"
           style={{ bottom: "calc(env(safe-area-inset-bottom) + 100px)" }}>
        <div className="pointer-events-auto"><SpeedIndicator speedMps={speed} /></div>
        {!locked && fix && (
          <Button className="pointer-events-auto shadow-lg" icon={<Navigation size={16} aria-hidden />} onClick={() => { tap(); setLocked(true); }}>
            {t("navigation.recenter")}
          </Button>
        )}
      </div>

      {/* ── Onderbalk ───────────────────────────────────────────────────── */}
      <NavigationActionSheet
        etaLabel={etaMinutes >= 60
          ? t("navigation.duration_hm", { h: Math.floor(etaMinutes / 60), m: etaMinutes % 60 })
          : `${etaMinutes} ${t("navigation.minute_short")}`}
        distanceLabel={formatDistance(remainingM)}
        arrivalTime={arrivalTime}
        expanded={sheetExpanded}
        onToggle={() => setSheetExpanded((v) => !v)}
        onStop={stopNavigation}
        activeStop={activeStop}
        approachPhase={leg?.kind === "approach"}
        routeName={navRoute.name}
        stops={navRoute.stops}
        currentIdx={currentStop}
        visited={visited}
        isFlower={isFlower}
        reportedBloom={activeStop ? bloomLocal[activeStop.id] ?? null : null}
        onReportBloom={() => setShowBloom(true)}
        onTakePhoto={() => setShowPhotoUpload(true)}
        onMarkArrived={() => handleMarkArrived(currentStop)}
        onOpenMapsPicker={() => setShowMapsPicker(true)}
        t={t}
      />

      {/* ── Bloei melden ────────────────────────────────────────────────── */}
      <BottomSheet open={showBloom && activeStop !== null} onClose={() => setShowBloom(false)} title={activeStop?.name}>
        <p className="text-label text-primary mb-3">{t("navigation.bloom_question")}</p>
        <div className="flex flex-col gap-2">
          {[
            { value: "in_bloom", label: t("navigation.bloom_in_bloom"), dot: "bg-success" },
            { value: "fading",   label: t("navigation.bloom_fading"),   dot: "bg-warning" },
            { value: "finished", label: t("navigation.bloom_finished"), dot: "bg-ink-3" },
          ].map((opt) => (
            <button key={opt.value} type="button" onClick={() => handleBloomReport(opt.value)}
                    className="flex min-h-touch items-center gap-3 rounded-2xl bg-surface-3 px-4 py-3 text-left text-body text-ink active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className={`h-3 w-3 flex-shrink-0 rounded-full ${opt.dot}`} aria-hidden />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* ── Externe kaart-app (terugvaloptie) ───────────────────────────── */}
      {showMapsPicker && (leg?.kind === "approach" || !activeStop) && main.coords[0] && (
        <MapsPickerSheet
          stop={{ id: "route-start", name: navRoute.name, lat: main.coords[0][1], lng: main.coords[0][0], category: "route_start" }}
          mode={navRoute.mode}
          onClose={() => setShowMapsPicker(false)}
        />
      )}
      {showMapsPicker && leg?.kind !== "approach" && activeStop && (
        <MapsPickerSheet stop={activeStop} mode={navRoute.mode} onClose={() => setShowMapsPicker(false)} />
      )}

      {showPhotoUpload && activeStop && (
        <PhotoUploadSheet
          open
          locationId={activeStop.location_id ?? activeStop.id}
          onClose={() => setShowPhotoUpload(false)}
          onUploaded={() => setShowPhotoUpload(false)}
        />
      )}
    </div>
  );
}
