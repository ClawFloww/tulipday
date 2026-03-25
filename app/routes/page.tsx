"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Car, Bike, Footprints, Camera, Users, Clock, ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Route, RouteType } from "@/lib/types";
import { BottomNav } from "@/components/ui/BottomNav";
import { useT } from "@/lib/i18n-context";

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
    <div className="rounded-2xl overflow-hidden bg-white shadow-card animate-pulse">
      <div className="h-52 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-4/5" />
        <div className="flex gap-3 pt-1">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-16" />
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
      className="w-full rounded-2xl overflow-hidden bg-white shadow-card hover:shadow-card-hover active:scale-[0.99] transition-all duration-200 text-left"
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
        <h3 className="text-base font-extrabold text-[#1A1A1A] leading-snug mb-1.5">{route.title}</h3>
        {route.description && (
          <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">{route.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {route.distance_km != null && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${type ? ROUTE_PILL[type] : "bg-gray-100 text-gray-600"}`}>
                {route.distance_km} km
              </span>
            )}
            {route.duration_minutes != null && (
              <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
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

  useEffect(() => {
    supabase.from("routes").select("*").eq("is_active", true)
      .order("is_featured", { ascending: false })
      .then(({ data }) => { setRoutes(data ?? []); setLoading(false); });
  }, []);

  const filtered = activeFilter === "all" ? routes : routes.filter((r) => r.route_type === activeFilter);

  return (
    <div className="min-h-screen bg-warm pb-28">

      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push("/home")}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#1A1A1A] leading-tight">{t("routes.title")}</h1>
            <p className="text-xs text-gray-400">
              {loading ? t("common.loading") : t(routes.length === 1 ? "routes.count_one" : "routes.count", { count: routes.length })}
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            const count = f.id === "all" ? routes.length : routes.filter((r) => r.route_type === f.id).length;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold
                            border transition-all duration-200 active:scale-95
                            ${isActive ? "bg-tulip-500 border-tulip-500 text-white shadow-sm" : "bg-white border-gray-200 text-gray-600 hover:border-tulip-300"}`}
              >
                <span>{f.emoji}</span>
                {t(f.labelKey)}
                {!loading && count > 0 && (
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none
                                   ${isActive ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRouteCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🌷</span>
            <p className="text-gray-500 font-bold">{t("routes.no_routes_title")}</p>
            <p className="text-sm text-gray-400 mt-1">{t("routes.no_routes_desc")}</p>
            <button onClick={() => setFilter("all")} className="mt-4 text-sm text-tulip-500 font-bold hover:text-tulip-600">
              {t("routes.show_all")}
            </button>
          </div>
        ) : (
          filtered.map((route) => (
            <RouteListCard key={route.id} route={route} onClick={() => router.push(`/routes/${route.slug}`)} />
          ))
        )}
      </div>

      <BottomNav active="routes" />
    </div>
  );
}
