"use client";

// Laadt de route voor de navigatie en geeft een complete NavRoute door aan
// NavigationView. Drie ingangen:
//  • ?slug=…            presetroute uit Supabase; de BRouter-lijn wordt ongewijzigd
//                        gevolgd en de afslagen komen uit diezelfde lijn
//  • ?generated=true    plannerroute uit localStorage; OSRM legt de weg langs de stops
//  • ?dest=lat,lng&name=…  één locatie (vanaf "Navigeer hierheen"), via OSRM
// Bij route en planner kiest de gebruiker eerst het startpunt; daarna komt er
// een aanrijdroute (OSRM) van dat punt naar het begin van de route.

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { LocateOff, MapPinOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n-context";
import { buildLine, distanceM, type LngLat } from "@/lib/navigation/geometry";
import { deriveManeuvers } from "@/lib/navigation/maneuvers";
import { fetchOsrmRoute, type TravelMode } from "@/lib/navigation/osrm";
import NavigationView, { type NavRoute, type NavStop } from "@/components/navigation/NavigationView";
import StartChoiceModal from "@/components/navigation/StartChoiceModal";
import StartPointPicker from "@/components/navigation/StartPointPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type StartPhase = "choosing" | "picking" | "ready";

const ROUTE_KEY = "tulipday_active_route";
// Dichterbij dan dit is aanrijden niet nodig
const APPROACH_MIN_M = 60;

function getUserPosition(): Promise<LngLat | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      ()    => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 10_000 },
    );
  });
}

function parseMode(value: string | null): TravelMode {
  return value === "walk" || value === "car" ? value : "bike";
}

function Preparing({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 flex flex-col bg-surface">
      <Skeleton className="flex-1 rounded-none" />
      <div className="absolute inset-x-3 top-0 pt-safe">
        <Skeleton className="mt-3 h-24 rounded-2xl" />
      </div>
      <p className="absolute inset-x-0 bottom-0 pb-safe text-center text-label text-ink-2" role="status">
        <span className="block py-6">{label}</span>
      </p>
    </div>
  );
}

