"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Bike, Car, Footprints, Camera, Users, Clock, MapPin, Heart, X, ChevronRight, MapPinOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Category, Route, RouteStop, RouteType } from "@/lib/types";
import { useT } from "@/lib/i18n-context";
import { locationPath, resolveParam } from "@/lib/links";
import { currentUserId, ensureUser } from "@/lib/auth";
import { CATEGORY_COLOR } from "@/lib/mapIcons";
import { RouteInteractiveMap, type MapLocation } from "@/components/map/RouteInteractiveMap";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";

// ── Route type helpers ────────────────────────────────────────────────────────

const ROUTE_ICON: Record<RouteType, React.ReactNode> = {
  bike:   <Bike       size={14} />,
  car:    <Car        size={14} />,
  walk:   <Footprints size={14} />,
  photo:  <Camera     size={14} />,
  family: <Users      size={14} />,
};



function formatDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Kortste afstand (km) van punt P tot lijnstuk AB (lat/lng in graden)
function ptSegDistKm(
  plat: number, plng: number,
  alat: number, alng: number,
  blat: number, blng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dy = blat - alat, dx = blng - alng;
  const t = dy === 0 && dx === 0
    ? 0
    : Math.max(0, Math.min(1, ((plat - alat) * dy + (plng - alng) * dx) / (dy * dy + dx * dx)));
  const clat = alat + t * dy, clng = alng + t * dx;
  const dLat = toRad(plat - clat), dLng = toRad(plng - clng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(clat)) * Math.cos(toRad(plat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Controleer of een locatie binnen maxKm van de routelijn ligt
function isNearRoute(loc: MapLocation, routePts: [number, number][], maxKm: number): boolean {
  for (let i = 0; i < routePts.length - 1; i++) {
    // routePts zijn [lat, lng]
    if (ptSegDistKm(loc.latitude, loc.longitude,
        routePts[i][0], routePts[i][1],
        routePts[i + 1][0], routePts[i + 1][1]) <= maxKm) return true;
  }
  return false;
}

// ── Hoofdcomponent ────────────────────────────────────────────────────────────

export default function RouteDetailClient() {
  const params           = useParams<{ slug: string; locale: string }>();
  const searchParams     = useSearchParams();
  const slug             = resolveParam(params.slug, searchParams, "slug");
  const locale           = params.locale;
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

      // Bezienswaardigheden ophalen: bounding box als pre-filter, daarna 50m-check langs routelijn
      const routePts: [number, number][] = (r.geometry_points ?? []) as [number, number][];
      const coordsForBbox: [number, number][] =
        routePts.length > 0
          ? routePts                                                              // [lat, lng]
          : fetchedStops
              .filter((st) => st.locations.latitude && st.locations.longitude)
              .map((st) => [st.locations.latitude as number, st.locations.longitude as number]);

      if (coordsForBbox.length > 0) {
        const lats = coordsForBbox.map((c) => c[0]);
        const lngs = coordsForBbox.map((c) => c[1]);
        const buf  = 0.0006; // ~65 m — ruim genoeg als pre-filter voor de 50 m-check
        const { data: locs } = await supabase
          .from("locations")
          .select("id, title, category, latitude, longitude, short_description, image_url, slug, address, bloom_status")
          .eq("is_active", true)
          .gte("latitude",  Math.min(...lats)  - buf)
          .lte("latitude",  Math.max(...lats)  + buf)
          .gte("longitude", Math.min(...lngs) - buf)
          .lte("longitude", Math.max(...lngs) + buf);

        const candidates = (locs as MapLocation[]) ?? [];
        const nearby = routePts.length > 1
          ? candidates.filter((loc) => isNearRoute(loc, routePts, 0.05))
          : candidates;
        setNearbyLocations(nearby);
      }

      setLoading(false);
    }
    fetchRoute();
  }, [slug]);

  useEffect(() => {
    if (!route) return;
    currentUserId().then(async (userId) => {
      if (!userId) return;
      const { data } = await supabase.from("saved_items").select("id")
        .eq("user_id", userId).eq("item_type", "route").eq("item_id", route.id)
        .maybeSingle();
      setSaved(!!data);
    });
  }, [route]);

  async function handleSave() {
    if (!route || saving) return;
    setSaving(true);
    const userId = await ensureUser();
    if (!userId) { setSaving(false); return; }
    if (saved) {
      await supabase.from("saved_items").delete()
        .eq("user_id", userId).eq("item_type", "route").eq("item_id", route.id);
      setSaved(false);
    } else {
      await supabase.from("saved_items").insert({ item_type: "route", item_id: route.id });
      setSaved(true);
    }
    setSaving(false);
  }

  function handleNavigate() {
    router.push(`/${locale}/navigate?slug=${route?.slug}`);
  }

  const canNavigate =
    stops.some((s) => s.locations.latitude) ||
    (route?.geometry_points != null && route.geometry_points.length > 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface" role="status" aria-label={t("route_detail.loading")}>
        <Skeleton className="h-64 rounded-none" />
        <div className="space-y-4 px-5 py-5">
          <Skeleton variant="text" lines={2} />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton variant="text" lines={3} />
        </div>
      </div>
    );
  }

  if (notFound || !route) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-surface px-6">
        <EmptyState icon={<MapPinOff size={28} />} title={t("route_detail.not_found")}
                    actionLabel={t("common.go_back")} onAction={() => router.back()} />
      </div>
    );
  }

  const type = route.route_type as RouteType | undefined;

  return (
    <div className="min-h-screen pb-44 bg-surface" >

      {/* Cover afbeelding */}
      <div className="relative h-64 sm:h-80 overflow-hidden bg-surface-3">
        <Image
          src={imgError ? fallback : (route.cover_image_url ?? fallback)}
          alt={route.title}
          fill
          className="object-cover"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
        <IconButton variant="overlay" aria-label={t("common.back")} onClick={() => router.back()}
                    className="absolute left-4 top-[calc(env(safe-area-inset-top)+12px)] z-10">
          <ArrowLeft size={20} />
        </IconButton>
        {type && (
          <div className="absolute bottom-4 left-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-caption font-bold text-ink shadow-md">
              {ROUTE_ICON[type]} {t(`route_type.${type}_route`)}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Titel + badges */}
        <div>
          <h1 className="text-2xl font-extrabold leading-tight mb-3 text-ink" >{route.title}</h1>
          <div className="flex flex-wrap gap-2">
            {route.distance_km != null && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm bg-surface-2 text-ink-2"
                    >
                {type ? ROUTE_ICON[type] : <Bike size={13} />} {route.distance_km} km
              </span>
            )}
            {route.duration_minutes != null && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm bg-surface-2 text-ink-2"
                    >
                <Clock size={13} /> {formatDuration(route.duration_minutes)}
              </span>
            )}
            {stops.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm bg-surface-2 text-ink-2"
                    >
                <MapPin size={13} /> {t("route_detail.spots", { count: stops.length })}
              </span>
            )}
          </div>
        </div>

        {route.description && (
          <p className="text-[15px] leading-relaxed text-ink-2" >{route.description}</p>
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
            <h2 className="text-base font-extrabold mb-3 text-ink" >{t("route_detail.route_stops")}</h2>
            <div className="space-y-3">
              {stops.map((stop, idx) => (
                <div key={stop.id} className="flex items-start gap-3 rounded-2xl p-4 shadow-sm bg-surface-2 border border-line"
                     >
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-extrabold">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-snug text-ink" >{stop.locations.title}</p>
                    {stop.locations.address && (
                      <p className="flex items-center gap-1 text-xs mt-0.5 text-ink-3" >
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
            <h2 className="text-base font-extrabold mb-3 text-ink" >
              Bezienswaardigheden onderweg
            </h2>
            <p className="text-xs mb-4 -mt-2 text-ink-3" >
              {nearbyLocations.length} plekken langs deze route
            </p>
            <div className="space-y-3">
              {nearbyLocations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocation(loc)}
                  className="w-full flex items-stretch gap-3 rounded-2xl overflow-hidden text-left shadow-sm active:scale-[0.98] transition-transform bg-surface-2 border border-line"
                  
                >
                  {/* Foto */}
                  <div className="w-24 flex-shrink-0 relative bg-surface-3">
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
                        style={{ backgroundColor: CATEGORY_COLOR[loc.category as Category] ?? CATEGORY_COLOR.parking, opacity: 0.15 }}
                      />
                    )}
                    {/* Categorie-kleurstreep links */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: CATEGORY_COLOR[loc.category as Category] ?? CATEGORY_COLOR.parking }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 py-3 pr-3">
                    <span
                      className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 text-white"
                      style={{ backgroundColor: CATEGORY_COLOR[loc.category as Category] ?? CATEGORY_COLOR.parking }}
                    >
                      {t(`category.${loc.category}`)}
                    </span>
                    <p className="text-sm font-bold leading-snug line-clamp-1 text-ink" >
                      {loc.title}
                    </p>
                    {loc.short_description && (
                      <p className="text-xs leading-relaxed mt-0.5 line-clamp-2 text-ink-3" >
                        {loc.short_description}
                      </p>
                    )}
                  </div>

                  {/* Pijl */}
                  <div className="flex items-center pr-3 flex-shrink-0 text-ink-3" >
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
            <div className="w-10 h-1 rounded-full mx-auto mb-4 bg-line"  />

            {selectedLocation.image_url && (
              <div className="relative h-36 rounded-xl overflow-hidden mb-4 -mx-1">
                <Image
                  src={selectedLocation.image_url}
                  alt={selectedLocation.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 640px"
                />
              </div>
            )}

            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                {/* Categorie badge */}
                <span
                  className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2 text-white"
                  style={{ backgroundColor: CATEGORY_COLOR[selectedLocation.category as Category] ?? CATEGORY_COLOR.parking }}
                >
                  {t(`category.${selectedLocation.category}`)}
                </span>
                <h3 className="text-base font-extrabold leading-snug text-ink" >
                  {selectedLocation.title}
                </h3>
                {selectedLocation.address && (
                  <p className="flex items-center gap-1 text-xs mt-1 text-ink-3" >
                    <MapPin size={10} className="flex-shrink-0" />
                    {selectedLocation.address}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedLocation(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-surface text-ink-3"
                
              >
                <X size={16} />
              </button>
            </div>

            {selectedLocation.short_description && (
              <p className="text-sm leading-relaxed mb-4 text-ink-2" >
                {selectedLocation.short_description}
              </p>
            )}

            <button
              onClick={() => router.push(locationPath(locale, selectedLocation.slug))}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-dark active:scale-[0.98] transition-all"
            >
              Bekijk locatie <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Actie-balk boven de navigatiebalk */}
      <div className="fixed inset-x-0 bottom-nav z-40 border-t border-line bg-surface-2 px-4 py-3">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button fullWidth size="lg" onClick={handleNavigate} disabled={!canNavigate}
                  icon={<MapPin size={17} aria-hidden />}>
            {t("common.navigate")}
          </Button>
          <Button size="lg" variant={saved ? "primary" : "secondary"} loading={saving} onClick={handleSave}
                  aria-pressed={saved} icon={<Heart size={17} className={saved ? "fill-current" : ""} aria-hidden />}>
            {saved ? t("common.saved") : t("common.save")}
          </Button>
        </div>
      </div>

    </div>
  );
}
