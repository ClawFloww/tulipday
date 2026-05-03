"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowLeft, Bike, Car, Footprints, Camera, Users, Clock, MapPin, Heart, Loader2, X, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Route, RouteStop, RouteType } from "@/lib/types";
import { useT } from "@/lib/i18n-context";
import { getOrCreateSessionId } from "@/lib/session";

type MapLocation = {
  id: string;
  title: string;
  category: string;
  short_description: string | null;
  image_url: string | null;
  slug: string;
  address: string | null;
  latitude: number;
  longitude: number;
};

const MAP_STYLE = "https://api.maptiler.com/maps/streets-v2/style.json?key=SeaEiJkthxx3KNUCV0aI";

const CATEGORY_COLOR: Record<string, string> = {
  flower_field: "#E8102A",
  photo_spot:   "#8b5cf6",
  attraction:   "#f59e0b",
  food:         "#10b981",
  parking:      "#6b7280",
  bike_rental:  "#a855f7",
};

const CATEGORY_LABEL: Record<string, string> = {
  flower_field: "Bollenveld",
  photo_spot:   "Fotoplek",
  attraction:   "Attractie",
  food:         "Eten & Drinken",
  parking:      "Parkeren",
  bike_rental:  "Fietsverhuur",
};

// ── Interactieve MapLibre-kaart ───────────────────────────────────────────────

function RouteInteractiveMap({
  points,
  stops,
  onLocationSelect,
}: {
  points?:           [number, number][] | null;
  stops:             RouteStop[];
  routeType?:        string | null;
  onLocationSelect:  (loc: MapLocation) => void;
}) {
  const containerRef       = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<maplibregl.Map | null>(null);
  const onSelectRef        = useRef(onLocationSelect);
  useEffect(() => { onSelectRef.current = onLocationSelect; }, [onLocationSelect]);

  // Bouw [lng, lat]-coördinaten voor MapLibre (stops hebben voorrang)
  const routeCoords: [number, number][] =
    stops.length > 0
      ? stops
          .filter((s) => s.locations.latitude != null && s.locations.longitude != null)
          .map((s) => [s.locations.longitude as number, s.locations.latitude as number])
      : (points ?? []).map(([lat, lng]) => [lng, lat]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || routeCoords.length === 0) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     MAP_STYLE,
      center:    routeCoords[0],
      zoom:      12,
      interactive: true,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", async () => {
      // Routelijn
      if (routeCoords.length > 1) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "LineString", coordinates: routeCoords },
            properties: {},
          },
        });
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.85 },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#E8102A", "line-width": 4 },
        });
      }

      // Markers: genummerde stops of alleen start/eind
      const markerDefs =
        stops.length > 0
          ? stops
              .filter((s) => s.locations.latitude)
              .map((s, i) => ({
                lngLat: [s.locations.longitude as number, s.locations.latitude as number] as [number, number],
                label:  String(i + 1),
                color:  i === 0 ? "#2D7D46" : i === stops.length - 1 ? "#E8102A" : "#E8527A",
              }))
          : routeCoords.length > 1
          ? [
              { lngLat: routeCoords[0],                      label: "S", color: "#2D7D46" },
              { lngLat: routeCoords[routeCoords.length - 1], label: "E", color: "#E8102A" },
            ]
          : [];

      markerDefs.forEach(({ lngLat, label, color }) => {
        const el = document.createElement("div");
        el.style.cssText = [
          "width:28px", "height:28px", "border-radius:50%",
          `background:${color}`, "color:white", "font-size:11px", "font-weight:800",
          "display:flex", "align-items:center", "justify-content:center",
          "border:2.5px solid white", "box-shadow:0 2px 8px rgba(0,0,0,.35)",
          "font-family:system-ui,sans-serif",
        ].join(";");
        el.textContent = label;
        new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
      });

      // Locaties ophalen binnen de bounding box van de route
      if (routeCoords.length > 0) {
        const lngs   = routeCoords.map((c) => c[0]);
        const lats   = routeCoords.map((c) => c[1]);
        const buf    = 0.04; // ~3 km buffer
        const { data: locations } = await supabase
          .from("locations")
          .select("id, title, category, latitude, longitude, short_description, image_url, slug, address")
          .eq("is_active", true)
          .gte("latitude",  Math.min(...lats)  - buf)
          .lte("latitude",  Math.max(...lats)  + buf)
          .gte("longitude", Math.min(...lngs) - buf)
          .lte("longitude", Math.max(...lngs) + buf);

        (locations ?? []).forEach((loc) => {
          if (!loc.latitude || !loc.longitude) return;
          const color = CATEGORY_COLOR[loc.category as string] ?? "#6b7280";
          const el    = document.createElement("div");
          el.style.cssText = [
            "width:14px", "height:14px", "border-radius:50%",
            `background:${color}`,
            "border:2px solid white",
            "box-shadow:0 1px 4px rgba(0,0,0,.35)",
            "cursor:pointer",
            "transition:transform 0.15s",
          ].join(";");
          el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.4)"; });
          el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            onSelectRef.current(loc as MapLocation);
          });
          new maplibregl.Marker({ element: el })
            .setLngLat([loc.longitude, loc.latitude])
            .addTo(map);
        });
      }

      // Pas bounds aan op de route
      if (routeCoords.length > 1) {
        const bounds = routeCoords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(routeCoords[0], routeCoords[0]),
        );
        map.fitBounds(bounds, { padding: 52, maxZoom: 14, duration: 600 });
      }
    });

    // Huidige locatie als blauwe stip
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mapRef.current) return;
          const el = document.createElement("div");
          el.style.cssText = [
            "width:16px", "height:16px", "border-radius:50%",
            "background:#2563eb", "border:3px solid white",
            "box-shadow:0 0 0 4px rgba(37,99,235,0.25)",
          ].join(";");
          new maplibregl.Marker({ element: el })
            .setLngLat([pos.coords.longitude, pos.coords.latitude])
            .addTo(mapRef.current);
        },
        undefined,
        { timeout: 8000, maximumAge: 60000 },
      );
    }

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (routeCoords.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden w-full"
      style={{ height: 300 }}
    />
  );
}

