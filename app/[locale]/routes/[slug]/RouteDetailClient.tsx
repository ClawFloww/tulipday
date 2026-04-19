"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Bike, Car, Footprints, Camera, Users, Clock, MapPin, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Route, RouteStop, RouteType } from "@/lib/types";
import { useT } from "@/lib/i18n-context";
import { getOrCreateSessionId } from "@/lib/session";

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

export default function RouteDetailClient() {
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

      <div className="px-5 py-5 space-y-6">

        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A] leading-tight mb-3">{route.title}</h1>
          <div className="flex flex-wrap gap-2">
            {route.distance_km != null && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-full shadow-sm">
                {type ? ROUTE_ICON[type] : <Bike size={13} />} {route.distance_km} km
              </span>
            )}
            {route.duration_minutes != null && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-full shadow-sm">
                <Clock size={13} /> {formatDuration(route.duration_minutes)}
              </span>
            )}
            {stops.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-full shadow-sm">
                <MapPin size={13} /> {t("route_detail.spots", { count: stops.length })}
              </span>
            )}
          </div>
        </div>

        {route.description && (
          <p className="text-gray-600 text-[15px] leading-relaxed">{route.description}</p>
        )}

        {stops.length > 0 && (
          <div>
            <h2 className="text-base font-extrabold text-[#1A1A1A] mb-3">{t("route_detail.route_stops")}</h2>
            <div className="space-y-3">
              {stops.map((stop, idx) => (
                <div key={stop.id} className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-sm">
                  <div className="w-7 h-7 rounded-full bg-tulip-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-extrabold">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A1A1A] leading-snug">{stop.locations.title}</p>
                    {stop.locations.address && (
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
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

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-4 py-3 pb-safe">
        <div className="flex gap-3 max-w-lg mx-auto">
          {/* Start route → Google Maps with all stops as waypoints */}
          <button
            onClick={() => {
              const valid = stops.filter((s) => s.locations.latitude && s.locations.longitude);
              if (valid.length === 0) return;
              const origin      = `${valid[0].locations.latitude},${valid[0].locations.longitude}`;
              const destination = `${valid[valid.length - 1].locations.latitude},${valid[valid.length - 1].locations.longitude}`;
              const waypoints   = valid.slice(1, -1).map((s) => `${s.locations.latitude},${s.locations.longitude}`).join("|");
              const travelMode  = route.route_type === "bike" || route.route_type === "walk" ? (route.route_type === "bike" ? "bicycling" : "walking") : "driving";
              const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ""}&travelmode=${travelMode}`;
              window.open(url, "_blank");
            }}
            disabled={stops.filter((s) => s.locations.latitude).length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-tulip-500 text-white shadow-md shadow-tulip-200 hover:bg-tulip-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MapPin size={17} /> {t("common.navigate")}
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
