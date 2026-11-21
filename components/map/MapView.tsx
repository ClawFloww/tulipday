"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/lib/supabase";
import type { Location } from "@/lib/types";
import { X, MapPin, Locate, PenLine, Trash2, BookmarkPlus, Check, Loader2, List, Bike, Footprints, Mountain, Zap } from "lucide-react";
import { isCurrentlyOpen } from "@/lib/openingHours";
import { useT } from "@/lib/i18n-context";
import { locationPath, routePath } from "@/lib/links";
import { saveCustomRoute } from "@/lib/customRoutes";
import { MAP_PRIMARY, addMapIcons } from "@/lib/mapIcons";
import { addRouteLayers, applyRouteTheme, boundsOf, routeLayerIds, setRouteLines } from "@/lib/mapLayers";
import { MAP_FONT_BOLD, isDarkTheme, mapStyleUrl, watchMapTheme } from "@/lib/mapStyle";
import { LocationSheet } from "@/components/map/LocationSheet";
import { RouteSheet, type RouteSheetDetail, type SheetRoute } from "@/components/map/RouteSheet";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOLLENSTREEK_CENTER: [number, number] = [4.56, 52.27];
const SOURCE_ID        = "locations";
const DRAW_SOURCE_ID   = "draw-route";
const ROUTES_SOURCE_ID = "map-routes";
const HALO_LAYER_ID    = "selected-halo";

// Ruimte voor de zwevende filterbalk bovenaan
const TOP_PADDING = 110;

// ─── Route browser constants ──────────────────────────────────────────────────

type MapRoute = SheetRoute;

/** Supabase slaat [lat, lng] op; MapLibre wil [lng, lat]. */
const toLngLat = (points: [number, number][] | null): [number, number][] =>
  (points ?? []).map(([lat, lng]) => [lng, lat]);

type PanelActivity = { id: string; label: string; Icon?: typeof Bike };
const PANEL_ACTIVITIES: PanelActivity[] = [
  { id: "all",               label: "Alle" },
  { id: "Fietsroute",        label: "Fietsen",  Icon: Bike },
  { id: "Wandelroute",       label: "Wandelen", Icon: Footprints },
  { id: "Mountainbikeroute", label: "MTB",      Icon: Mountain },
  { id: "E-Step Route",      label: "E-Step",   Icon: Zap },
];

// Aparte OSRM-instanties per modus (routing.openstreetmap.de)
const OSRM_BACKENDS: Record<string, string> = {
  foot:    "https://routing.openstreetmap.de/routed-foot",
  cycling: "https://routing.openstreetmap.de/routed-bike",
  driving: "https://routing.openstreetmap.de/routed-car",
};

const MAP_SELECT = "id,title,slug,latitude,longitude,category,bloom_status,address,image_url,access_type,crowd_score,opening_hours";

type MapLocation = Pick<Location,
  "id" | "title" | "slug" | "latitude" | "longitude" |
  "category" | "bloom_status" | "address" | "image_url" |
  "access_type" | "crowd_score" | "opening_hours"
>;

type FilterId = "peak" | "nearby" | "quiet" | "photo" | "family" | "free" | "horeca";

const FILTER_IDS: { id: FilterId; emoji: string }[] = [
  { id: "peak",   emoji: "🌸" },
  { id: "nearby", emoji: "📍" },
  { id: "quiet",  emoji: "🌿" },
  { id: "photo",  emoji: "📷" },
  { id: "family", emoji: "👨‍👩‍👧" },
  { id: "free",   emoji: "✅" },
  { id: "horeca", emoji: "🍴" },
];

// ─── Route drawing types ──────────────────────────────────────────────────────

interface OsrmRoute {
  duration: number;   // seconds
  distance: number;   // meters
  geometry: GeoJSON.Geometry;
}

