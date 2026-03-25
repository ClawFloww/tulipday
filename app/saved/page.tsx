"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Heart, Trash2, MapPin, Clock, ChevronRight,
  Bike, Car, Footprints, Camera, Users, Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrCreateSessionId } from "@/lib/session";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { BottomNav } from "@/components/ui/BottomNav";
import { Location, Route, RouteType } from "@/lib/types";
import { useT } from "@/lib/i18n-context";

type Tab = "locations" | "routes";

const ROUTE_ICON: Record<RouteType, React.ReactNode> = {
  bike:   <Bike       size={11} />,
  car:    <Car        size={11} />,
  walk:   <Footprints size={11} />,
  photo:  <Camera     size={11} />,
  family: <Users      size={11} />,
};

const ROUTE_PILL: Record<RouteType, string> = {
  bike:   "bg-sky-100 text-sky-700",
  car:    "bg-orange-100 text-orange-700",
  walk:   "bg-forest-100 text-forest-600",
  photo:  "bg-tulip-100 text-tulip-600",
  family: "bg-petal/40 text-tulip-600",
};

function formatDuration(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function LocationRow({ location, savedId, onDelete, onNavigate }: {
  location: Location; savedId: string; onDelete: (id: string) => void; onNavigate: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [leaving,  setLeaving]  = useState(false);
  const fallback = "https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=400";

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("saved_items").delete().eq("id", savedId);
    setLeaving(true);
    setTimeout(() => onDelete(savedId), 280);
  }

  return (
    <div className={`flex items-center gap-3 bg-white rounded-2xl shadow-card p-3 transition-all duration-280
                     ${leaving ? "opacity-0 scale-95 -translate-x-4" : "opacity-100"}`}>
      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 cursor-pointer" onClick={onNavigate}>
        <Image src={location.image_url ?? fallback} alt={location.title} fill className="object-cover" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onNavigate}>
        <h3 className="text-sm font-extrabold text-[#1A1A1A] leading-tight line-clamp-1">{location.title}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {location.bloom_status && <BloomBadge status={location.bloom_status} />}
        </div>
        {location.address && (
          <p className="flex items-center gap-1 text-[11px] text-gray-400 mt-1 truncate">
            <MapPin size={9} className="flex-shrink-0 text-tulip-300" /> {location.address}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onNavigate} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-tulip-50 flex items-center justify-center text-gray-400 hover:text-tulip-500 transition-colors">
          <ChevronRight size={16} />
        </button>
        <button onClick={handleDelete} disabled={deleting} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

function RouteRow({ route, savedId, onDelete, onNavigate }: {
  route: Route; savedId: string; onDelete: (id: string) => void; onNavigate: () => void;
}) {
  const { t } = useT();
  const [deleting, setDeleting] = useState(false);
  const [leaving,  setLeaving]  = useState(false);
  const fallback = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400";
  const type = route.route_type as RouteType | undefined;

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("saved_items").delete().eq("id", savedId);
    setLeaving(true);
    setTimeout(() => onDelete(savedId), 280);
  }

  return (
    <div className={`flex items-center gap-3 bg-white rounded-2xl shadow-card p-3 transition-all duration-280
                     ${leaving ? "opacity-0 scale-95 -translate-x-4" : "opacity-100"}`}>
      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 cursor-pointer" onClick={onNavigate}>
        <Image src={route.cover_image_url ?? fallback} alt={route.title ?? "Route"} fill className="object-cover" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onNavigate}>
        <h3 className="text-sm font-extrabold text-[#1A1A1A] leading-tight line-clamp-1">{route.title}</h3>
        {type && (
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ROUTE_PILL[type]}`}>
            {ROUTE_ICON[type]} {t(`route_type.${type}`)}
          </span>
        )}
        <div className="flex items-center gap-3 mt-1">
          {route.distance_km != null && <span className="text-[11px] text-gray-400 font-medium">{route.distance_km} km</span>}
          {route.duration_minutes != null && (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <Clock size={9} /> {formatDuration(route.duration_minutes)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={onNavigate} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-tulip-50 flex items-center justify-center text-gray-400 hover:text-tulip-500 transition-colors">
          <ChevronRight size={16} />
        </button>
        <button onClick={handleDelete} disabled={deleting} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40">
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ tab, onBrowse }: { tab: Tab; onBrowse: () => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <div className="w-20 h-20 rounded-full bg-tulip-50 flex items-center justify-center mb-5">
        <Heart size={32} className="text-tulip-200" />
      </div>
      <h3 className="text-base font-extrabold text-[#1A1A1A] mb-2">
        {t(tab === "locations" ? "saved_page.empty_locs_title" : "saved_page.empty_routes_title")}
      </h3>
      <p className="text-sm text-gray-400 mb-6 leading-relaxed">
        {t(tab === "locations" ? "saved_page.empty_locs_desc" : "saved_page.empty_routes_desc")}
      </p>
      <button
        onClick={onBrowse}
        className="px-5 py-2.5 bg-tulip-500 text-white rounded-xl text-sm font-bold shadow-md shadow-tulip-200 hover:bg-tulip-600 active:scale-95 transition-all"
      >
        {t(tab === "locations" ? "saved_page.browse_locations" : "saved_page.browse_routes")}
      </button>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-3 animate-pulse">
      <div className="w-16 h-16 rounded-xl bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
      <div className="flex gap-1">
        <div className="w-8 h-8 rounded-full bg-gray-100" />
        <div className="w-8 h-8 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

interface SavedEntry { savedId: string; itemId: string }

export default function SavedPage() {
  const router = useRouter();
  const { t }  = useT();

  const [tab, setTab]         = useState<Tab>("locations");
  const [loading, setLoading] = useState(true);
  const [locEntries,   setLocEntries]   = useState<SavedEntry[]>([]);
  const [routeEntries, setRouteEntries] = useState<SavedEntry[]>([]);
  const [locations,    setLocations]    = useState<Record<string, Location>>({});
  const [routes,       setRoutes]       = useState<Record<string, Route>>({});

  const loadSaved = useCallback(async () => {
    setLoading(true);
    const sessionId = getOrCreateSessionId();
    const { data: saved } = await supabase.from("saved_items").select("id, item_type, item_id")
      .eq("session_id", sessionId).order("created_at", { ascending: false });

    if (!saved || saved.length === 0) {
      setLocEntries([]); setRouteEntries([]); setLoading(false); return;
    }

    const locIds   = saved.filter((s) => s.item_type === "location").map((s) => s.item_id);
    const routeIds = saved.filter((s) => s.item_type === "route").map((s) => s.item_id);

    const [{ data: locData }, { data: routeData }] = await Promise.all([
      locIds.length   > 0 ? supabase.from("locations").select("*").in("id", locIds)  : { data: [] },
      routeIds.length > 0 ? supabase.from("routes").select("*").in("id", routeIds)   : { data: [] },
    ]);

    const locMap: Record<string, Location> = {};
    (locData ?? []).forEach((l: Location) => { locMap[l.id] = l; });
    setLocations(locMap);

    const routeMap: Record<string, Route> = {};
    (routeData ?? []).forEach((r: Route) => { routeMap[r.id] = r; });
    setRoutes(routeMap);

    setLocEntries(saved.filter((s) => s.item_type === "location").map((s) => ({ savedId: s.id, itemId: s.item_id })));
    setRouteEntries(saved.filter((s) => s.item_type === "route").map((s) => ({ savedId: s.id, itemId: s.item_id })));
    setLoading(false);
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const totalSaved = locEntries.length + routeEntries.length;

  return (
    <div className="min-h-screen bg-warm pb-28">

      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-tulip-50 flex items-center justify-center flex-shrink-0">
            <Heart size={20} className="text-tulip-500 fill-tulip-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#1A1A1A] leading-tight">{t("saved_page.title")}</h1>
            <p className="text-xs text-gray-400">
              {loading
                ? t("common.loading")
                : totalSaved === 0
                ? t("saved_page.nothing_saved")
                : t(totalSaved === 1 ? "saved_page.item_saved" : "saved_page.items_saved", { count: totalSaved })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {(["locations", "routes"] as Tab[]).map((tabId) => {
            const count = tabId === "locations" ? locEntries.length : routeEntries.length;
            const isActive = tab === tabId;
            return (
              <button key={tabId} onClick={() => setTab(tabId)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all duration-200
                            ${isActive ? "border-tulip-500 bg-tulip-500 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-tulip-300"}`}>
                {tabId === "locations" ? "📍" : "🗺"}{" "}
                {t(tabId === "locations" ? "saved_page.tab_locations" : "saved_page.tab_routes")}
                {!loading && (
                  <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-full leading-none
                                   ${isActive ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : tab === "locations" ? (
          locEntries.length === 0 ? (
            <EmptyState tab="locations" onBrowse={() => router.push("/home")} />
          ) : (
            locEntries.map(({ savedId, itemId }) => {
              const loc = locations[itemId];
              if (!loc) return null;
              return <LocationRow key={savedId} location={loc} savedId={savedId}
                onDelete={(id) => setLocEntries((p) => p.filter((e) => e.savedId !== id))}
                onNavigate={() => router.push(`/location/${loc.slug}`)} />;
            })
          )
        ) : (
          routeEntries.length === 0 ? (
            <EmptyState tab="routes" onBrowse={() => router.push("/routes")} />
          ) : (
            routeEntries.map(({ savedId, itemId }) => {
              const route = routes[itemId];
              if (!route) return null;
              return <RouteRow key={savedId} route={route} savedId={savedId}
                onDelete={(id) => setRouteEntries((p) => p.filter((e) => e.savedId !== id))}
                onNavigate={() => router.push(`/routes/${route.slug}`)} />;
            })
          )
        )}
      </div>

      <BottomNav active="saved" />
    </div>
  );
}
