"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, Bike, Car, Footprints, Camera, Users,
  MapPin, Heart, Navigation, Loader2, ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrCreateSessionId } from "@/lib/session";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { RouteMiniMap } from "@/components/map/RouteMiniMap";
import { Route, RouteType, Location } from "@/lib/types";
import { useT } from "@/lib/i18n-context";

const ROUTE_ICON: Record<RouteType, React.ReactNode> = {
  bike:   <Bike       size={15} />,
  car:    <Car        size={15} />,
  walk:   <Footprints size={15} />,
  photo:  <Camera     size={15} />,
  family: <Users      size={15} />,
};

const ROUTE_PILL: Record<RouteType, string> = {
  bike:   "bg-sky-100 text-sky-700",
  car:    "bg-orange-100 text-orange-700",
  walk:   "bg-forest-100 text-forest-600",
  photo:  "bg-tulip-100 text-tulip-600",
  family: "bg-petal/40 text-tulip-600",
};

const ROUTE_ACCENT: Record<RouteType, string> = {
  bike:   "#0ea5e9",
  car:    "#f97316",
  walk:   "#2D6A4F",
  photo:  "#E8334A",
  family: "#F8B4BC",
};

function formatDuration(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function StopCard({ location, index, isLast, onClick }: {
  location: Location; index: number; isLast: boolean; onClick: () => void;
}) {
  const fallback = "https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=400";
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-tulip-500 text-white flex items-center justify-center text-xs font-extrabold shadow-md shadow-tulip-200 flex-shrink-0">
          {index + 1}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-tulip-100 mt-1 min-h-[24px]" />}
      </div>
      <button
        onClick={onClick}
        className="flex-1 flex gap-3 mb-4 p-3 bg-white rounded-2xl shadow-card hover:shadow-card-hover active:scale-[0.98] transition-all text-left"
      >
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
          <img src={location.image_url ?? fallback} alt={location.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-extrabold text-[#1A1A1A] leading-tight mb-1 line-clamp-1">{location.title}</h4>
          {location.bloom_status && <div className="mb-1.5"><BloomBadge status={location.bloom_status} /></div>}
          {location.short_description && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-snug">{location.short_description}</p>
          )}
          {location.address && (
            <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1.5">
              <MapPin size={9} className="flex-shrink-0" /><span className="truncate">{location.address}</span>
            </p>
          )}
        </div>
        <ChevronRight size={16} className="text-gray-300 flex-shrink-0 self-center" />
      </button>
    </div>
  );
}

interface RouteStop { id: string; sort_order: number; locations: Location }

export default function RouteDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router   = useRouter();
  const { t }    = useT();

  const [route,    setRoute]    = useState<Route | null>(null);
  const [stops,    setStops]    = useState<RouteStop[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [imgError, setImgError] = useState(false);

  const fallback = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200";

  useEffect(() => {
    if (!slug) return;
    supabase.from("routes").select("*").eq("slug", slug).eq("is_active", true).single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); setLoading(false); return; }
        setRoute(data);
        supabase.from("route_stops").select("id, sort_order, locations(*)")
          .eq("route_id", data.id).order("sort_order")
          .then(({ data: stopsData }) => { setStops((stopsData as unknown as RouteStop[]) ?? []); setLoading(false); });
      });
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
    if (!stops.length) return;
    const first = stops[0].locations;
    if (!first?.latitude || !first?.longitude) return;
    const waypoints = stops.slice(1, -1).map((s) => `${s.locations.latitude},${s.locations.longitude}`).join("|");
    const last = stops[stops.length - 1]?.locations;
    const dest = last ? `${last.latitude},${last.longitude}` : `${first.latitude},${first.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${first.latitude},${first.longitude}&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ""}`;
    window.open(url, "_blank");
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-tulip-400 animate-spin" />
          <p className="text-sm text-gray-400">{t("route_detail.loading")}</p>
        </div>
      </div>
    );
  }

  if (notFound || !route) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="text-5xl">🗺</span>
        <h2 className="text-xl font-bold text-[#1A1A1A]">{t("route_detail.not_found")}</h2>
        <button onClick={() => router.back()} className="px-5 py-2.5 bg-tulip-500 text-white rounded-xl text-sm font-bold">
          {t("common.go_back")}
        </button>
      </div>
    );
  }

  const type = route.route_type as RouteType | undefined;

  return (
    <div className="min-h-screen bg-warm pb-32">

      <div className="relative h-64 sm:h-80 overflow-hidden bg-gray-200">
        <img
          src={imgError ? fallback : (route.cover_image_url ?? fallback)}
          alt={route.title ?? "Route"}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/20" />
        <button onClick={() => router.back()}
          className="absolute top-12 left-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        {type && (
          <div className="absolute top-12 right-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${ROUTE_PILL[type]}`}>
              {ROUTE_ICON[type]} {t(`route_type.${type}_route`)}
            </span>
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 flex-wrap">
          {route.distance_km != null && (
            <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              {type ? ROUTE_ICON[type] : <Bike size={12} />} {route.distance_km} km
            </span>
          )}
          {route.duration_minutes != null && (
            <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <Clock size={12} /> {formatDuration(route.duration_minutes)}
            </span>
          )}
          {stops.length > 0 && (
            <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <MapPin size={12} /> {t("route_detail.spots", { count: stops.length })}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-5 space-y-6">

        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A] leading-tight mb-2">{route.title}</h1>
          {route.description && <p className="text-[15px] text-gray-600 leading-relaxed">{route.description}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "route_detail.distance", value: route.distance_km ? `${route.distance_km} km` : "—",                     icon: type ? ROUTE_ICON[type] : <Bike size={16} /> },
            { key: "route_detail.duration", value: route.duration_minutes ? formatDuration(route.duration_minutes) : "—",    icon: <Clock size={16} /> },
            { key: "route_detail.stops_label", value: stops.length > 0 ? t("route_detail.spots", { count: stops.length }) : "—", icon: <MapPin size={16} /> },
          ].map(({ key, value, icon }) => (
            <div key={key} className="bg-white rounded-2xl p-3.5 shadow-card text-center">
              <div className="flex justify-center text-tulip-400 mb-1.5">{icon}</div>
              <p className="text-base font-extrabold text-[#1A1A1A]">{value}</p>
              <p className="text-[11px] text-gray-400 font-medium">{t(key)}</p>
            </div>
          ))}
        </div>

        {stops.filter((s) => s.locations.latitude && s.locations.longitude).length >= 1 && (
          <div>
            <h2 className="text-base font-extrabold text-[#1A1A1A] mb-3">{t("route_detail.route_map")}</h2>
            <RouteMiniMap
              stops={stops
                .filter((s) => s.locations.latitude != null && s.locations.longitude != null)
                .map((s) => ({ lat: s.locations.latitude!, lng: s.locations.longitude!, label: s.locations.title }))}
              accentColor={type ? ROUTE_ACCENT[type] : "#E8334A"}
              onExpand={handleNavigate}
            />
          </div>
        )}

        {stops.length > 0 && (
          <div>
            <h2 className="text-base font-extrabold text-[#1A1A1A] mb-4">{t("route_detail.route_stops")}</h2>
            {stops.map((stop, i) => (
              <StopCard
                key={stop.id}
                location={stop.locations}
                index={i}
                isLast={i === stops.length - 1}
                onClick={() => router.push(`/location/${stop.locations.slug}`)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={handleNavigate}
            disabled={stops.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl
                       bg-tulip-500 text-white font-bold text-sm shadow-md shadow-tulip-200
                       hover:bg-tulip-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Navigation size={17} /> {t("route_detail.start_route")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-[0.98]
                        ${saved ? "bg-tulip-500 border-tulip-500 text-white shadow-md shadow-tulip-200" : "bg-white border-tulip-200 text-tulip-500 hover:border-tulip-400"}`}
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Heart size={17} className={saved ? "fill-white" : ""} />}
            {saved ? t("common.saved") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