interface RouteResult {
  walking: OsrmRoute | null;
  cycling: OsrmRoute | null;
  driving: OsrmRoute | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDuration(sec: number): string {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}u` : `${h}u ${m}m`;
}

function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

async function fetchOSRM(
  profile: "foot" | "cycling" | "driving",
  coords: [number, number][],
): Promise<OsrmRoute | null> {
  try {
    const base = OSRM_BACKENDS[profile];
    const c    = coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
    // Alle routing.openstreetmap.de-instanties gebruiken /route/v1/driving/ in het pad
    const res  = await fetch(`${base}/route/v1/driving/${c}?overview=full&geometries=geojson`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;
    return {
      duration: data.routes[0].duration,
      distance: data.routes[0].distance,
      geometry: data.routes[0].geometry,
    };
  } catch {
    return null;
  }
}

function matchesFilter(loc: MapLocation, filter: FilterId, userCoords: { lat: number; lng: number } | null): boolean {
  switch (filter) {
    case "peak":   return loc.bloom_status === "peak";
    case "quiet":  return (loc.crowd_score ?? 99) <= 2;
    case "photo":  return loc.category === "photo_spot";
    case "family": return loc.category === "attraction";
    case "free":   return loc.access_type === "roadside_only";
    case "horeca": return loc.category === "food";
    case "nearby":
      if (!userCoords || loc.latitude == null || loc.longitude == null) return false;
      return haversineKm(userCoords.lat, userCoords.lng, loc.latitude, loc.longitude) <= 20;
    default: return true;
  }
}

function locationsToGeoJSON(
  locations: MapLocation[],
  activeFilter: FilterId | null,
  userCoords: { lat: number; lng: number } | null,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const loc of locations) {
    if (loc.latitude == null || loc.longitude == null) continue;
    if (activeFilter && loc.category !== "food" && !matchesFilter(loc, activeFilter, userCoords)) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [loc.longitude, loc.latitude] },
      properties: {
        id:           loc.id,
        title:        loc.title,
        slug:         loc.slug,
        category:     loc.category,
        bloom_status: loc.bloom_status,
        address:      loc.address,
        image_url:    loc.image_url,
        // Voor horeca: null = geen data, true = open, false = gesloten
        is_open:      loc.category === "food" ? isCurrentlyOpen(loc.opening_hours) : null,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

// ─── RoutesPanel ──────────────────────────────────────────────────────────────

function RoutesPanel({
  result,
  loading,
  waypointCount,
  onClear,
  onSave,
}: {
  result: RouteResult | null;
  loading: boolean;
  waypointCount: number;
  onClear: () => void;
  onSave: () => void;
}) {
  const rows: { emoji: string; label: string; key: keyof RouteResult }[] = [
    { emoji: "🚶", label: "Wandelen", key: "walking" },
    { emoji: "🚴", label: "Fietsen",  key: "cycling" },
    { emoji: "🚗", label: "Rijden",   key: "driving" },
  ];

  return (
    <div className="absolute bottom-above-nav left-3 right-3 z-30 bg-white rounded-3xl shadow-2xl shadow-black/15 overflow-hidden animate-slide-up">
      <div className="flex justify-center pt-2.5 pb-1">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-extrabold text-gray-900">Reistijden</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{waypointCount} punt{waypointCount !== 1 ? "en" : ""} · fietsroute op kaart</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onSave}
              disabled={loading || !result}
              className="flex items-center gap-1.5 text-xs font-semibold text-tulip-600 hover:text-white
                         transition-colors px-2.5 py-1.5 rounded-xl hover:bg-tulip-500 bg-tulip-50
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <BookmarkPlus size={13} /> Opslaan
            </button>
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-rose-600 transition-colors px-2.5 py-1.5 rounded-xl hover:bg-rose-50"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 pb-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-11 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5 pb-1">
            {rows.map(({ emoji, label, key }) => {
              const r = result?.[key];
              return (
                <div key={key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50">
                  <span className="text-lg w-6 text-center leading-none">{emoji}</span>
                  <span className="flex-1 text-sm font-bold text-gray-800">{label}</span>
                  {r ? (
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-gray-900">{fmtDuration(r.duration)}</span>
                      <span className="text-xs text-gray-400 ml-1.5">{fmtDistance(r.distance)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RoutesBrowserPanel ───────────────────────────────────────────────────────

function RoutesBrowserPanel({
  routes,
  activeActivity,
  onActivityChange,
  onMapIds,
  focusedId,
  onToggle,
  onSelect,
  onClose,
}: {
  routes: MapRoute[];
  activeActivity: string;
  onActivityChange: (a: string) => void;
  onMapIds: string[];
  focusedId: string | null;
  onToggle: (route: MapRoute) => void;
  onSelect: (route: MapRoute) => void;
  onClose: () => void;
}) {
  const [showThumbs, setShowThumbs] = useState(true);

  const filtered = activeActivity === "all"
    ? routes
    : routes.filter((r) => r.activity === activeActivity);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2 border-b border-gray-100">
        <div>
          <p className="text-sm font-extrabold text-gray-900">Routes</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{filtered.length} routes</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowThumbs((p) => !p)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <List size={14} />
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Activity filter pills */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-gray-50">
        {PANEL_ACTIVITIES.map((act) => {
          const isActive = activeActivity === act.id;
          const Icon = act.Icon;
          return (
            <button
              key={act.id}
              onClick={() => onActivityChange(act.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all
                ${isActive
                  ? "bg-rose-600 border-rose-600 text-white"
                  : "bg-white border-gray-200 text-gray-600"
                }`}
            >
              {Icon && <Icon size={10} />}
              {act.label}
            </button>
          );
        })}
      </div>

      {/* Route list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((route) => {
          const isOnMap   = onMapIds.includes(route.id);
          const isFocused = route.id === focusedId;

          return (
            <div
              key={route.id}
              onClick={() => onSelect(route)}
              className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-50
                          transition-colors cursor-pointer
                          ${isOnMap ? "bg-gray-50" : "bg-white"} active:bg-gray-100`}
            >
              {showThumbs && (
                <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-100">
                  {route.cover_image_url ? (
                    <Image src={route.cover_image_url} alt={route.title} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <MapPin size={18} />
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{route.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {route.distance_km && (
                    <span className="text-[10px] text-gray-400">{route.distance_km} km</span>
                  )}
                  {route.difficulty && (
                    <span className="text-[10px] text-gray-400">· {route.difficulty}</span>
                  )}
                </div>
              </div>
              {/* Geselecteerde route in merkrood, andere routes op de kaart gedimd */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(route); }}
                aria-label={isOnMap ? "Van kaart halen" : "Op kaart tonen"}
                aria-pressed={isOnMap}
                className="flex-shrink-0 w-11 h-11 -mr-2 flex items-center justify-center rounded-full
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-fast
                  ${isOnMap ? (isFocused ? "bg-primary" : "bg-ink-3") : "border-2 border-line-strong"}`}>
                  {isOnMap && <Check size={12} className="text-on-primary" aria-hidden />}
                </span>
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <p className="text-xs text-gray-400">Geen routes gevonden</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapView() {
  const router = useRouter();
  const { t, locale } = useT();
  const mapDivRef   = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<maplibregl.Map | null>(null);
  const mapReadyRef = useRef(false);

  const [locations,    setLocations]    = useState<MapLocation[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterId | null>(null);
  const [selected,     setSelected]     = useState<MapLocation | null>(null);
  const [userCoords,   setUserCoords]   = useState<{ lat: number; lng: number } | null>(null);
  const [locating,     setLocating]     = useState(false);

  // Route drawing state
  const [drawMode,     setDrawMode]     = useState(false);
  const [waypoints,    setWaypoints]    = useState<[number, number][]>([]);
  const [routeResult,  setRouteResult]  = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Save sheet state
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [saveName,      setSaveName]      = useState("");
  const [saveConfirmed, setSaveConfirmed] = useState(false);

  // Route browser state
  const [mapRoutes,        setMapRoutes]        = useState<MapRoute[]>([]);
  const [routePanelOpen,   setRoutePanelOpen]   = useState(false);
  const [onMapRouteIds,    setOnMapRouteIds]    = useState<string[]>([]);
  const [focusedRouteId,   setFocusedRouteId]   = useState<string | null>(null);
  const [routesPanelAct,   setRoutesPanelAct]   = useState("all");
  const [showRouteHint,    setShowRouteHint]    = useState(false);

  // Route detail sheet state
  const [selectedMapRoute,    setSelectedMapRoute]    = useState<MapRoute | null>(null);
  const [routeDetail,         setRouteDetail]         = useState<RouteSheetDetail | null>(null);
  const [routeDetailLoading,  setRouteDetailLoading]  = useState(false);

  // Refs so MapLibre event handlers always see current values
  const locationsRef          = useRef<MapLocation[]>([]);
  const activeFilterRef       = useRef<FilterId | null>(null);
  const userCoordsRef         = useRef<{ lat: number; lng: number } | null>(null);
  const drawModeRef           = useRef(false);
  const waypointsRef          = useRef<[number, number][]>([]);
  const waypointMarkersRef    = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef         = useRef<maplibregl.Marker | null>(null);
  const mapRoutesRef          = useRef<MapRoute[]>([]);
  const onMapRouteIdsRef      = useRef<string[]>([]);
  const focusedRouteIdRef     = useRef<string | null>(null);
  const routePanelOpenRef     = useRef(false);

  locationsRef.current    = locations;
  activeFilterRef.current = activeFilter;
  userCoordsRef.current   = userCoords;
  drawModeRef.current     = drawMode;
  waypointsRef.current    = waypoints;
  mapRoutesRef.current    = mapRoutes;
  onMapRouteIdsRef.current = onMapRouteIds;
  focusedRouteIdRef.current = focusedRouteId;
  routePanelOpenRef.current = routePanelOpen;

  // ── Fetch locations ──
  useEffect(() => {
    supabase
      .from("locations")
      .select(MAP_SELECT)
      .eq("is_active", true)
      .then(({ data }) => { if (data) setLocations(data as MapLocation[]); });
  }, []);

  // ── Fetch routes for map browser ──
  useEffect(() => {
    supabase
      .from("routes")
      .select("id,title,slug,activity,distance_km,difficulty,cover_image_url,geometry_points")
      .eq("is_active", true)
      .not("geometry_points", "is", null)
      .then(({ data }) => { if (data) setMapRoutes(data as MapRoute[]); });
  }, []);

  // ── Onboarding hint ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("tulipday_routes_hint_seen")) return;
    const id = setTimeout(() => setShowRouteHint(true), 2000);
    return () => clearTimeout(id);
  }, []);

  // ── Fetch route detail when a route is selected ──
  useEffect(() => {
    if (!selectedMapRoute) return;
    setRouteDetailLoading(true);
    setRouteDetail(null);

    supabase
      .from("routes")
      .select("description,duration_minutes")
      .eq("id", selectedMapRoute.id)
      .eq("is_active", true)
      .single()
      .then(({ data }) => {
        if (data) setRouteDetail(data as RouteSheetDetail);
        setRouteDetailLoading(false);
      });
  }, [selectedMapRoute]);

  // ── Update GeoJSON source ──
  const updateSource = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(locationsToGeoJSON(locationsRef.current, activeFilterRef.current, userCoordsRef.current));
  }, []);

  useEffect(() => { updateSource(); }, [locations, activeFilter, userCoords, updateSource]);

  // ── Auto-refresh open/gesloten status elke minuut ──
  useEffect(() => {
    const id = setInterval(updateSource, 60_000);
    return () => clearInterval(id);
  }, [updateSource]);

  // ── Gebruikerslocatie marker ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords) return;
    const lngLat: [number, number] = [userCoords.lng, userCoords.lat];

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat(lngLat);
      return;
    }

    // Blauw pulserende stip
    const el = document.createElement("div");
    el.style.cssText = [
      "width:18px", "height:18px", "border-radius:50%",
      "background:#3B82F6", "border:3px solid white",
      "box-shadow:0 0 0 2px rgba(59,130,246,0.4),0 2px 10px rgba(59,130,246,0.35)",
      "position:relative", "cursor:default",
    ].join(";");

    const ring = document.createElement("div");
    ring.style.cssText = [
      "position:absolute", "top:-11px", "left:-11px",
      "width:40px", "height:40px", "border-radius:50%",
      "background:rgba(59,130,246,0.18)",
      "animation:user-loc-pulse 2s ease-out infinite",
    ].join(";");
    el.appendChild(ring);

    userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat(lngLat)
      .addTo(map);
  }, [userCoords]);

  // ── Update map cursor when draw mode changes ──
  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = drawMode ? "crosshair" : "";
  }, [drawMode]);

  // ── Fetch OSRM routes when waypoints change ──
  useEffect(() => {
    if (!drawMode || waypoints.length < 2) return;

    setRouteLoading(true);
    setRouteResult(null);

    const coords = waypoints;

    Promise.all([
      fetchOSRM("foot",    coords),
      fetchOSRM("cycling", coords),
      fetchOSRM("driving", coords),
    ]).then(([walking, cycling, driving]) => {
      setRouteResult({ walking, cycling, driving });
      setRouteLoading(false);

      // Draw cycling route geometry on map
      const map = mapRef.current;
      if (!map || !mapReadyRef.current) return;
      if (cycling?.geometry.type === "LineString") {
        setRouteLines(map, DRAW_SOURCE_ID, [
          { id: "draw", coords: cycling.geometry.coordinates as [number, number][], selected: true },
        ]);
      }
    });
  }, [waypoints, drawMode]);

  // ── Clear drawing ──
  const clearDrawing = useCallback(() => {
    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];

    const map = mapRef.current;
    if (map && mapReadyRef.current) setRouteLines(map, DRAW_SOURCE_ID, []);

    setWaypoints([]);
    setRouteResult(null);
    setRouteLoading(false);
  }, []);

  // ── Toggle draw mode ──
  const toggleDrawMode = useCallback(() => {
    if (drawModeRef.current) {
      clearDrawing();
      setDrawMode(false);
    } else {
      setSelected(null);
      setDrawMode(true);
    }
  }, [clearDrawing]);

  // ── Route browser ──
  const dismissHint = useCallback(() => {
    setShowRouteHint(false);
    if (typeof window !== "undefined") localStorage.setItem("tulipday_routes_hint_seen", "1");
  }, []);

  // ── Camera: houd rekening met filterbalk, sheet en (op brede schermen) de routelijst ──
  const cameraPadding = useCallback((sheetFraction: number): maplibregl.PaddingOptions => {
    const w = window.innerWidth, h = window.innerHeight;
    const left = routePanelOpenRef.current && w >= 640 ? 288 + 24 : 24;
    return { top: TOP_PADDING, bottom: Math.round(h * sheetFraction) + 24, left, right: 24 };
  }, []);

  const fitRoute = useCallback((route: MapRoute) => {
    const bounds = boundsOf(toLngLat(route.geometry_points));
    if (bounds) mapRef.current?.fitBounds(bounds, { padding: cameraPadding(0.5), maxZoom: 15, duration: 900 });
  }, [cameraPadding]);

  // Route openen: op de kaart, geselecteerd, sheet open en camera erheen
  const openRoute = useCallback((route: MapRoute) => {
    setSelected(null);
    setOnMapRouteIds((ids) => (ids.includes(route.id) ? ids : [...ids, route.id]));
    setFocusedRouteId(route.id);
    setSelectedMapRoute(route);
    if (window.innerWidth < 640) setRoutePanelOpen(false);
    fitRoute(route);
  }, [fitRoute]);

  const toggleRouteOnMap = useCallback((route: MapRoute) => {
    const ids = onMapRouteIdsRef.current;
    if (ids.includes(route.id)) {
      const rest = ids.filter((id) => id !== route.id);
      setOnMapRouteIds(rest);
      setFocusedRouteId((f) => (f === route.id ? rest[rest.length - 1] ?? null : f));
      return;
    }
    setOnMapRouteIds([...ids, route.id]);
    setFocusedRouteId(route.id);
    fitRoute(route);
  }, [fitRoute]);

  // Locatie openen: sheet open en de locatie midden in het zichtbare deel boven de sheet.
  // offset i.p.v. padding: padding in easeTo blijft daarna op de kaart hangen.
  const selectLocation = useCallback((loc: MapLocation) => {
    setSelectedMapRoute(null);
    setSelected(loc);
    const map = mapRef.current;
    if (!map || loc.latitude == null || loc.longitude == null) return;
    const h = window.innerHeight;
    const visibleCenter = (TOP_PADDING + h * (1 - 0.45)) / 2;
    map.easeTo({
      center:   [loc.longitude, loc.latitude],
      zoom:     Math.max(map.getZoom(), 13),
      offset:   [0, visibleCenter - h / 2],
      duration: 700,
    });
  }, []);

  const selectLocationRef = useRef(selectLocation);
  const openRouteRef      = useRef(openRoute);
  selectLocationRef.current = selectLocation;
  openRouteRef.current      = openRoute;

  // ── Geselecteerde locatie krijgt een rode gloed ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || !map.getLayer(HALO_LAYER_ID)) return;
    map.setFilter(HALO_LAYER_ID, ["==", ["get", "id"], selected?.id ?? ""]);
  }, [selected]);

  // ── Save drawn route ──
  const openSaveSheet = useCallback(() => {
    const d = new Date();
    const label = d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
    setSaveName(`Mijn route · ${label}`);
    setSaveConfirmed(false);
    setShowSaveSheet(true);
  }, []);

  const confirmSave = useCallback(() => {
    if (!routeResult || !saveName.trim()) return;
    saveCustomRoute({
      name:      saveName.trim(),
      waypoints,
      cycling:   routeResult.cycling  ? { duration: routeResult.cycling.duration,  distance: routeResult.cycling.distance  } : null,
      walking:   routeResult.walking  ? { duration: routeResult.walking.duration,  distance: routeResult.walking.distance  } : null,
      driving:   routeResult.driving  ? { duration: routeResult.driving.duration,  distance: routeResult.driving.distance  } : null,
    });
    setSaveConfirmed(true);
    setTimeout(() => setShowSaveSheet(false), 1200);
  }, [routeResult, saveName, waypoints]);

  // ── Routes op de kaart: geselecteerde in merkrood, de rest gedimd ──
  const syncRouteLines = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    setRouteLines(map, ROUTES_SOURCE_ID, onMapRouteIdsRef.current.flatMap((id) => {
      const route = mapRoutesRef.current.find((r) => r.id === id);
      return route ? [{ id, coords: toLngLat(route.geometry_points), selected: id === focusedRouteIdRef.current }] : [];
    }));
  }, []);

  useEffect(() => { syncRouteLines(); }, [onMapRouteIds, focusedRouteId, mapRoutes, syncRouteLines]);

  // ── Init map ──
  useEffect(() => {
    if (!mapDivRef.current) return;

    const map = new maplibregl.Map({
      container: mapDivRef.current,
      style: mapStyleUrl(),
      center: BOLLENSTREEK_CENTER,
      zoom: 11,
    });

    mapRef.current = map;
    const stopThemeWatch = watchMapTheme(map, (dark) => {
      applyRouteTheme(map, ROUTES_SOURCE_ID, dark);
      applyRouteTheme(map, DRAW_SOURCE_ID, dark);
    });

    map.on("load", async () => {
      await addMapIcons(map);
      if (mapRef.current !== map) return;
      mapReadyRef.current = true;

      // ── Routes (onder de locatiemarkers) ──
      const dark = isDarkTheme();
      addRouteLayers(map, ROUTES_SOURCE_ID, dark);
      addRouteLayers(map, DRAW_SOURCE_ID, dark);

      // ── Location source + layers ──
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: locationsToGeoJSON(locationsRef.current, activeFilterRef.current, userCoordsRef.current),
        cluster: true,
        // Lager dan voorheen (was 13) zodat individuele bollenveld-stippen al
        // bij dorpsniveau-zoom zichtbaar zijn i.p.v. pas bij stadsniveau.
        clusterMaxZoom: 11,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          // Merkrood, donkerder naarmate het cluster groter is
          "circle-color": ["step", ["get", "point_count"], MAP_PRIMARY, 10, "#C40C22", 30, "#8F0A1A"],
          "circle-radius": [
            "step", ["zoom"],
            ["step", ["get", "point_count"], 20, 10, 26, 30, 32],
            11, ["step", ["get", "point_count"], 16, 10, 21, 30, 26],
            12, ["step", ["get", "point_count"], 13, 10, 17, 30, 21],
            13, ["step", ["get", "point_count"], 10, 10, 13, 30, 16],
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#FFFFFF",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": MAP_FONT_BOLD,
          "text-size": ["step", ["zoom"], 13, 11, 11, 12, 10, 13, 9],
        },
        paint: { "text-color": "#ffffff" },
      });

      // Gloed onder de geselecteerde locatie
      map.addLayer({
        id: HALO_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-color": MAP_PRIMARY,
          "circle-opacity": 0.25,
          "circle-radius": 24,
          "circle-stroke-width": 2,
          "circle-stroke-color": MAP_PRIMARY,
        },
      });

      // Categoriemarker: lucide-icoon in een gekleurde cirkel (zie lib/mapIcons.ts)
      map.addLayer({
        id: "unclustered-point",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["concat", "pin-", ["get", "category"]],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.75, 14, 1],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // ── Status dot (bloom voor bollenvelden, open/gesloten voor horeca) ──
      map.addLayer({
        id: "unclustered-bloom-dot",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            // Horeca: kleur op basis van open/gesloten
            ["==", ["get", "category"], "food"],
            ["case",
              ["==", ["get", "is_open"], true],  "#22c55e",  // open  → groen
              ["==", ["get", "is_open"], false], "#ef4444",  // gesloten → rood
              "transparent",                                  // geen data
            ],
            // Overige categorieën: bloom status kleur
            ["match", ["get", "bloom_status"],
              "peak",     "#15803d",
              "blooming", "#22c55e",
              "early",    "#86efac",
              "ending",   "#ef4444",
              "transparent",
            ],
          ],
          "circle-radius": 4.5,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#FFFFFF",
          "circle-translate": [10, -10],
        },
      });

      // ── Cluster click → zoom in ──
      map.on("click", "clusters", (e) => {
        if (drawModeRef.current) return;
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        if (!features[0]) return;
        const clusterId = features[0].properties?.cluster_id;
        const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        src.getClusterExpansionZoom(clusterId).then((zoom) => {
          const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom: zoom ?? 12 });
        });
      });

      // ── Point click → locatiesheet ──
      const handlePointClick = (e: maplibregl.MapLayerMouseEvent) => {
        if (drawModeRef.current) return;
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const loc = locationsRef.current.find((l) => l.id === props.id);
        if (loc) selectLocationRef.current(loc);
      };
      map.on("click", "unclustered-point",    handlePointClick);
      map.on("click", "unclustered-bloom-dot", handlePointClick);

      // ── Route click → routesheet (markers gaan voor) ──
      const routeHit = routeLayerIds(ROUTES_SOURCE_ID).hit;
      map.on("click", routeHit, (e) => {
        if (drawModeRef.current) return;
        const onPoint = map.queryRenderedFeatures(e.point, { layers: ["clusters", "unclustered-point"] });
        if (onPoint.length > 0) return;
        const id = e.features?.[0]?.properties?.id;
        const route = mapRoutesRef.current.find((r) => r.id === id);
        if (route) openRouteRef.current(route);
      });
      map.on("mouseenter", routeHit, () => { if (!drawModeRef.current) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", routeHit, () => { if (!drawModeRef.current) map.getCanvas().style.cursor = ""; });

      // ── Pointer cursors ──
      map.on("mouseenter", "clusters",             () => { if (!drawModeRef.current) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters",             () => { if (!drawModeRef.current) map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "unclustered-point",    () => { if (!drawModeRef.current) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "unclustered-point",    () => { if (!drawModeRef.current) map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "unclustered-bloom-dot", () => { if (!drawModeRef.current) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "unclustered-bloom-dot", () => { if (!drawModeRef.current) map.getCanvas().style.cursor = ""; });

      // ── General map click ──
      map.on("click", (e) => {
        if (drawModeRef.current) {
          // Add waypoint
          const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
          const newPoints = [...waypointsRef.current, lngLat];

          // Numbered marker
          const el = document.createElement("div");
          el.style.cssText = [
            "width:28px", "height:28px", "border-radius:50%",
            "background:#E8102A", "color:white", "font-size:12px", "font-weight:800",
            "display:flex", "align-items:center", "justify-content:center",
            "border:2.5px solid white", "box-shadow:0 2px 8px rgba(0,0,0,.3)",
            "font-family:system-ui,sans-serif", "cursor:default",
          ].join(";");
          el.textContent = String(newPoints.length);

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat(lngLat)
            .addTo(map);
          waypointMarkersRef.current.push(marker);

          setWaypoints(newPoints);
          return;
        }

        // Normal mode: sluit de locatiesheet bij een tik op een lege plek
        const hit = map.queryRenderedFeatures(e.point, { layers: ["clusters", "unclustered-point", "unclustered-bloom-dot", routeHit] });
        if (hit.length === 0) setSelected(null);
      });

      updateSource();
      syncRouteLines();
    });

    return () => {
      stopThemeWatch();
      mapReadyRef.current = false;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Locate knop (losgekoppeld van filter) ──
  const locateUser = useCallback(() => {
    if (userCoords) {
      mapRef.current?.flyTo({ center: [userCoords.lng, userCoords.lat], zoom: 14 });
      return;
    }
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 14 });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [userCoords]);

  // ── Filter click ──
  const handleFilter = useCallback((id: FilterId) => {
    const next = activeFilter === id ? null : id;
    setActiveFilter(next);
    setSelected(null);

    if (next === "nearby" && navigator.geolocation) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 12 });
          setLocating(false);
        },
        () => setLocating(false),
      );
    }
  }, [activeFilter]);

  const selectedRouteCoords = useMemo(
    () => toLngLat(selectedMapRoute?.geometry_points ?? null),
    [selectedMapRoute],
  );
  // Stabiele callbacks: BottomSheet herstart zijn effect bij een nieuwe onClose
  const closeRouteSheet    = useCallback(() => setSelectedMapRoute(null), []);
  const closeLocationSheet = useCallback(() => setSelected(null), []);

  const filters = FILTER_IDS.map((f) => ({ ...f, label: t(`map.filter_${f.id}`) }));
  const showRoutePanel = drawMode && waypoints.length >= 2;

  return (
    <div className="fixed inset-0 flex flex-col">

      {/* ── Filter chips (floating) ── */}
      <div
        className="absolute top-0 left-0 right-0 z-20 pt-12 pb-3 px-4"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-surface) 0%, color-mix(in srgb, var(--color-surface) 70%, transparent) 60%, transparent 100%)",
        }}
      >
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleFilter(f.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold
                  transition-all duration-200 active:scale-95
                  ${f.id === "nearby" && locating ? "opacity-60" : ""}
                `}
                style={isActive
                  ? {
                      backgroundColor: "#E8102A",
                      color: "#ffffff",
                      border: "1.5px solid #E8102A",
                      boxShadow: "0 4px 12px rgba(232,16,42,0.32)",
                    }
                  : {
                      backgroundColor: "var(--color-surface-2)",
                      color: "var(--color-text)",
                      border: "1.5px solid var(--color-border)",
                    }}
              >
                <span>{f.id === "nearby" && locating ? "⏳" : f.emoji}</span>
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Draw mode banner ── */}
      {drawMode && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-gray-900/80 backdrop-blur-sm text-white text-xs font-semibold
                          px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
            {waypoints.length === 0
              ? t("map.draw_first_point")
              : waypoints.length === 1
              ? t("map.draw_more_points")
              : t("map.draw_points_count", { count: waypoints.length })}
          </div>
        </div>
      )}

      {/* ── Routes browser handle ── */}
      <button
        onClick={() => {
          setRoutePanelOpen((p) => {
            if (!p) dismissHint();
            return !p;
          });
        }}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30
                   flex items-center gap-1.5 pl-2.5 pr-3 py-2.5
                   bg-white rounded-r-full shadow-lg border border-l-0 border-gray-100
                   transition-all active:scale-95"
      >
        <List size={16} className={routePanelOpen ? "text-rose-600" : "text-gray-600"} />
        <span className="text-xs font-bold text-gray-700">{t("map.routes_panel")}</span>
        {onMapRouteIds.length > 0 && (
          <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[10px] font-extrabold flex items-center justify-center">
            {onMapRouteIds.length}
          </span>
        )}
      </button>

      {/* ── Onboarding tooltip ── */}
      {showRouteHint && !routePanelOpen && (
        <div className="absolute left-20 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="relative bg-gray-900/90 backdrop-blur-sm text-white text-xs font-semibold
                          px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
            <div className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-0 h-0
                            border-t-[6px] border-t-transparent
                            border-b-[6px] border-b-transparent
                            border-r-[7px] border-r-gray-900/90" />
            {t("map.routes_hint")}
          </div>
        </div>
      )}

      {/* ── Routes browser slide-in panel ── */}
      <div
        className={`absolute left-0 top-0 bottom-0 z-30 w-56 sm:w-72 shadow-2xl
                    transition-transform duration-300
                    ${routePanelOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <RoutesBrowserPanel
          routes={mapRoutes}
          activeActivity={routesPanelAct}
          onActivityChange={setRoutesPanelAct}
          onMapIds={onMapRouteIds}
          focusedId={focusedRouteId}
          onToggle={toggleRouteOnMap}
          onSelect={openRoute}
          onClose={() => setRoutePanelOpen(false)}
        />
      </div>

      {/* ── Map ── */}
      <div ref={mapDivRef} className="flex-1 w-full" />

      {/* ── Route draw toggle ── */}
      <button
        onClick={toggleDrawMode}
        className={`absolute left-4 bottom-44 z-20 h-11 px-4 rounded-full
                   shadow-lg flex items-center gap-2 text-sm font-bold
                   border transition-all active:scale-95
                   ${drawMode
                     ? "bg-rose-600 border-rose-600 text-white shadow-rose-200"
                     : "bg-white border-gray-100 text-gray-700 hover:bg-gray-50"
                   }`}
      >
        <PenLine size={16} />
        {drawMode ? t("map.stop_drawing") : t("map.draw_route")}
      </button>

      {/* ── My location button ── */}
      <button
        onClick={locateUser}
        className={`absolute right-4 bottom-44 z-20 w-11 h-11 bg-white rounded-full
                   shadow-lg flex items-center justify-center
                   hover:bg-rose-50 active:scale-95 transition-all border border-gray-100
                   ${userCoords ? "text-blue-500" : "text-rose-600"}`}
      >
        {locating
          ? <Loader2 size={20} className="animate-spin text-rose-400" />
          : <Locate size={20} />}
      </button>

      {/* ── Zoom buttons ── */}
      <div className="absolute right-4 bottom-60 z-20 flex flex-col gap-1">
        {["+", "−"].map((sign) => (
          <button
            key={sign}
            onClick={() => {
              if (!mapRef.current) return;
              const z = mapRef.current.getZoom() ?? 11;
              mapRef.current.setZoom(sign === "+" ? z + 1 : z - 1);
            }}
            className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center
                       text-gray-700 font-bold text-lg hover:bg-gray-50 active:scale-95
                       transition-all border border-gray-100"
          >
            {sign}
          </button>
        ))}
      </div>

      {/* ── Route times panel ── */}
      {showRoutePanel && !showSaveSheet && (
        <RoutesPanel
          result={routeResult}
          loading={routeLoading}
          waypointCount={waypoints.length}
          onClear={clearDrawing}
          onSave={openSaveSheet}
        />
      )}

      {/* ── Save route sheet ── */}
      {showSaveSheet && (
        <div className="absolute bottom-20 left-3 right-3 z-40 bg-white rounded-3xl shadow-2xl shadow-black/20 overflow-hidden animate-slide-up">
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>
          <div className="px-4 pb-5">
            {saveConfirmed ? (
              <div className="flex flex-col items-center py-4 gap-2">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  <Check size={24} className="text-green-600" />
                </div>
                <p className="text-sm font-extrabold text-gray-900">{t("map.route_saved")}</p>
                <p className="text-xs text-gray-400">{t("map.route_saved_sub")}</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-extrabold text-gray-900 mb-1">{t("map.save_route")}</p>
                <p className="text-xs text-gray-400 mb-3">{t("map.save_route_sub")}</p>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  maxLength={60}
                  className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm font-semibold
                             text-gray-800 bg-gray-50 focus:outline-none focus:border-tulip-400
                             focus:bg-white transition-colors mb-3"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSaveSheet(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500
                               hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={confirmSave}
                    disabled={!saveName.trim()}
                    className="flex-1 py-3 rounded-xl bg-tulip-500 text-white text-sm font-bold
                               hover:bg-tulip-600 active:scale-95 transition-all
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t("common.save")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Route detail sheet ── */}
      <RouteSheet
        route={selectedMapRoute}
        coords={selectedRouteCoords}
        detail={routeDetail}
        loading={routeDetailLoading}
        locations={locations}
        isOnMap={selectedMapRoute !== null && onMapRouteIds.includes(selectedMapRoute.id)}
        onToggleMap={() => {
          if (!selectedMapRoute) return;
          toggleRouteOnMap(selectedMapRoute);
          if (onMapRouteIds.includes(selectedMapRoute.id)) setSelectedMapRoute(null);
        }}
        onClose={closeRouteSheet}
        onDetails={() => selectedMapRoute && router.push(routePath(locale, selectedMapRoute.slug))}
        onStart={() => selectedMapRoute && router.push(`/${locale}/navigate?slug=${selectedMapRoute.slug}`)}
        onLocationSelect={(loc) => {
          const full = locations.find((l) => l.id === loc.id);
          if (full) selectLocation(full);
        }}
      />

      {/* ── Locatiesheet (niet in tekenmodus) ── */}
      <LocationSheet
        location={selected && !drawMode ? selected : null}
        onClose={closeLocationSheet}
        onDetails={() => selected && router.push(locationPath(locale, selected.slug))}
      />

      {/* ── Bottom nav ── */}

      {/* ── Animations ── */}
      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes user-loc-pulse {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
