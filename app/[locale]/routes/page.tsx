"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Car, Bike, Footprints, Camera, Users, Clock, ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Route, RouteType } from "@/lib/types";
import { useT } from "@/lib/i18n-context";
import { isPremium, FREE_ROUTE_LIMIT } from "@/lib/premium";
import { PremiumGate } from "@/components/ui/PremiumGate";
import { useWeather } from "@/hooks/useWeather";
import { useUserLocation } from "@/hooks/useUserLocation";
import WeatherCompact from "@/components/weather/WeatherCompact";
import WeatherForecast from "@/components/weather/WeatherForecast";
import WeatherBanner from "@/components/weather/WeatherBanner";

type FilterId = RouteType | "all";

const FILTERS: { id: FilterId; emoji: string; labelKey: string }[] = [
  { id: "all",    emoji: "🗺",  labelKey: "routes.filter_all"     },
  { id: "bike",   emoji: "🚴",  labelKey: "routes.filter_cycling" },
  { id: "car",    emoji: "🚗",  labelKey: "routes.filter_car"     },
  { id: "walk",   emoji: "🚶",  labelKey: "routes.filter_walking" },
  { id: "family", emoji: "👨‍👩‍👧", labelKey: "routes.filter_family"  },
  { id: "photo",  emoji: "📷",  labelKey: "routes.filter_photo"   },
];

const ROUTE_ICON: Record<RouteType, React.ReactNode> = {
  bike:   <Bike       size={13} />,
  car:    <Car        size={13} />,
  walk:   <Footprints size={13} />,
  photo:  <Camera     size={13} />,
  family: <Users      size={13} />,
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

function SkeletonRouteCard() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-card" style={{ backgroundColor: "var(--color-surface-2)" }}>
      {/* Afbeelding-placeholder met shimmer */}
      <div className="h-52 skeleton-shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-5 skeleton-shimmer rounded w-2/3" />
        <div className="h-4 skeleton-shimmer rounded w-full" />
        <div className="h-4 skeleton-shimmer rounded w-4/5" />
        <div className="flex gap-3 pt-1">
          <div className="h-4 skeleton-shimmer rounded w-16" />
          <div className="h-4 skeleton-shimmer rounded w-16" />
        </div>
      </div>
    </div>
  );
}

function RouteListCard({ route, onClick }: { route: Route; onClick: () => void }) {
  const { t } = useT();
  const fallback = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900";
  const type = route.route_type as RouteType | undefined;
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl overflow-hidden bg-surface-2 shadow-card hover:shadow-card-hover active:scale-[0.99] transition-all duration-200 text-left"
    >
      <div className="relative h-52 overflow-hidden">
        <Image
          src={imgError ? fallback : (route.cover_image_url ?? fallback)}
          alt={route.title ?? "Route"}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        {type && (
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${ROUTE_PILL[type]} backdrop-blur-sm`}>
              {ROUTE_ICON[type]} {t(`route_type.${type}_route`)}
            </span>
          </div>
        )}

        {route.is_featured && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-amber-900">
              ⭐ {t("common.featured")}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
          {route.distance_km != null && (
            <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              {type ? ROUTE_ICON[type] : <Bike size={12} />} {route.distance_km} km
            </span>
          )}
          {route.duration_minutes != null && (
            <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
              <Clock size={12} /> {formatDuration(route.duration_minutes)}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-base font-extrabold leading-snug mb-1.5"
            style={{ color: "var(--color-text)" }}>{route.title}</h3>
        {route.description && (
          <p className="text-sm leading-relaxed line-clamp-2 mb-3"
             style={{ color: "var(--color-text-2)" }}>{route.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {route.distance_km != null && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${type ? ROUTE_PILL[type] : "bg-surface-3 text-[var(--color-text-2)]"}`}>
                {route.distance_km} km
              </span>
            )}
            {route.duration_minutes != null && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-surface-3 px-2.5 py-1 rounded-full"
                    style={{ color: "var(--color-text-2)" }}>
                <Clock size={11} /> {formatDuration(route.duration_minutes)}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-tulip-500">
            {t("routes.view_route")} <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}