// ── Route type helpers ────────────────────────────────────────────────────────

const ROUTE_ICON: Record<RouteType, React.ReactNode> = {
  bike:   <Bike       size={14} />,
  car:    <Car        size={14} />,
  walk:   <Footprints size={14} />,
  photo:  <Camera     size={14} />,
  family: <Users      size={14} />,
};

const ROUTE_PILL: Record<RouteType, string> = {
  bike:   "bg-sky-100 text-sky-700",
  car:    "bg-orange-100 text-orange-700",
  walk:   "bg-forest-100 text-forest-600",
  photo:  "bg-tulip-100 text-tulip-600",
  family: "bg-petal/40 text-tulip-600",
};

function formatDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// ── Hoofdcomponent ────────────────────────────────────────────────────────────

export default function RouteDetailClient() {
  const { slug, locale } = useParams<{ slug: string; locale: string }>();
  const router           = useRouter();
  const { t }    = useT();

  const [route,            setRoute]           = useState<Route | null>(null);
  const [stops,            setStops]           = useState<RouteStop[]>([]);
  const [loading,          setLoading]         = useState(true);
  const [notFound,         setNotFound]        = useState(false);
  const [saved,            setSaved]           = useState(false);
  const [saving,           setSaving]          = useState(false);
  const [imgError,         setImgError]        = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);

  const fallback = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200";

  useEffect(() => {
    if (!slug) return;
    async function fetchRoute() {
      const { data: r, error } = await supabase
        .from("routes").select("*").eq("slug", slug).eq("is_active", true).single();
      if (error || !r) { setNotFound(true); setLoading(false); return; }
      setRoute(r);

      const { data: s } = await supabase
        .from("route_stops").select("id, sort_order, locations(*)")
        .eq("route_id", r.id).order("sort_order");
      setStops((s as unknown as RouteStop[]) ?? []);
      setLoading(false);
    }
    fetchRoute();
  }, [slug]);

  useEffect(() => {
    if (!route) return;
    const sessionId = getOrCreateSessionId();
    supabase.from("saved_items").select("id")
      .eq("session_id", sessionId).eq("item_type", "route").eq("item_id", route.id)
      .maybeSingle().then(({ data }) => setSaved(!!data));
  }, [route]);

  async function handleSave() {
    if (!route || saving) return;
    setSaving(true);
    const sessionId = getOrCreateSessionId();
    if (saved) {
      await supabase.from("saved_items").delete()
        .eq("session_id", sessionId).eq("item_type", "route").eq("item_id", route.id);
      setSaved(false);
    } else {
      await supabase.from("saved_items").insert({ session_id: sessionId, item_type: "route", item_id: route.id });
      setSaved(true);
    }
    setSaving(false);
  }

  function handleNavigate() {
    const travelMode = route?.route_type === "bike"
      ? "bicycling"
      : route?.route_type === "walk"
      ? "walking"
      : "driving";

    const validStops = stops.filter((s) => s.locations.latitude && s.locations.longitude);
    if (validStops.length > 0) {
      const origin      = `${validStops[0].locations.latitude},${validStops[0].locations.longitude}`;
      const destination = `${validStops[validStops.length - 1].locations.latitude},${validStops[validStops.length - 1].locations.longitude}`;
      const waypoints   = validStops.slice(1, -1).map((s) => `${s.locations.latitude},${s.locations.longitude}`).join("|");
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=${travelMode}`, "_blank");
    } else if (route?.geometry_points && route.geometry_points.length > 1) {
      const pts         = route.geometry_points;
      const origin      = `${pts[0][0]},${pts[0][1]}`;
      const destination = `${pts[pts.length - 1][0]},${pts[pts.length - 1][1]}`;
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${travelMode}`, "_blank");
    }
  }

  const canNavigate =
    stops.some((s) => s.locations.latitude) ||
    (route?.geometry_points != null && route.geometry_points.length > 1);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-tulip-400 animate-spin" />
          <p className="text-sm" style={{ color: "var(--color-text-3)" }}>{t("route_detail.loading")}</p>
        </div>
      </div>
    );
  }

  if (notFound || !route) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ backgroundColor: "var(--color-surface)" }}>
        <span className="text-5xl">🗺</span>
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{t("route_detail.not_found")}</h2>
        <button onClick={() => router.back()} className="px-5 py-2.5 bg-tulip-500 text-white rounded-xl text-sm font-bold">
          {t("common.go_back")}
        </button>
      </div>
    );
  }

  const type = route.route_type as RouteType | undefined;

  return (
    <div className="min-h-screen pb-44" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* Cover afbeelding */}
      <div className="relative h-64 sm:h-80 overflow-hidden bg-gray-200">
        <Image
          src={imgError ? fallback : (route.cover_image_url ?? fallback)}
          alt={route.title}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
        <button onClick={() => router.back()}
          className="absolute top-12 left-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        {type && (
          <div className="absolute bottom-4 left-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${ROUTE_PILL[type]} backdrop-blur-sm`}>
              {ROUTE_ICON[type]} {t(`route_type.${type}_route`)}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Titel + badges */}
        <div>
          <h1 className="text-2xl font-extrabold leading-tight mb-3" style={{ color: "var(--color-text)" }}>{route.title}</h1>
          <div className="flex flex-wrap gap-2">
            {route.distance_km != null && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
                    style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-2)" }}>
                {type ? ROUTE_ICON[type] : <Bike size={13} />} {route.distance_km} km
              </span>
            )}
            {route.duration_minutes != null && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
                    style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-2)" }}>
                <Clock size={13} /> {formatDuration(route.duration_minutes)}
              </span>
            )}
            {stops.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
                    style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-2)" }}>
                <MapPin size={13} /> {t("route_detail.spots", { count: stops.length })}
              </span>
            )}
          </div>
        </div>

        {route.description && (
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--color-text-2)" }}>{route.description}</p>
        )}

        {route.attribution && (
          <p className="text-xs" style={{ color: "var(--color-text-3)", opacity: 0.7 }}>
            {route.attribution}
            {route.source_url && (
              <> · <a href={route.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">bron</a></>
            )}
            {route.license && ` · ${route.license}`}
          </p>
        )}

        {/* Interactieve kaart */}
        <RouteInteractiveMap
          points={route.geometry_points}
          stops={stops}
          routeType={route.route_type}
          onLocationSelect={setSelectedLocation}
        />

        {/* Routestops */}
        {stops.length > 0 && (
          <div>
            <h2 className="text-base font-extrabold mb-3" style={{ color: "var(--color-text)" }}>{t("route_detail.route_stops")}</h2>
            <div className="space-y-3">
              {stops.map((stop, idx) => (
                <div key={stop.id} className="flex items-start gap-3 rounded-2xl p-4 shadow-sm"
                     style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                  <div className="w-7 h-7 rounded-full bg-tulip-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-extrabold">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-snug" style={{ color: "var(--color-text)" }}>{stop.locations.title}</p>
                    {stop.locations.address && (
                      <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: "var(--color-text-3)" }}>
                        <MapPin size={10} className="flex-shrink-0" />
                        <span className="truncate">{stop.locations.address}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Locatie info-sheet */}
      {selectedLocation && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setSelectedLocation(null)}
        >
          <div
            className="absolute left-0 right-0 rounded-t-3xl shadow-2xl p-5 pb-8"
            style={{
              bottom: "calc(60px + env(safe-area-inset-bottom))",
              backgroundColor: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: "var(--color-border)" }} />

            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                {/* Categorie badge */}
                <span
                  className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2 text-white"
                  style={{ backgroundColor: CATEGORY_COLOR[selectedLocation.category] ?? "#6b7280" }}
                >
                  {CATEGORY_LABEL[selectedLocation.category] ?? selectedLocation.category}
                </span>
                <h3 className="text-base font-extrabold leading-snug" style={{ color: "var(--color-text)" }}>
                  {selectedLocation.title}
                </h3>
                {selectedLocation.address && (
                  <p className="flex items-center gap-1 text-xs mt-1" style={{ color: "var(--color-text-3)" }}>
                    <MapPin size={10} className="flex-shrink-0" />
                    {selectedLocation.address}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "var(--color-surface)", color: "var(--color-text-3)" }}
              >
                <X size={16} />
              </button>
            </div>

            {selectedLocation.short_description && (
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--color-text-2)" }}>
                {selectedLocation.short_description}
              </p>
            )}

            <button
              onClick={() => router.push(`/${locale}/locations/${selectedLocation.slug}`)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-tulip-500 hover:bg-tulip-600 active:scale-[0.98] transition-all"
            >
              Bekijk locatie <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Actie-balk */}
      <div
        className="fixed left-0 right-0 z-40 px-4 py-3"
        style={{
          bottom: "calc(60px + env(safe-area-inset-bottom))",
          backgroundColor: "var(--color-surface-2)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={handleNavigate}
            disabled={!canNavigate}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-tulip-500 text-white shadow-md shadow-tulip-200 hover:bg-tulip-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MapPin size={17} /> {t("common.navigate")}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-[0.98]
                        ${saved ? "bg-tulip-500 border-tulip-500 text-white shadow-md shadow-tulip-200" : "border-tulip-200 text-tulip-500 hover:border-tulip-400"}`}
            style={!saved ? { backgroundColor: "var(--color-surface)" } : {}}
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Heart size={17} className={saved ? "fill-white" : ""} />}
            {saved ? t("common.saved") : t("common.save")}
          </button>
        </div>
      </div>

    </div>
  );
}