export default function NavigateClient() {
  const { locale }    = useParams<{ locale: string }>();
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const { t }         = useT();

  const slug      = searchParams.get("slug");
  const generated = searchParams.get("generated") === "true";
  const dest      = searchParams.get("dest");
  const destName  = searchParams.get("name") ?? t("navigation.destination");
  const destMode  = parseMode(searchParams.get("mode"));

  const [baseRoute,   setBaseRoute]   = useState<NavRoute | null>(null); // zonder aanrijden
  const [navRoute,    setNavRoute]    = useState<NavRoute | null>(null); // klaar om te navigeren
  const [error,       setError]       = useState<"load" | "no_location" | "no_route" | null>(null);
  const [startPhase,  setStartPhase]  = useState<StartPhase>(dest ? "ready" : "choosing");
  const [customStart, setCustomStart] = useState<LngLat | null>(null);
  const [attempt,     setAttempt]     = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setNavRoute(null);
    setAttempt((a) => a + 1);
  }, []);

  // ── Route laden ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (dest) return; // losse bestemming: alles gebeurt in het startpunt-effect
    let cancelled = false;

    async function load(): Promise<NavRoute | null> {
      // Plannerroute uit localStorage
      if (generated) {
        const stored = localStorage.getItem(ROUTE_KEY);
        if (!stored) return null;
        const { route, activity } = JSON.parse(stored) as {
          route: {
            name: string;
            fields: Array<{ id: string; name: string; lat: number; lng: number }>;
            geometry: { coordinates: LngLat[] };
            estimatedMinutes: number;
          };
          activity: string;
        };
        const mode: TravelMode = activity === "cycling" ? "bike" : activity === "walking" ? "walk" : "car";
        const stops: NavStop[] = route.fields.map((f) => ({
          id: f.id, name: f.name, lat: f.lat, lng: f.lng, category: "flower_field", location_id: f.id,
        }));
        // De opgeslagen geometrie zijn rechte lijnen tussen de stops; OSRM legt de echte weg
        const routed = await fetchOsrmRoute(route.geometry.coordinates, mode);
        const line = routed?.line ?? buildLine(route.geometry.coordinates);
        return {
          name: route.name, mode, stops, line,
          maneuvers:       routed?.maneuvers ?? deriveManeuvers(line),
          durationMinutes: routed ? Math.round(routed.durationS / 60) : route.estimatedMinutes,
          approach:        null,
        };
      }

      // Presetroute uit Supabase
      if (!slug) return null;
      const { data: route } = await supabase
        .from("routes")
        .select("id, title, route_type, duration_minutes, geometry_points")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (!route) throw new Error("not_found");

      const { data: routeStops } = await supabase
        .from("route_stops")
        .select("id, sort_order, locations(id, title, latitude, longitude, category, bloom_status)")
        .eq("route_id", route.id)
        .order("sort_order");

      const mode: TravelMode = route.route_type === "walk" ? "walk" : route.route_type === "car" ? "car" : "bike";

      type RawStop = { locations: { id: string; title: string; latitude: number; longitude: number; category: string | null; bloom_status: string | null } };
      const stops: NavStop[] = ((routeStops ?? []) as unknown as RawStop[])
        .filter((s) => s.locations?.latitude && s.locations?.longitude)
        .map((s) => ({
          id:           s.locations.id,
          name:         s.locations.title,
          lat:          s.locations.latitude,
          lng:          s.locations.longitude,
          category:     s.locations.category ?? "food",
          bloom_status: s.locations.bloom_status,
          location_id:  s.locations.id,
        }));

      // geometry_points is [lat, lng] → [lng, lat]. Al BRouter-gesnapt: ongewijzigd volgen.
      const coords: LngLat[] = route.geometry_points?.length
        ? (route.geometry_points as [number, number][]).map(([lat, lng]) => [lng, lat])
        : stops.map((s) => [s.lng, s.lat]);
      const line = buildLine(coords);

      return {
        name: route.title, mode, stops, line,
        maneuvers:       deriveManeuvers(line),
        durationMinutes: route.duration_minutes ?? 0,
        approach:        null,
      };
    }

    load()
      .then((r) => {
        if (cancelled) return;
        if (!r || r.line.coords.length < 2) {
          if (!r) router.replace(`/${locale}/home`);
          else setError("no_route");
          return;
        }
        setBaseRoute(r);
      })
      .catch(() => { if (!cancelled) setError("load"); });
    return () => { cancelled = true; };
  }, [slug, generated, dest, locale, router, attempt]);

  // ── Startpunt bekend → aanrijdroute of losse bestemming ──────────────────
  useEffect(() => {
    if (startPhase !== "ready" || navRoute) return;
    if (!dest && !baseRoute) return;
    let cancelled = false;

    async function prepare() {
      const origin = customStart ?? await getUserPosition();

      // Losse bestemming: de hele route is één OSRM-route vanaf hier
      if (dest) {
        const [lat, lng] = dest.split(",").map(Number);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) { setError("no_route"); return; }
        if (!origin) { setError("no_location"); return; }
        const routed = await fetchOsrmRoute([origin, [lng, lat]], destMode);
        if (cancelled) return;
        if (!routed) { setError("no_route"); return; }
        setNavRoute({
          name: destName, mode: destMode,
          stops: [{ id: "dest", name: destName, lat, lng, category: "destination" }],
          line: routed.line, maneuvers: routed.maneuvers,
          durationMinutes: Math.round(routed.durationS / 60),
          approach: null,
        });
        return;
      }

      const base = baseRoute!;
      const start = base.line.coords[0];
      let approach = null;
      if (origin && distanceM(origin, start) > APPROACH_MIN_M) {
        approach = await fetchOsrmRoute([origin, start], base.mode);
      }
      if (!cancelled) setNavRoute({ ...base, approach });
    }

    prepare();
    return () => { cancelled = true; };
  }, [baseRoute, startPhase, customStart, dest, destName, destMode, navRoute, attempt]);

  if (error) {
    const content = {
      load:        { icon: <MapPinOff size={28} />, title: t("common.load_error") },
      no_route:    { icon: <MapPinOff size={28} />, title: t("navigation.no_route_title"), description: t("navigation.no_route_body") },
      no_location: { icon: <LocateOff size={28} />, title: t("navigation.no_gps_title"), description: t("navigation.no_gps_body") },
    }[error];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-6 bg-surface pt-safe pb-safe">
        <EmptyState tone="error" {...content} actionLabel={t("common.retry")} onAction={retry} />
        <button type="button" onClick={() => router.back()} className="min-h-touch px-4 text-label text-ink-2">
          {t("common.back")}
        </button>
      </div>
    );
  }

  if (!dest && !baseRoute) return <Preparing label={t("navigation.preparing")} />;

  if (startPhase === "choosing" && baseRoute) {
    return (
      <StartChoiceModal
        routeName={baseRoute.name}
        onUseCurrentLocation={() => { setCustomStart(null); setStartPhase("ready"); }}
        onPickOnMap={() => setStartPhase("picking")}
        onCancel={() => router.back()}
      />
    );
  }

  if (startPhase === "picking" && baseRoute) {
    return (
      <StartPointPicker
        routeName={baseRoute.name}
        routeGeometry={baseRoute.line.coords}
        stops={baseRoute.stops}
        initialUserPos={null}
        onConfirm={(lngLat) => { setCustomStart(lngLat); setStartPhase("ready"); }}
        onCancel={() => setStartPhase("choosing")}
      />
    );
  }

  if (!navRoute) return <Preparing label={t("navigation.preparing")} />;

  return <NavigationView navRoute={navRoute} locale={locale} />;
}