export default function RoutesPage() {
  const router = useRouter();
  const { t }  = useT();

  const [routes, setRoutes]       = useState<Route[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeFilter, setFilter] = useState<FilterId>("all");
  const [premium, setPremium]     = useState(true);

  // Locatie + locatie-bewust weer (geen toestemmingskaart hier — alleen homepage)
  const location = useUserLocation();
  const weather  = useWeather(location.coords);

  useEffect(() => { setPremium(isPremium()); }, []);

  useEffect(() => {
    supabase.from("routes").select("*").eq("is_active", true)
      .order("is_featured", { ascending: false })
      .then(({ data }) => { setRoutes(data ?? []); setLoading(false); });
  }, []);

  const filtered = activeFilter === "all" ? routes : routes.filter((r) => r.route_type === activeFilter);

  return (
    <div className="min-h-screen bg-surface pb-28">

      <div className="bg-surface-2 px-5 pt-12 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push("/home")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 tap-scale"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-[var(--color-text)] leading-tight">{t("routes.title")}</h1>
            <p className="text-xs text-[var(--color-text-3)]">
              {loading ? t("common.loading") : t(routes.length === 1 ? "routes.count_one" : "routes.count", { count: routes.length })}
            </p>
          </div>
        </div>

        {/* Compact weerstrook boven de filters */}
        <WeatherCompact
          current={weather.current}
          locationLabel={location.locationLabel}
        />

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-3 pb-0.5 px-0">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            const count = f.id === "all" ? routes.length : routes.filter((r) => r.route_type === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold
                            border transition-all duration-200 active:scale-95
                            ${isActive ? "bg-tulip-500 border-tulip-500 text-white shadow-sm" : "border-[var(--color-border)] hover:border-tulip-300"}`}
                style={!isActive ? { backgroundColor: "var(--color-surface-2)", color: "var(--color-text-2)" } : {}}
              >
                <span>{f.emoji}</span>
                {t(f.labelKey)}
                {!loading && count > 0 && (
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none
                                   ${isActive ? "bg-white/25 text-white" : ""}`}
                    style={!isActive ? { backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" } : {}}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weerbanner indien slecht fietsweer (score < 40) */}
      <WeatherBanner current={weather.current} scoreThreshold={40} />

      <div className="px-4 pt-5 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRouteCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-20 h-20 rounded-full bg-tulip-50 flex items-center justify-center mb-5">
              <span className="text-4xl">🚴</span>
            </div>
            <h3 className="font-display font-bold text-[var(--color-text)] text-lg mb-1.5">
              {t("routes.no_routes_title")}
            </h3>
            <p className="text-sm text-[var(--color-text-3)] mb-5">{t("routes.no_routes_desc")}</p>
            <button
              onClick={() => setFilter("all")}
              className="px-5 py-2.5 bg-tulip-500 text-white text-sm font-bold rounded-full
                         tap-scale hover:bg-tulip-600 transition-colors"
            >
              {t("routes.show_all")}
            </button>
          </div>
        ) : (
          <>
            {filtered.slice(0, FREE_ROUTE_LIMIT).map((route) => (
              <RouteListCard key={route.id} route={route} onClick={() => router.push(`/routes/${route.slug}`)} />
            ))}
            {filtered.length > FREE_ROUTE_LIMIT && (
              <PremiumGate>
                <div className="space-y-4">
                  {filtered.slice(FREE_ROUTE_LIMIT).map((route) => (
                    <RouteListCard key={route.id} route={route} onClick={premium ? () => router.push(`/routes/${route.slug}`) : () => {}} />
                  ))}
                </div>
              </PremiumGate>
            )}
          </>
        )}
      </div>

      {/* 7-daagse voorspelling onderaan */}
      {weather.daily.length > 0 && (
        <div className="pt-6 pb-4">
          <WeatherForecast daily={weather.daily} />
        </div>
      )}

    </div>
  );
}
