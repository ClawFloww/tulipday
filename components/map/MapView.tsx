"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/lib/supabase";
import type { Location } from "@/lib/types";
import {
  X, MapPin, Locate, PenLine, Trash2, BookmarkPlus, Check, Loader2, List, Bike, Footprints, Mountain, Zap,
  Car, Flower2, Leaf, Camera, Users, Eye, Utensils, Plus, Minus, Image as ImageIcon, type LucideIcon,
} from "lucide-react";
import { isCurrentlyOpen } from "@/lib/openingHours";
import { useT } from "@/lib/i18n-context";
import { locationPath, routePath } from "@/lib/links";
import { saveCustomRoute } from "@/lib/customRoutes";
import { CATEGORY_COLOR, MAP_PRIMARY, addMapIcons } from "@/lib/mapIcons";
import { addRouteLayers, boundsOf, routeLayerIds, setRouteLines } from "@/lib/mapLayers";
import { MAP_FONT_BOLD, MAP_STYLE, tintMap } from "@/lib/mapStyle";
import { LocationSheet } from "@/components/map/LocationSheet";
import { RouteSheet, type RouteSheetDetail, type SheetRoute } from "@/components/map/RouteSheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";

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

// id = waarde van routes.activity in Supabase
const PANEL_ACTIVITIES: { id: string; key: string; Icon?: LucideIcon }[] = [
  { id: "all",               key: "all" },
  { id: "Fietsroute",        key: "bike",  Icon: Bike },
  { id: "Wandelroute",       key: "walk",  Icon: Footprints },
  { id: "Mountainbikeroute", key: "mtb",   Icon: Mountain },
  { id: "E-Step Route",      key: "estep", Icon: Zap },
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

const FILTER_IDS: { id: FilterId; Icon: LucideIcon }[] = [
  { id: "peak",   Icon: Flower2 },
  { id: "nearby", Icon: MapPin },
  { id: "quiet",  Icon: Leaf },
  { id: "photo",  Icon: Camera },
  { id: "family", Icon: Users },
  { id: "free",   Icon: Eye },
  { id: "horeca", Icon: Utensils },
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

function fmtDuration(sec: number, t: (k: string, p?: Record<string, string | number>) => string): string {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} ${t("navigation.minute_short")}`;
  return t("navigation.duration_hm", { h: Math.floor(min / 60), m: min % 60 });
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
        color:        CATEGORY_COLOR[loc.category] ?? CATEGORY_COLOR.parking,
        // Voor horeca: null = geen data, true = open, false = gesloten
        is_open:      loc.category === "food" ? isCurrentlyOpen(loc.opening_hours) : null,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

// ─── RoutesPanel ──────────────────────────────────────────────────────────────

const TRAVEL_ROWS: { key: keyof RouteResult; label: string; Icon: LucideIcon }[] = [
  { key: "walking", label: "map.on_foot", Icon: Footprints },
  { key: "cycling", label: "map.by_bike", Icon: Bike },
  { key: "driving", label: "map.by_car",  Icon: Car },
];

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
  const { t } = useT();
  return (
    <div className="absolute bottom-above-nav left-3 right-3 z-30 overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-sheet animate-slide-up">
      <div className="flex justify-center pt-2.5 pb-1">
        <div className="h-1 w-10 rounded-full bg-line-strong" />
      </div>
      <div className="px-4 pb-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-headline text-ink">{t("map.travel_times")}</p>
            <p className="text-caption text-ink-3">{t("map.points_count", { count: waypointCount })}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="secondary" onClick={onSave} disabled={loading || !result}
                    icon={<BookmarkPlus size={14} aria-hidden />}>
              {t("common.save")}
            </Button>
            <IconButton variant="ghost" aria-label={t("map.clear_route")} onClick={onClear} className="hover:text-danger">
              <Trash2 size={16} />
            </IconButton>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 pb-1">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-1.5 pb-1">
            {TRAVEL_ROWS.map(({ key, label, Icon }) => {
              const r = result?.[key];
              return (
                <div key={key} className="flex items-center gap-3 rounded-xl bg-surface-3 px-3 py-2.5">
                  <Icon size={18} className="text-ink-2" aria-hidden />
                  <span className="flex-1 text-label text-ink">{t(label)}</span>
                  {r ? (
                    <span className="font-mono text-label text-ink">
                      {fmtDuration(r.duration, t)}
                      <span className="ml-1.5 text-caption text-ink-3">{fmtDistance(r.distance)}</span>
                    </span>
                  ) : (
                    <span className="text-caption text-ink-3">—</span>
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
  const { t } = useT();
  const [showThumbs, setShowThumbs] = useState(true);

  const filtered = activeActivity === "all"
    ? routes
    : routes.filter((r) => r.activity === activeActivity);

  return (
    <div className="flex h-full flex-col bg-surface-2">
      <div className="flex items-center justify-between border-b border-line px-4 pt-safe pb-2">
        <div className="pt-3">
          <p className="text-headline text-ink">{t("map.routes_panel")}</p>
          <p className="text-caption text-ink-3">{t("map.routes_count", { count: filtered.length })}</p>
        </div>
        <div className="flex items-center pt-3">
          <IconButton variant="ghost" aria-label={t(showThumbs ? "map.hide_photos" : "map.show_photos")}
                      aria-pressed={showThumbs} onClick={() => setShowThumbs((p) => !p)}>
            {showThumbs ? <List size={16} /> : <ImageIcon size={16} />}
          </IconButton>
          <IconButton variant="ghost" aria-label={t("common.close")} onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
      </div>

      <div className="scrollbar-hide flex gap-1.5 overflow-x-auto border-b border-line px-3 py-2">
        {PANEL_ACTIVITIES.map((act) => (
          <Chip key={act.id} selected={activeActivity === act.id} onClick={() => onActivityChange(act.id)}
                icon={act.Icon ? <act.Icon size={12} aria-hidden /> : undefined} className="!h-8 !px-2.5 !text-caption">
            {t(`map.activity_${act.key}`)}
          </Chip>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map((route) => {
          const isOnMap   = onMapIds.includes(route.id);
          const isFocused = route.id === focusedId;

          return (
            <div key={route.id} className={`flex items-center border-b border-line pr-1 ${isOnMap ? "bg-surface-3" : ""}`}>
              <button
                type="button"
                onClick={() => onSelect(route)}
                className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-3 text-left active:bg-surface-3
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                {showThumbs && (
                  <span className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface-3">
                    {route.cover_image_url ? (
                      <Image src={route.cover_image_url} alt="" fill sizes="56px" className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-3">
                        <MapPin size={18} aria-hidden />
                      </span>
                    )}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-label leading-tight text-ink">{route.title}</span>
                  <span className="mt-0.5 block font-mono text-caption text-ink-3">
                    {[route.distance_km ? `${route.distance_km} km` : null, route.difficulty].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
              {/* Geselecteerde route in merkrood, andere routes op de kaart gedimd */}
              <button
                type="button"
                onClick={() => onToggle(route)}
                aria-label={t(isOnMap ? "map.route_off_map" : "map.route_on_map")}
                aria-pressed={isOnMap}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-fast
                  ${isOnMap ? (isFocused ? "bg-primary" : "bg-ink-3") : "border-2 border-line-strong"}`}>
                  {isOnMap && <Check size={12} className="text-on-primary" aria-hidden />}
                </span>
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-12 text-center text-caption text-ink-3">{t("map.no_routes")}</p>
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
      style: MAP_STYLE,
      center: BOLLENSTREEK_CENTER,
      zoom: 11,
    });

    mapRef.current = map;
    tintMap(map);

    map.on("load", () => {
      mapReadyRef.current = true;

      // ── Routes (onder de locatiemarkers) ──
      addRouteLayers(map, ROUTES_SOURCE_ID);
      addRouteLayers(map, DRAW_SOURCE_ID);

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

      // Gekleurde stip als vangnet; het icoon hieronder dekt hem af zodra het geladen is
      map.addLayer({
        id: "unclustered-dot",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 10, 14, 13],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#FFFFFF",
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
      map.on("click", "unclustered-dot",      handlePointClick);
      map.on("click", "unclustered-point",    handlePointClick);
      map.on("click", "unclustered-bloom-dot", handlePointClick);

      // ── Route click → routesheet (markers gaan voor) ──
      const routeHit = routeLayerIds(ROUTES_SOURCE_ID).hit;
      map.on("click", routeHit, (e) => {
        if (drawModeRef.current) return;
        const onPoint = map.queryRenderedFeatures(e.point, { layers: ["clusters", "unclustered-dot", "unclustered-point"] });
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
        const hit = map.queryRenderedFeatures(e.point, { layers: ["clusters", "unclustered-dot", "unclustered-point", "unclustered-bloom-dot", routeHit] });
        if (hit.length === 0) setSelected(null);
      });

      updateSource();
      syncRouteLines();

      // Iconen na de lagen: faalt het laden, dan blijven stippen en lijnen zichtbaar
      addMapIcons(map).catch((err) => console.error("Kaarticonen laden mislukt", err));
    });

    return () => {
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

      {/* ── Filter chips (zwevend) ── */}
      <div
        className="absolute left-0 right-0 top-0 z-20 px-4 pb-3 pt-safe"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-surface) 0%, color-mix(in srgb, var(--color-surface) 70%, transparent) 60%, transparent 100%)",
        }}
      >
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1 pt-3">
          {filters.map((f) => (
            <Chip
              key={f.id}
              selected={activeFilter === f.id}
              onClick={() => handleFilter(f.id)}
              className="shadow-sm"
              icon={f.id === "nearby" && locating
                ? <Loader2 size={14} className="animate-spin" aria-hidden />
                : <f.Icon size={14} aria-hidden />}
            >
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* ── Draw mode banner ── */}
      {drawMode && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="whitespace-nowrap rounded-full bg-ink px-4 py-2 text-caption text-surface shadow-lg" role="status">
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
        aria-expanded={routePanelOpen}
        className="absolute left-0 top-1/2 z-30 flex min-h-touch -translate-y-1/2 items-center gap-1.5
                   rounded-r-full border border-l-0 border-line bg-surface-2 py-2.5 pl-2.5 pr-3 shadow-lg
                   transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <List size={16} className={routePanelOpen ? "text-primary" : "text-ink-2"} aria-hidden />
        <span className="text-label text-ink">{t("map.routes_panel")}</span>
        {onMapRouteIds.length > 0 && (
          <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[10px] font-extrabold flex items-center justify-center">
            {onMapRouteIds.length}
          </span>
        )}
      </button>

      {/* ── Onboarding tooltip ── */}
      {showRouteHint && !routePanelOpen && (
        <div className="absolute left-20 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
          <div className="relative whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-caption text-surface shadow-lg">
            <div className="absolute -left-[7px] top-1/2 h-0 w-0 -translate-y-1/2
                            border-y-[6px] border-r-[7px] border-y-transparent"
                 style={{ borderRightColor: "var(--color-text)" }} />
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
        aria-pressed={drawMode}
        className={`absolute bottom-44 left-4 z-20 flex h-11 items-center gap-2 rounded-full border px-4 text-label shadow-lg
                   transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                   ${drawMode ? "border-primary bg-primary text-on-primary" : "border-line bg-surface-2 text-ink"}`}
      >
        <PenLine size={16} aria-hidden />
        {drawMode ? t("map.stop_drawing") : t("map.draw_route")}
      </button>

      {/* ── Mijn locatie ── */}
      <IconButton
        aria-label={t("map.my_location")}
        onClick={locateUser}
        className={`absolute bottom-44 right-4 z-20 shadow-lg ${userCoords ? "text-info" : "text-primary"}`}
      >
        {locating ? <Loader2 size={20} className="animate-spin" /> : <Locate size={20} />}
      </IconButton>

      {/* ── Zoomen ── */}
      <div className="absolute bottom-60 right-4 z-20 flex flex-col gap-1">
        {([["in", Plus, 1], ["out", Minus, -1]] as const).map(([key, Icon, delta]) => (
          <IconButton
            key={key}
            aria-label={t(`map.zoom_${key}`)}
            className="shadow-lg"
            onClick={() => {
              if (!mapRef.current) return;
              mapRef.current.easeTo({ zoom: mapRef.current.getZoom() + delta, duration: 250 });
            }}
          >
            <Icon size={18} />
          </IconButton>
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

      {/* ── Route opslaan ── */}
      {showSaveSheet && (
        <div className="absolute bottom-above-nav left-3 right-3 z-40 overflow-hidden rounded-3xl border border-line bg-surface-2 shadow-sheet animate-slide-up">
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="h-1 w-10 rounded-full bg-line-strong" />
          </div>
          <div className="px-4 pb-5">
            {saveConfirmed ? (
              <div className="flex flex-col items-center gap-2 py-4" role="status">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-full">
                  <span aria-hidden className="absolute inset-0 rounded-full bg-success opacity-[0.15]" />
                  <Check size={24} className="relative text-success" aria-hidden />
                </span>
                <p className="text-headline text-ink">{t("map.route_saved")}</p>
                <p className="text-caption text-ink-3">{t("map.route_saved_sub")}</p>
              </div>
            ) : (
              <>
                <label htmlFor="save-route-name" className="mb-1 block text-headline text-ink">{t("map.save_route")}</label>
                <p className="mb-3 text-caption text-ink-3">{t("map.save_route_sub")}</p>
                <input
                  id="save-route-name"
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  maxLength={60}
                  className="mb-3 min-h-touch w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-body text-ink
                             transition-colors focus:border-primary focus:outline-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="secondary" fullWidth onClick={() => setShowSaveSheet(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button fullWidth onClick={confirmSave} disabled={!saveName.trim()}>
                    {t("common.save")}
                  </Button>
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
