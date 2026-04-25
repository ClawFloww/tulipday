"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Heart, Trash2, MapPin, Clock, ChevronRight,
  Bike, Car, Footprints, Camera, Users, Loader2,
  Share2, Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrCreateSessionId } from "@/lib/session";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { Location, Route, RouteType } from "@/lib/types";
import { useT } from "@/lib/i18n-context";
import { getCustomRoutes, deleteCustomRoute, updateCustomRoute, type CustomRoute } from "@/lib/customRoutes";
import { shareCustomRoute } from "@/lib/sharedRoutes";

type Tab = "locations" | "routes" | "custom";

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

function ShareButton({ url, title }: { url: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: title ?? "TulipDay", url }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={handleShare}
      className="w-8 h-8 rounded-full hover:bg-tulip-50 flex items-center justify-center hover:text-tulip-500 transition-colors"
      style={{ backgroundColor: "var(--color-surface-3)", color: copied ? "#22c55e" : "var(--color-text-3)" }}>
      {copied ? <Check size={14} /> : <Share2 size={14} />}
    </button>
  );
}

function LocationRow({ location, savedId, onDelete, onNavigate }: {
  location: Location; savedId: string; onDelete: (id: string) => void; onNavigate: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [leaving,  setLeaving]  = useState(false);
  const fallback = "https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=400";
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/location/${location.slug}`
    : `/location/${location.slug}`;

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("saved_items").delete().eq("id", savedId);
    setLeaving(true);
    setTimeout(() => onDelete(savedId), 280);
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl shadow-card p-3 transition-all duration-280
                     ${leaving ? "opacity-0 scale-95 -translate-x-4" : "opacity-100"}`}
         style={{ backgroundColor: "var(--color-surface-2)" }}>
      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
           style={{ backgroundColor: "var(--color-surface-3)" }} onClick={onNavigate}>
        <Image src={location.image_url ?? fallback} alt={location.title} fill className="object-cover" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onNavigate}>
        <h3 className="text-sm font-extrabold leading-tight line-clamp-1" style={{ color: "var(--color-text)" }}>{location.title}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {location.bloom_status && <BloomBadge status={location.bloom_status} />}
        </div>
        {location.address && (
          <p className="flex items-center gap-1 text-[11px] mt-1 truncate" style={{ color: "var(--color-text-3)" }}>
            <MapPin size={9} className="flex-shrink-0 text-tulip-300" /> {location.address}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <ShareButton url={shareUrl} title={location.title} />
        <button onClick={onNavigate} className="w-8 h-8 rounded-full hover:bg-tulip-50 flex items-center justify-center hover:text-tulip-500 transition-colors"
                style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" }}>
          <ChevronRight size={16} />
        </button>
        <button onClick={handleDelete} disabled={deleting} className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center hover:text-red-500 transition-colors disabled:opacity-40"
                style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" }}>
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
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/routes/${route.slug}`
    : `/routes/${route.slug}`;

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("saved_items").delete().eq("id", savedId);
    setLeaving(true);
    setTimeout(() => onDelete(savedId), 280);
  }

  return (
    <div className={`flex items-center gap-3 rounded-2xl shadow-card p-3 transition-all duration-280
                     ${leaving ? "opacity-0 scale-95 -translate-x-4" : "opacity-100"}`}
         style={{ backgroundColor: "var(--color-surface-2)" }}>
      <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
           style={{ backgroundColor: "var(--color-surface-3)" }} onClick={onNavigate}>
        <Image src={route.cover_image_url ?? fallback} alt={route.title ?? "Route"} fill className="object-cover" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onNavigate}>
        <h3 className="text-sm font-extrabold leading-tight line-clamp-1" style={{ color: "var(--color-text)" }}>{route.title}</h3>
        {type && (
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${ROUTE_PILL[type]}`}>
            {ROUTE_ICON[type]} {t(`route_type.${type}`)}
          </span>
        )}
        <div className="flex items-center gap-3 mt-1">
          {route.distance_km != null && <span className="text-[11px] font-medium" style={{ color: "var(--color-text-3)" }}>{route.distance_km} km</span>}
          {route.duration_minutes != null && (
            <span className="flex items-center gap-0.5 text-[11px]" style={{ color: "var(--color-text-3)" }}>
              <Clock size={9} /> {formatDuration(route.duration_minutes)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <ShareButton url={shareUrl} title={route.title ?? undefined} />
        <button onClick={onNavigate} className="w-8 h-8 rounded-full hover:bg-tulip-50 flex items-center justify-center hover:text-tulip-500 transition-colors"
                style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" }}>
          <ChevronRight size={16} />
        </button>
        <button onClick={handleDelete} disabled={deleting} className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center hover:text-red-500 transition-colors disabled:opacity-40"
                style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" }}>
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

function fmtDur(sec: number) {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}u` : `${h}u ${m}m`;
}
function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

function CustomRouteRow({ route, onDelete }: { route: CustomRoute; onDelete: (id: string) => void }) {
  const [leaving,  setLeaving]  = useState(false);
  const [sharing,  setSharing]  = useState(false);
  const [shareId,  setShareId]  = useState(route.shareId ?? null);
  const [copied,   setCopied]   = useState(false);

  function handleDelete() {
    deleteCustomRoute(route.id);
    setLeaving(true);
    setTimeout(() => onDelete(route.id), 280);
  }

  async function handleShare() {
    // Gebruik bestaand shareId of maak nieuw aan
    let sid = shareId;
    if (!sid) {
      setSharing(true);
      sid = await shareCustomRoute(route);
      if (!sid) { setSharing(false); return; }
      setShareId(sid);
      updateCustomRoute(route.id, { shareId: sid });
      setSharing(false);
    }
    const url = `${window.location.origin}/route/custom/${sid}`;
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: route.name, url }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const date = new Date(route.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

  return (
    <div className={`rounded-2xl shadow-card p-4 transition-all duration-280
                     ${leaving ? "opacity-0 scale-95 -translate-x-4" : "opacity-100"}`}
         style={{ backgroundColor: "var(--color-surface-2)" }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-tulip-50 flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🗺️</span>
          </div>
          <div>
            <h3 className="text-sm font-extrabold leading-tight" style={{ color: "var(--color-text)" }}>{route.name}</h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-3)" }}>{date} · {route.waypoints.length} punt{route.waypoints.length !== 1 ? "en" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-8 h-8 rounded-full hover:bg-tulip-50 flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-40"
            style={{ backgroundColor: "var(--color-surface-3)", color: copied ? "#22c55e" : "var(--color-text-3)" }}
          >
            {sharing ? <Loader2 size={14} className="animate-spin" /> : copied ? <Check size={14} /> : <Share2 size={14} />}
          </button>
          <button
            onClick={handleDelete}
            className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center hover:text-red-500 transition-colors flex-shrink-0"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-3)" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {([
          { emoji: "🚶", label: "Wandelen", data: route.walking },
          { emoji: "🚴", label: "Fietsen",  data: route.cycling },
          { emoji: "🚗", label: "Rijden",   data: route.driving },
        ] as const).map(({ emoji, label, data }) => (
          <div key={label} className="rounded-xl px-2.5 py-2 text-center"
               style={{ backgroundColor: "var(--color-surface-3)" }}>
            <p className="text-base mb-0.5">{emoji}</p>
            <p className="text-[10px] font-medium" style={{ color: "var(--color-text-3)" }}>{label}</p>
            {data ? (
              <>
                <p className="text-xs font-extrabold" style={{ color: "var(--color-text)" }}>{fmtDur(data.duration)}</p>
                <p className="text-[10px]" style={{ color: "var(--color-text-3)" }}>{fmtDist(data.distance)}</p>
              </>
            ) : (
              <p className="text-xs" style={{ color: "var(--color-text-3)", opacity: 0.4 }}>—</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ tab, onBrowse }: { tab: Tab; onBrowse: () => void }) {
  const { t } = useT();

  if (tab === "custom") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-8">
        <div className="w-20 h-20 rounded-full bg-tulip-50 flex items-center justify-center mb-5">
          <span className="text-4xl">🗺️</span>
        </div>
        <h3 className="text-base font-extrabold mb-2" style={{ color: "var(--color-text)" }}>Nog geen eigen routes</h3>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--color-text-3)" }}>
          Teken een route op de kaart en sla hem op om hem hier terug te zien.
        </p>
        <button
          onClick={onBrowse}
          className="px-5 py-2.5 bg-tulip-500 text-white rounded-xl text-sm font-bold shadow-md shadow-tulip-200 hover:bg-tulip-600 active:scale-95 transition-all"
        >
          Naar de kaart
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <div className="w-20 h-20 rounded-full bg-tulip-50 flex items-center justify-center mb-5">
        <Heart size={32} className="text-tulip-200" />
      </div>
      <h3 className="text-base font-extrabold mb-2" style={{ color: "var(--color-text)" }}>
        {t(tab === "locations" ? "saved_page.empty_locs_title" : "saved_page.empty_routes_title")}
      </h3>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--color-text-3)" }}>
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
    <div className="flex items-center gap-3 rounded-2xl shadow-card p-3 animate-pulse"
         style={{ backgroundColor: "var(--color-surface-2)" }}>
      <div className="w-16 h-16 rounded-xl flex-shrink-0"
           style={{ backgroundColor: "var(--color-surface-3)" }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 rounded w-3/4" style={{ backgroundColor: "var(--color-surface-3)" }} />
        <div className="h-3 rounded w-1/3" style={{ backgroundColor: "var(--color-surface-3)" }} />
        <div className="h-3 rounded w-1/2" style={{ backgroundColor: "var(--color-surface-3)" }} />
      </div>
      <div className="flex gap-1">
        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: "var(--color-surface-3)" }} />
        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: "var(--color-surface-3)" }} />
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
  const [locEntries,    setLocEntries]    = useState<SavedEntry[]>([]);
  const [routeEntries,  setRouteEntries]  = useState<SavedEntry[]>([]);
  const [customRoutes,  setCustomRoutes]  = useState<CustomRoute[]>([]);
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

    const locIds: string[]     = [];
    const routeIds: string[]   = [];
    const newLocEntries: SavedEntry[]   = [];
    const newRouteEntries: SavedEntry[] = [];

    for (const s of saved) {
      if (s.item_type === "location") {
        locIds.push(s.item_id);
        newLocEntries.push({ savedId: s.id, itemId: s.item_id });
      } else if (s.item_type === "route") {
        routeIds.push(s.item_id);
        newRouteEntries.push({ savedId: s.id, itemId: s.item_id });
      }
    }

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

    setLocEntries(newLocEntries);
    setRouteEntries(newRouteEntries);
    setLoading(false);
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  // Load custom routes from localStorage
  useEffect(() => { setCustomRoutes(getCustomRoutes()); }, []);

  const totalSaved = locEntries.length + routeEntries.length;

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: "var(--color-surface)" }}>

      <div className="px-5 pt-12 pb-4" style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-tulip-50 flex items-center justify-center flex-shrink-0">
            <Heart size={20} className="text-tulip-500 fill-tulip-500" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight" style={{ color: "var(--color-text)" }}>{t("saved_page.title")}</h1>
            <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
              {loading
                ? t("common.loading")
                : totalSaved === 0
                ? t("saved_page.nothing_saved")
                : t(totalSaved === 1 ? "saved_page.item_saved" : "saved_page.items_saved", { count: totalSaved })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {([
            { id: "locations" as Tab, emoji: "📍", label: t("saved_page.tab_locations"), count: locEntries.length },
            { id: "routes"    as Tab, emoji: "🗺",  label: t("saved_page.tab_routes"),    count: routeEntries.length },
            { id: "custom"    as Tab, emoji: "✏️",  label: "Eigen",                        count: customRoutes.length },
          ]).map(({ id: tabId, emoji, label, count }) => {
            const isActive = tab === tabId;
            return (
              <button key={tabId} onClick={() => setTab(tabId)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all duration-200
                            ${isActive ? "border-tulip-500 bg-tulip-500 text-white" : "hover:border-tulip-300"}`}
                style={!isActive ? { borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-2)", color: "var(--color-text-2)" } : {}}>
                {emoji} {label}
                {(tabId !== "custom" ? !loading : true) && (
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

      <div className="px-4 pt-4 space-y-3">
        {tab === "custom" ? (
          customRoutes.length === 0 ? (
            <EmptyState tab="custom" onBrowse={() => router.push("/map")} />
          ) : (
            customRoutes.map((route) => (
              <CustomRouteRow
                key={route.id}
                route={route}
                onDelete={(id) => setCustomRoutes((p) => p.filter((r) => r.id !== id))}
              />
            ))
          )
        ) : loading ? (
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

    </div>
  );
}
