"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ArrowLeft, Bike, BookmarkPlus, Car, Check, Footprints, MapPin, MapPinOff, Share2 } from "lucide-react";
import { getSharedRoute, type SharedRoute } from "@/lib/sharedRoutes";
import { saveCustomRoute, getCustomRoutes } from "@/lib/customRoutes";
import { addMapIcons } from "@/lib/mapIcons";
import { addRouteLayers, setRouteLines } from "@/lib/mapLayers";
import { MAP_STYLE, tintMap } from "@/lib/mapStyle";
import { publicUrl, resolveParam } from "@/lib/links";
import { useT } from "@/lib/i18n-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";


function fmtDur(sec: number) {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}u` : `${h}u ${m}m`;
}
function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export default function SharedRoutePage() {
  const params       = useParams<{ shareId: string; locale: string }>();
  const searchParams = useSearchParams();
  const shareId      = resolveParam(params.shareId, searchParams, "shareId");
  const router       = useRouter();
  const { t, locale } = useT();

  const [route,    setRoute]   = useState<SharedRoute | null>(null);
  const [loading,  setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved,    setSaved]   = useState(false);
  const [copied,   setCopied]  = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<maplibregl.Map | null>(null);

  // Fetch shared route
  useEffect(() => {
    if (!shareId) return;
    getSharedRoute(shareId).then((data) => {
      if (!data) setNotFound(true);
      else setRoute(data);
      setLoading(false);
    });
  }, [shareId]);

  // Check of al opgeslagen
  useEffect(() => {
    if (!route) return;
    const existing = getCustomRoutes().find((r) => r.shareId === route.share_id);
    if (existing) setSaved(true);
  }, [route]);

  // Initialiseer kaart
  useEffect(() => {
    if (!route || !mapContainerRef.current || mapRef.current) return;
    const waypoints = route.waypoints as [number, number][];
    if (waypoints.length === 0) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:     MAP_STYLE,
      center:    waypoints[0],
      zoom:      12,
      interactive: true,
    });
    tintMap(map);

    map.on("load", () => {
      // Waypoint markers
      waypoints.forEach(([lng, lat], i) => {
        const el = document.createElement("div");
        el.style.cssText = [
          "width:28px", "height:28px", "border-radius:50%",
          "background:#E8102A", "color:white", "font-size:12px", "font-weight:800",
          "display:flex", "align-items:center", "justify-content:center",
          "border:2.5px solid white", "box-shadow:0 2px 8px rgba(0,0,0,.3)",
          "font-family:system-ui,sans-serif",
        ].join(";");
        el.textContent = String(i + 1);
        new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      });

      // Lijn tussen punten
      if (waypoints.length > 1) {
        // Onder de genummerde markers, die als DOM-elementen boven de kaart liggen
        addRouteLayers(map, "route");
        setRouteLines(map, "route", [{ id: "route", coords: waypoints, selected: true }]);
        addMapIcons(map).catch((err) => console.error("Kaarticonen laden mislukt", err));
      }

      // Fit bounds
      const bounds = waypoints.reduce(
        (b, p) => b.extend(p as [number, number]),
        new maplibregl.LngLatBounds(waypoints[0], waypoints[0])
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [route]);

  async function handleShare() {
    if (!shareId) return;
    const url = publicUrl(`/${params.locale}/route/custom/${shareId}`);
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: route?.name ?? "TulipDay Route", url }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    if (!route || saved) return;
    saveCustomRoute({
      name:      route.name,
      waypoints: route.waypoints as [number, number][],
      cycling:   route.cycling,
      walking:   route.walking,
      driving:   route.driving,
      shareId:   route.share_id,
    });
    setSaved(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface" aria-busy="true">
        <Skeleton className="h-14 rounded-none" />
        <Skeleton className="h-[420px] rounded-none" />
        <div className="mx-auto max-w-lg space-y-4 px-4 py-5"><Skeleton className="h-28 rounded-2xl" /></div>
      </div>
    );
  }

  if (notFound || !route) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-surface px-6">
        <EmptyState icon={<MapPinOff size={28} />} title={t("shared_route.not_found_title")}
                    description={t("shared_route.not_found_body")}
                    actionLabel={t("shared_route.to_app")} onAction={() => router.push(`/${params.locale}/home`)} />
      </div>
    );
  }

  const waypoints = route.waypoints as [number, number][];
  const date = new Date(route.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  const travel = [
    { key: "walking", label: t("map.on_foot"), Icon: Footprints, data: route.walking },
    { key: "cycling", label: t("map.by_bike"), Icon: Bike,       data: route.cycling },
    { key: "driving", label: t("map.by_car"),  Icon: Car,        data: route.driving },
  ] as const;

  return (
    <div className="min-h-screen bg-surface pb-safe-nav">
      <header className="sticky top-0 z-30 border-b border-line bg-surface-2 pt-safe">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-2">
          <IconButton variant="ghost" aria-label={t("common.back")} onClick={() => router.back()}>
            <ArrowLeft size={18} />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-headline text-ink">{route.name}</h1>
            <p className="text-caption text-ink-3">{t("map.points_count", { count: waypoints.length })} · {date}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleShare}
                  icon={copied ? <Check size={14} className="text-success" aria-hidden /> : <Share2 size={14} aria-hidden />}>
            {copied ? t("common.copied") : t("common.share")}
          </Button>
        </div>
      </header>

      <div ref={mapContainerRef} className="w-full" style={{ height: "55vmax", maxHeight: "420px" }} />

      <div className="mx-auto max-w-lg space-y-4 px-4 py-5">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-sm">
          <h2 className="border-b border-line px-4 py-3 text-caption font-bold uppercase tracking-wide text-ink-3">
            {t("shared_route.travel_info")}
          </h2>
          <div className="grid grid-cols-3 divide-x divide-line">
            {travel.map(({ key, label, Icon, data }) => (
              <div key={key} className="px-3 py-4 text-center">
                <Icon size={20} className="mx-auto mb-1 text-ink-2" aria-hidden />
                <p className="text-caption text-ink-3">{label}</p>
                {data ? (
                  <>
                    <p className="mt-0.5 font-mono text-label text-ink">{fmtDur(data.duration)}</p>
                    <p className="font-mono text-caption text-ink-3">{fmtDist(data.distance)}</p>
                  </>
                ) : (
                  <p className="mt-0.5 text-label text-ink-3">—</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-sm">
          <h2 className="border-b border-line px-4 py-3 text-caption font-bold uppercase tracking-wide text-ink-3">
            {t("shared_route.points")}
          </h2>
          <ol className="divide-y divide-line">
            {waypoints.map(([lng, lat], i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-caption font-bold text-on-primary">
                  {i + 1}
                </span>
                <span className="font-mono text-caption text-ink-3">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex gap-3">
          <Button fullWidth size="lg" variant={saved ? "secondary" : "primary"} onClick={handleSave} disabled={saved}
                  icon={saved ? <Check size={16} className="text-success" aria-hidden /> : <BookmarkPlus size={16} aria-hidden />}>
            {saved ? t("map.route_saved") : t("shared_route.save_on_device")}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => router.push(`/${params.locale}/map`)}
                  icon={<MapPin size={16} aria-hidden />}>
            {t("shared_route.map")}
          </Button>
        </div>

        <p className="pb-4 text-center text-caption text-ink-3">
          {t("shared_route.shared_via")} <span className="font-bold text-primary">TulipDay</span>
        </p>
      </div>
    </div>
  );
}
