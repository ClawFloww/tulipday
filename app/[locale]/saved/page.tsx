"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Heart, Trash2, MapPin, Clock, ChevronRight,
  Bike, Car, Footprints, Camera, Users,
  Share2, Check, Route as RouteIcon, PenLine, WifiOff, Map as MapIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ensureUser } from "@/lib/auth";
import { useT } from "@/lib/i18n-context";
import { locationPath, publicUrl, routePath } from "@/lib/links";
import { getCustomRoutes, deleteCustomRoute, updateCustomRoute, type CustomRoute } from "@/lib/customRoutes";
import { shareCustomRoute } from "@/lib/sharedRoutes";
import { Badge } from "@/components/ui/Badge";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import type { Location, Route, RouteType } from "@/lib/types";

type Tab = "locations" | "routes" | "custom";

const ROUTE_ICON: Record<RouteType, React.ReactNode> = {
  bike:   <Bike       size={11} />,
  car:    <Car        size={11} />,
  walk:   <Footprints size={11} />,
  photo:  <Camera     size={11} />,
  family: <Users      size={11} />,
};

const ROUTE_TONE: Record<RouteType, "info" | "warning" | "success" | "primary"> = {
  bike:   "info",
  car:    "warning",
  walk:   "success",
  photo:  "primary",
  family: "primary",
};

// Uitschuif-animatie bij verwijderen, daarna pas uit de lijst halen
const LEAVE_MS = 280;

function formatDuration(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function ShareButton({ url, title }: { url: string; title?: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: title ?? "TulipDay", url }); return; } catch { /* geannuleerd */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t("common.copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <IconButton variant="ghost" aria-label={t("common.share")} onClick={handleShare}>
      {copied ? <Check size={17} className="text-success" /> : <Share2 size={17} />}
    </IconButton>
  );
}

/** Gemeenschappelijke rij voor opgeslagen locaties en routes. */
function SavedRow({ savedId, image, title, children, shareUrl, onDelete, onNavigate }: {
  savedId: string; image: string; title: string; children: React.ReactNode;
  shareUrl: string; onDelete: (id: string) => void; onNavigate: () => void;
}) {
  const { t } = useT();
  const [deleting, setDeleting] = useState(false);
  const [leaving,  setLeaving]  = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("saved_items").delete().eq("id", savedId);
    if (error) {
      setDeleting(false);
      toast.error(t("saved_page.remove_failed"));
      return;
    }
    setLeaving(true);
    toast.success(t("saved_page.removed"));
    setTimeout(() => onDelete(savedId), LEAVE_MS);
  }

  return (
    <Card padding="sm" className={`flex items-center gap-3 transition-all duration-slow ease-out-soft
                                    ${leaving ? "opacity-0 scale-95 -translate-x-4" : "opacity-100"}`}>
      <button type="button" onClick={onNavigate} aria-label={`${t("saved_page.open")}: ${title}`}
              className="flex flex-1 min-w-0 items-center gap-3 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-surface-3">
          <Image src={image} alt="" fill sizes="64px" className="object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-extrabold leading-tight line-clamp-1 text-ink">{title}</h3>
          {children}
        </div>
        <ChevronRight size={18} className="flex-shrink-0 text-ink-3" aria-hidden />
      </button>
      <div className="flex items-center flex-shrink-0 -mr-1">
        <ShareButton url={shareUrl} title={title} />
        <IconButton variant="ghost" aria-label={t("saved_page.remove")} onClick={handleDelete} disabled={deleting}
                    className="hover:text-danger">
          <Trash2 size={17} />
        </IconButton>
      </div>
    </Card>
  );
}

function LocationRow({ location, savedId, onDelete, onNavigate }: {
  location: Location; savedId: string; onDelete: (id: string) => void; onNavigate: () => void;
}) {
  const { locale } = useT();
  const fallback = "https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=400";

  return (
    <SavedRow savedId={savedId} image={location.image_url ?? fallback} title={location.title}
              shareUrl={publicUrl(`/${locale}/location/${location.slug}`)} onDelete={onDelete} onNavigate={onNavigate}>
      {location.bloom_status && <div className="mt-1"><BloomBadge status={location.bloom_status} /></div>}
      {location.address && (
        <p className="flex items-center gap-1 text-caption mt-1 truncate text-ink-3">
          <MapPin size={10} className="flex-shrink-0" /> {location.address}
        </p>
      )}
    </SavedRow>
  );
}

