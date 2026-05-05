"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Bike, Car, Footprints, Camera, Users, Clock, MapPin, Heart, Loader2, X, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Route, RouteStop, RouteType } from "@/lib/types";
import { useT } from "@/lib/i18n-context";
import { getOrCreateSessionId } from "@/lib/session";
import {
  RouteInteractiveMap,
  type MapLocation,
  CATEGORY_COLOR,
  CATEGORY_LABEL,
} from "@/components/map/RouteInteractiveMap";

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
  const [nearbyLocations,  setNearbyLocations] = useState<MapLocation[]>([]);

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
      const fetchedStops = (s as unknown as RouteStop[]) ?? [];
      setStops(fetchedStops);
      setLoading(false);

      // Bezienswaardigheden ophalen binnen de bounding box van de route
      const coords: [number, number][] =
        fetchedStops.length > 0
          ? fetchedStops
              .filter((st) => st.locations.latitude && st.locations.longitude)
              .map((st) => [st.locations.longitude as number, st.locations.latitude as number])
          : (r.geometry_points ?? []).map(([lat, lng]: [number, number]) => [lng, lat]);

      if (coords.length > 0) {
        const lngs = coords.map((c) => c[0]);
        const lats = coords.map((c) => c[1]);
        const buf  = 0.009; // ~1 km buffer
        const { data: locs } = await supabase
          .from("locations")
          .select("id, title, category, latitude, longitude, short_description, image_url, slug, address, bloom_status")
          .eq("is_active", true)
          .gte("latitude",  Math.min(...lats)  - buf)
          .lte("latitude",  Math.max(...lats)  + buf)
          .gte("longitude", Math.min(...lngs) - buf)
          .lte("longitude", Math.max(...lngs) + buf);
        setNearbyLocations((locs as MapLocation[]) ?? []);
      }
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
          locations={nearbyLocations}
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

        {/* Bezienswaardigheden onderweg */}
        {nearbyLocations.length > 0 && (
          <div>
            <h2 className="text-base font-extrabold mb-3" style={{ color: "var(--color-text)" }}>
              Bezienswaardigheden onderweg
            </h2>
            <p className="text-xs mb-4 -mt-2" style={{ color: "var(--color-text-3)" }}>
              {nearbyLocations.length} plekken langs deze route
            </p>
            <div className="space-y-3">
              {nearbyLocations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc)}
                  className="w-full flex items-stretch gap-3 rounded-2xl overflow-hidden text-left shadow-sm active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  {/* Foto */}
                  <div className="w-24 flex-shrink-0 relative bg-gray-100">
                    {loc.image_url ? (
                      <Image
                        src={loc.image_url}
                        alt={loc.title}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ backgroundColor: CATEGORY_COLOR[loc.category] ?? "#6b7280", opacity: 0.15 }}
                      />
                    )}
                    {/* Categorie-kleurstreep links */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: CATEGORY_COLOR[loc.category] ?? "#6b7280" }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 py-3 pr-3">
                    <span
                      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 text-white"
                      style={{ backgroundColor: CATEGORY_COLOR[loc.category] ?? "#6b7280" }}
                    >
                      {CATEGORY_LABEL[loc.category] ?? loc.category}
                    </span>
                    <p className="text-sm font-bold leading-snug line-clamp-1" style={{ color: "var(--color-text)" }}>
                      {loc.title}
                    </p>
                    {loc.short_description && (
                      <p className="text-xs leading-relaxed mt-0.5 line-clamp-2" style={{ color: "var(--color-text-3)" }}>
                        {loc.short_description}
                      </p>
                    )}
                  </div>

                  {/* Pijl */}
                  <div className="flex items-center pr-3 flex-shrink-0" style={{ color: "var(--color-text-3)" }}>
                    <ChevronRight size={16} />
                  </div>
                </button>
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
