"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase } from "@/lib/supabase";
import type { Location, Category } from "@/lib/types";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { BottomNav } from "@/components/ui/BottomNav";
import { X, ChevronUp, MapPin, Locate, PenLine, Trash2, BookmarkPlus, Check, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { saveCustomRoute } from "@/lib/customRoutes";

// ─── Constants ────────────────────────────────────────────────────────────────

const BOLLENSTREEK_CENTER: [number, number] = [4.56, 52.27];
const MAP_STYLE = "https://api.maptiler.com/maps/streets-v2/style.json?key=SeaEiJkthxx3KNUCV0aI";
const SOURCE_ID      = "locations";
const DRAW_SOURCE_ID = "draw-route";

// Aparte OSRM-instanties per modus (routing.openstreetmap.de)
const OSRM_BACKENDS: Record<string, string> = {
  foot:    "https://routing.openstreetmap.de/routed-foot",
  cycling: "https://routing.openstreetmap.de/routed-bike",
  driving: "https://routing.openstreetmap.de/routed-car",
};

const CATEGORY_COLOR: Record<Category, string> = {
  flower_field: "#f43f5e",
  photo_spot:   "#3b82f6",
  attraction:   "#22c55e",
  food:         "#f97316",
  parking:      "#94a3b8",
};

const MAP_SELECT = "id,title,slug,latitude,longitude,category,bloom_status,address,image_url,access_type,crowd_score";

type MapLocation = Pick<Location,
  "id" | "title" | "slug" | "latitude" | "longitude" |
  "category" | "bloom_status" | "address" | "image_url" |
  "access_type" | "crowd_score"
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
    if (activeFilter && !matchesFilter(loc, activeFilter, userCoords)) continue;
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
        color:        CATEGORY_COLOR[loc.category] ?? "#94a3b8",
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
    <div className="absolute bottom-20 left-3 right-3 z-30 bg-white rounded-3xl shadow-2xl shadow-black/15 overflow-hidden animate-slide-up">
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

// ─── PreviewCard ──────────────────────────────────────────────────────────────

function PreviewCard({
  location,
  onClose,
  onNavigate,
  t,
}: {
  location: MapLocation;
  onClose: () => void;
  onNavigate: () => void;
  t: (key: string) => string;
}) {
  const startY = useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) { startY.current = e.clientY; }
  function onPointerUp(e: React.PointerEvent) {
    if (startY.current !== null) {
      if (e.clientY - startY.current < -50) onNavigate();
      startY.current = null;
    }
  }

  const fallback = "https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=600";
  const dot = CATEGORY_COLOR[location.category] ?? "#94a3b8";

  return (
    <div
      className="absolute bottom-20 left-3 right-3 z-30 rounded-3xl bg-white shadow-2xl shadow-black/20 overflow-hidden animate-slide-up"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className="flex justify-center pt-2.5 pb-1">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>

      <div className="flex gap-3 px-4 pb-4">
        <div className="relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden">
          <Image
            src={location.image_url ?? fallback}
            alt={location.title}
            fill
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-extrabold text-gray-900 text-base leading-tight line-clamp-2 flex-1">
              {location.title}
            </h3>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {location.bloom_status && (
            <div className="mb-2">
              <BloomBadge status={location.bloom_status} />
            </div>
          )}

          {location.address && (
            <p className="flex items-center gap-1 text-[11px] text-gray-400 mb-2.5 truncate">
              <MapPin size={10} className="flex-shrink-0" />
              {location.address}
            </p>
          )}

          <button
            onClick={onNavigate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
            style={{ backgroundColor: dot }}
          >
            {t("map.view_details")}
            <ChevronUp size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapView() {
  const router = useRouter();
  const { t }  = useT();
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

  // Refs so MapLibre event handlers always see current values
  const locationsRef          = useRef<MapLocation[]>([]);
  const activeFilterRef       = useRef<FilterId | null>(null);
  const userCoordsRef         = useRef<{ lat: number; lng: number } | null>(null);
  const drawModeRef           = useRef(false);
  const waypointsRef          = useRef<[number, number][]>([]);
  const waypointMarkersRef    = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef         = useRef<maplibregl.Marker | null>(null);

  locationsRef.current    = locations;
  activeFilterRef.current = activeFilter;
  userCoordsRef.current   = userCoords;
  drawModeRef.current     = drawMode;
  waypointsRef.current    = waypoints;

  // ── Fetch locations ──
  useEffect(() => {
    supabase
      .from("locations")
      .select(MAP_SELECT)
      .eq("is_active", true)
      .then(({ data }) => { if (data) setLocations(data as MapLocation[]); });
  }, []);

  // ── Update GeoJSON source ──
  const updateSource = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    source.setData(locationsToGeoJSON(locationsRef.current, activeFilterRef.current, userCoordsRef.current));
  }, []);

  useEffect(() => { updateSource(); }, [locations, activeFilter, userCoords, updateSource]);

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
      const src = map.getSource(DRAW_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (src && cycling?.geometry) {
        src.setData({
          type: "Feature",
          geometry: cycling.geometry,
          properties: {},
        } as GeoJSON.Feature);
      }
    });
  }, [waypoints, drawMode]);

  // ── Clear drawing ──
  const clearDrawing = useCallback(() => {
    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];

    const map = mapRef.current;
    if (map && mapReadyRef.current) {
      const src = map.getSource(DRAW_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData({ type: "FeatureCollection", features: [] });
    }

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

    map.on("load", () => {
      mapReadyRef.current = true;

      // ── Location source + layers ──
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: locationsToGeoJSON(locationsRef.current, activeFilterRef.current, userCoordsRef.current),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 50,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": ["step", ["get", "point_count"], "#f43f5e", 10, "#e11d48", 30, "#9f1239"],
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 26, 30, 32],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 13,
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 9,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // ── Draw route source + layers ──
      map.addSource(DRAW_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Outline / casing
      map.addLayer({
        id: "draw-route-casing",
        type: "line",
        source: DRAW_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.8 },
      });

      // Main line
      map.addLayer({
        id: "draw-route-line",
        type: "line",
        source: DRAW_SOURCE_ID,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#E8102A", "line-width": 4, "line-opacity": 0.9 },
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

      // ── Point click → preview card ──
      map.on("click", "unclustered-point", (e) => {
        if (drawModeRef.current) return;
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const loc = locationsRef.current.find((l) => l.id === props.id);
        if (loc) setSelected(loc);
      });

      // ── Pointer cursors ──
      map.on("mouseenter", "clusters",          () => { if (!drawModeRef.current) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "clusters",          () => { if (!drawModeRef.current) map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", "unclustered-point", () => { if (!drawModeRef.current) map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "unclustered-point", () => { if (!drawModeRef.current) map.getCanvas().style.cursor = ""; });

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

        // Normal mode: dismiss preview if empty area
        const hit = map.queryRenderedFeatures(e.point, { layers: ["clusters", "unclustered-point"] });
        if (hit.length === 0) setSelected(null);
      });

      updateSource();
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

  const filters = FILTER_IDS.map((f) => ({ ...f, label: t(`map.filter_${f.id}`) }));
  const showRoutePanel = drawMode && waypoints.length >= 2;

  return (
    <div className="fixed inset-0 flex flex-col">

      {/* ── Filter chips (floating) ── */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-12 pb-3 px-4
                      bg-gradient-to-b from-white/95 via-white/80 to-transparent">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => handleFilter(f.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold
                  border transition-all duration-200 active:scale-95
                  ${isActive
                    ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200"
                    : "bg-white border-gray-200 text-gray-700 hover:border-rose-300"
                  }
                  ${f.id === "nearby" && locating ? "opacity-60" : ""}
                `}
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
              ? "Tik op de kaart om een punt toe te voegen"
              : waypoints.length === 1
              ? "Voeg nog een punt toe voor reistijden"
              : `${waypoints.length} punten — voeg meer toe of bekijk tijden`}
          </div>
        </div>
      )}

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
        {drawMode ? "Stoppen" : "Route"}
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
                <p className="text-sm font-extrabold text-gray-900">Opgeslagen!</p>
                <p className="text-xs text-gray-400">Terug te vinden onder Opgeslagen → Eigen</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-extrabold text-gray-900 mb-1">Route opslaan</p>
                <p className="text-xs text-gray-400 mb-3">Kies een naam voor deze route</p>
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
                    Annuleren
                  </button>
                  <button
                    onClick={confirmSave}
                    disabled={!saveName.trim()}
                    className="flex-1 py-3 rounded-xl bg-tulip-500 text-white text-sm font-bold
                               hover:bg-tulip-600 active:scale-95 transition-all
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Opslaan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Location preview card (hidden in draw mode) ── */}
      {selected && !drawMode && (
        <PreviewCard
          location={selected}
          onClose={() => setSelected(null)}
          onNavigate={() => router.push(`/location/${selected.slug}`)}
          t={t}
        />
      )}

      {/* ── Bottom nav ── */}
      <BottomNav active="map" />

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