function RouteRow({ route, savedId, onDelete, onNavigate }: {
  route: Route; savedId: string; onDelete: (id: string) => void; onNavigate: () => void;
}) {
  const { t, locale } = useT();
  const fallback = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400";
  const type = route.route_type as RouteType | undefined;

  return (
    <SavedRow savedId={savedId} image={route.cover_image_url ?? fallback} title={route.title ?? "Route"}
              shareUrl={publicUrl(`/${locale}/routes/${route.slug}`)} onDelete={onDelete} onNavigate={onNavigate}>
      {type && (
        <div className="mt-1">
          <Badge tone={ROUTE_TONE[type]} icon={ROUTE_ICON[type]}>{t(`route_type.${type}`)}</Badge>
        </div>
      )}
      <div className="flex items-center gap-3 mt-1 text-caption text-ink-3 font-mono">
        {route.distance_km != null && <span>{route.distance_km} km</span>}
        {route.duration_minutes != null && (
          <span className="flex items-center gap-0.5"><Clock size={10} /> {formatDuration(route.duration_minutes)}</span>
        )}
      </div>
    </SavedRow>
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
  const { t, locale } = useT();
  const [leaving,  setLeaving]  = useState(false);
  const [sharing,  setSharing]  = useState(false);
  const [shareId,  setShareId]  = useState(route.shareId ?? null);
  const [copied,   setCopied]   = useState(false);

  function handleDelete() {
    deleteCustomRoute(route.id);
    setLeaving(true);
    toast.success(t("saved_page.removed"));
    setTimeout(() => onDelete(route.id), LEAVE_MS);
  }

  async function handleShare() {
    // Gebruik bestaand shareId of maak een nieuwe aan
    let sid = shareId;
    if (!sid) {
      setSharing(true);
      sid = await shareCustomRoute(route);
      setSharing(false);
      if (!sid) { toast.error(t("common.load_error")); return; }
      setShareId(sid);
      updateCustomRoute(route.id, { shareId: sid });
    }
    const url = publicUrl(`/${locale}/route/custom/${sid}`);
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: route.name, url }); return; } catch { /* geannuleerd */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t("common.copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  const date = new Date(route.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short" });
  const points = route.waypoints.length;

  return (
    <Card className={`transition-all duration-slow ease-out-soft ${leaving ? "opacity-0 scale-95 -translate-x-4" : "opacity-100"}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary flex items-center justify-center flex-shrink-0">
            <MapIcon size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-extrabold leading-tight truncate text-ink">{route.name}</h3>
            <p className="text-caption mt-0.5 text-ink-3">
              {date} · {t(points === 1 ? "saved_page.points_one" : "saved_page.points_other", { count: points })}
            </p>
          </div>
        </div>
        <div className="flex items-center -mr-2 -mt-1">
          <IconButton variant="ghost" aria-label={t("common.share")} onClick={handleShare} disabled={sharing}>
            {copied ? <Check size={17} className="text-success" /> : <Share2 size={17} />}
          </IconButton>
          <IconButton variant="ghost" aria-label={t("saved_page.remove")} onClick={handleDelete} className="hover:text-danger">
            <Trash2 size={17} />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {([
          { Icon: Footprints, labelKey: "saved_page.mode_walk", data: route.walking },
          { Icon: Bike,       labelKey: "saved_page.mode_bike", data: route.cycling },
          { Icon: Car,        labelKey: "saved_page.mode_car",  data: route.driving },
        ] as const).map(({ Icon, labelKey, data }) => (
          <div key={labelKey} className="rounded-xl px-2.5 py-2 text-center bg-surface-3">
            <Icon size={16} className="mx-auto mb-1 text-ink-2" aria-hidden />
            <p className="text-caption text-ink-3">{t(labelKey)}</p>
            {data ? (
              <>
                <p className="text-label font-extrabold text-ink font-mono">{fmtDur(data.duration)}</p>
                <p className="text-caption text-ink-3 font-mono">{fmtDist(data.distance)}</p>
              </>
            ) : (
              <p className="text-label text-ink-3" aria-hidden>—</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <Card padding="sm" className="flex items-center gap-3">
      <Skeleton className="w-16 h-16 flex-shrink-0" />
      <div className="flex-1"><Skeleton variant="text" lines={3} /></div>
    </Card>
  );
}

interface SavedEntry { savedId: string; itemId: string }

export default function SavedPage() {
  const router = useRouter();
  const { t, locale } = useT();

  const [tab, setTab]         = useState<Tab>("locations");
  const [loading, setLoading] = useState(true);
  const [failed,  setFailed]  = useState(false);
  const [locEntries,    setLocEntries]    = useState<SavedEntry[]>([]);
  const [routeEntries,  setRouteEntries]  = useState<SavedEntry[]>([]);
  const [customRoutes,  setCustomRoutes]  = useState<CustomRoute[]>([]);
  const [locations,    setLocations]    = useState<Record<string, Location>>({});
  const [routes,       setRoutes]       = useState<Record<string, Route>>({});

  const loadSaved = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    // Bezoek aan Opgeslagen = intentie: maak zo nodig een account aan, zodat
    // eerder (op session_id) opgeslagen items via de claim meeverhuizen
    const userId = await ensureUser();
    // Geen account = geen verbinding (of anonieme logins uit): toon een foutstaat i.p.v. een lege lijst
    if (!userId) { setFailed(true); setLoading(false); return; }

    const { data: saved, error } = await supabase.from("saved_items").select("id, item_type, item_id")
      .eq("user_id", userId).order("created_at", { ascending: false });
    if (error) { setFailed(true); setLoading(false); return; }

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

  // Eigen routes staan lokaal op het toestel
  useEffect(() => { setCustomRoutes(getCustomRoutes()); }, []);

  const totalSaved = locEntries.length + routeEntries.length;

  const tabs = [
    { id: "locations" as Tab, Icon: MapPin,    label: t("saved_page.tab_locations"), count: locEntries.length },
    { id: "routes"    as Tab, Icon: RouteIcon, label: t("saved_page.tab_routes"),    count: routeEntries.length },
    { id: "custom"    as Tab, Icon: PenLine,   label: t("saved_page.tab_custom"),    count: customRoutes.length },
  ];

  function renderContent() {
    if (tab === "custom") {
      if (customRoutes.length === 0) {
        return <EmptyState icon={<MapIcon size={28} />} title={t("saved_page.empty_custom_title")}
                           description={t("saved_page.empty_custom_desc")}
                           actionLabel={t("saved_page.to_map")} onAction={() => router.push(`/${locale}/map`)} />;
      }
      return customRoutes.map((route) => (
        <CustomRouteRow key={route.id} route={route}
                        onDelete={(id) => setCustomRoutes((p) => p.filter((r) => r.id !== id))} />
      ));
    }

    if (loading) return Array.from({ length: 4 }, (_, i) => <SkeletonRow key={i} />);

    if (failed) {
      return <EmptyState tone="error" icon={<WifiOff size={28} />} title={t("saved_page.load_error_title")}
                         description={t("saved_page.load_error_desc")}
                         actionLabel={t("common.retry")} onAction={loadSaved} />;
    }

    if (tab === "locations") {
      if (locEntries.length === 0) {
        return <EmptyState icon={<Heart size={28} />} title={t("saved_page.empty_locs_title")}
                           description={t("saved_page.empty_locs_desc")}
                           actionLabel={t("saved_page.browse_locations")} onAction={() => router.push(`/${locale}/home`)} />;
      }
      return locEntries.map(({ savedId, itemId }) => {
        const loc = locations[itemId];
        if (!loc) return null;
        return <LocationRow key={savedId} location={loc} savedId={savedId}
          onDelete={(id) => setLocEntries((p) => p.filter((e) => e.savedId !== id))}
          onNavigate={() => router.push(locationPath(locale, loc.slug))} />;
      });
    }

    if (routeEntries.length === 0) {
      return <EmptyState icon={<RouteIcon size={28} />} title={t("saved_page.empty_routes_title")}
                         description={t("saved_page.empty_routes_desc")}
                         actionLabel={t("saved_page.browse_routes")} onAction={() => router.push(`/${locale}/routes`)} />;
    }
    return routeEntries.map(({ savedId, itemId }) => {
      const route = routes[itemId];
      if (!route) return null;
      return <RouteRow key={savedId} route={route} savedId={savedId}
        onDelete={(id) => setRouteEntries((p) => p.filter((e) => e.savedId !== id))}
        onNavigate={() => router.push(routePath(locale, route.slug))} />;
    });
  }

  return (
    <div className="min-h-screen pb-safe-nav bg-surface">

      <header className="px-5 pt-safe bg-surface-2 border-b border-line">
        <div className="flex items-center gap-3 pt-6 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0">
            <Heart size={20} className="text-primary fill-current" />
          </div>
          <div>
            <h1 className="text-title text-ink">{t("saved_page.title")}</h1>
            <p className="text-caption text-ink-3">
              {loading
                ? t("common.loading")
                : totalSaved === 0
                ? t("saved_page.nothing_saved")
                : t(totalSaved === 1 ? "saved_page.item_saved" : "saved_page.items_saved", { count: totalSaved })}
            </p>
          </div>
        </div>

        {/* Segmented control */}
        <div role="tablist" className="flex gap-1 p-1 mb-4 rounded-2xl bg-surface-3">
          {tabs.map(({ id: tabId, Icon, label, count }) => {
            const isActive = tab === tabId;
            const showCount = tabId === "custom" || !loading;
            return (
              <button key={tabId} role="tab" aria-selected={isActive} onClick={() => setTab(tabId)}
                className={`flex-1 flex items-center justify-center gap-1.5 min-h-touch rounded-xl text-label
                            transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                            ${isActive ? "bg-surface-2 text-ink shadow-sm" : "text-ink-3"}`}>
                <Icon size={15} className={isActive ? "text-primary" : ""} aria-hidden />
                {label}
                {showCount && (
                  <span className={`text-caption font-extrabold px-1.5 py-0.5 rounded-full leading-none font-mono
                                   ${isActive ? "bg-primary text-on-primary" : "bg-surface-2 text-ink-3"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">{renderContent()}</div>
    </div>
  );
}
