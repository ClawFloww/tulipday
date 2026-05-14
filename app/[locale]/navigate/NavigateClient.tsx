"use client";

// Laadt route-data (preset of gegenereerd) en haalt OSRM-stappen op voor afslag-instructies.
// Geeft een NavRoute door aan NavigationView.

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n-context";
import NavigationView, { type NavRoute, type NavStep } from "@/components/navigation/NavigationView";

const ROUTE_KEY = "tulipday_active_route";

// OSRM-profiel per modus
const OSRM_PROFILES: Record<string, string> = {
  bike: "routed-bike",
  car:  "routed-car",
  walk: "routed-foot",
};

// Vertaal OSRM-manoeuvre naar Nederlands
function buildInstruction(step: {
  name: string;
  maneuver: { type: string; modifier?: string };
}): string {
  const { type, modifier } = step.maneuver;
  const street = step.name ? `op ${step.name}` : "";

  switch (type) {
    case "depart":      return `Vertrek ${street}`.trim();
    case "arrive":      return "Je bent aangekomen";
    case "continue":    return `Ga rechtdoor ${street}`.trim();
    case "new name":    return `Ga over in ${step.name || "de weg"}`;
    case "roundabout":
    case "rotary":      return "Neem de rotonde";
    case "end of road": return modifier === "left" ? "Linksaf aan het einde" : "Rechtsaf aan het einde";
    case "fork":        return modifier?.includes("left") ? "Neem links" : "Neem rechts";
    case "turn": {
      switch (modifier) {
        case "left":         return `Sla linksaf ${street}`.trim();
        case "right":        return `Sla rechtsaf ${street}`.trim();
        case "slight left":  return `Houd links aan ${street}`.trim();
        case "slight right": return `Houd rechts aan ${street}`.trim();
        case "sharp left":   return `Scherp linksaf ${street}`.trim();
        case "sharp right":  return `Scherp rechtsaf ${street}`.trim();
        case "uturn":        return `Keer om ${street}`.trim();
        default:             return `Ga rechtdoor ${street}`.trim();
      }
    }
    default: return step.name || "Ga door";
  }
}

function subsamplePoints<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const out: T[] = [arr[0]];
  const step = (arr.length - 1) / (max - 1);
  for (let i = 1; i < max - 1; i++) out.push(arr[Math.round(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

async function fetchSnappedGeometry(
  lnglats: [number, number][], // [lng, lat]
  profile: string,
): Promise<[number, number][] | null> {
  if (lnglats.length < 2) return null;
  const waypoints = subsamplePoints(lnglats, 25);
  const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(";");
  try {
    const res = await fetch(
      `https://routing.openstreetmap.de/${profile}/route/v1/driving/${coords}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return (data.routes?.[0]?.geometry?.coordinates as [number, number][]) ?? null;
  } catch {
    return null;
  }
}

async function getUserPosition(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()    => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

async function fetchOSRMApproach(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
  mode: "bike" | "car" | "walk",
): Promise<{ geometry: [number, number][]; steps: NavStep[]; distanceM: number } | null> {
  try {
    const profile = OSRM_PROFILES[mode];
    const coords  = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url     = `https://routing.openstreetmap.de/${profile}/route/v1/driving/${coords}?steps=true&overview=full&geometries=geojson`;
    const res     = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes?.[0]) return null;

    const r         = data.routes[0];
    const geometry  = r.geometry.coordinates as [number, number][];
    const distanceM = Math.round(r.distance);
    const steps: NavStep[] = [];
    for (const leg of r.legs) {
      for (const step of leg.steps) {
        steps.push({
          instruction: buildInstruction(step),
          streetName:  step.name ?? "",
          distance:    Math.round(step.distance),
          location:    step.maneuver.location as [number, number],
          type:        step.maneuver.type,
          modifier:    step.maneuver.modifier,
        });
      }
    }
    return { geometry, steps, distanceM };
  } catch {
    return null;
  }
}

async function fetchOSRMSteps(
  waypoints: Array<{ lat: number; lng: number }>,
  mode: "bike" | "car" | "walk",
): Promise<{ steps: NavStep[]; geometry: [number, number][] | null }> {
  if (waypoints.length < 2) return { steps: [], geometry: null };
  try {
    const profile = OSRM_PROFILES[mode];
    const coords  = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
    const url     = `https://routing.openstreetmap.de/${profile}/route/v1/driving/${coords}?steps=true&overview=full&geometries=geojson&annotations=false`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { steps: [], geometry: null };

    const data = await res.json();
    if (!data.routes?.[0]) return { steps: [], geometry: null };

    const route    = data.routes[0];
    const geometry = (route.geometry?.coordinates ?? null) as [number, number][] | null;

    const steps: NavStep[] = [];
    for (const leg of route.legs) {
      for (const step of leg.steps) {
        // Sla de "arrive"-stap op tussenstops over (alleen eindstap behouden)
        if (step.maneuver.type === "arrive" && steps.length > 0 && leg !== route.legs.at(-1)) continue;
        steps.push({
          instruction: buildInstruction(step),
          streetName:  step.name ?? "",
          distance:    Math.round(step.distance),
          location:    step.maneuver.location as [number, number],
          type:        step.maneuver.type,
          modifier:    step.maneuver.modifier,
        });
      }
    }
    return { steps, geometry };
  } catch {
    return { steps: [], geometry: null };
  }
}

export default function NavigateClient() {
  const { locale }    = useParams<{ locale: string }>();
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const { t }         = useT();

  const [navRoute, setNavRoute] = useState<NavRoute | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const slug      = searchParams.get("slug");
  const generated = searchParams.get("generated") === "true";

  useEffect(() => {
    async function load() {
      // ── Gegenereerde route (bollenveld-tocht uit localStorage) ───────────
      if (generated) {
        try {
          const stored = localStorage.getItem(ROUTE_KEY);
          if (!stored) { router.replace(`/${locale}/home`); return; }
          const { route, activity } = JSON.parse(stored) as {
            route: {
              name: string;
              fields: Array<{ id: string; name: string; lat: number; lng: number }>;
              geometry: { type: string; coordinates: [number, number][] };
              distanceKm: number;
              estimatedMinutes: number;
            };
            activity: string;
          };

          const mode: "bike" | "car" | "walk" =
            activity === "cycling" ? "bike"
            : activity === "walking" ? "walk"
            : "car";

          const stops = route.fields.map((f) => ({
            id:          f.id,
            name:        f.name,
            lat:         f.lat,
            lng:         f.lng,
            category:    "flower_field",
            location_id: undefined,
          }));

          const routeStart = route.geometry.coordinates[0] as [number, number] | undefined;
          const rawGeometry = route.geometry.coordinates as [number, number][];

          // Één OSRM-call: levert zowel afslagen als de weggebaseerde geometrie.
          // Zo blijven de rode route-lijn en de afslag-instructies exact synchroon.
          const [{ steps, geometry: osrmGeometry }, userPos] = await Promise.all([
            fetchOSRMSteps(stops, mode),
            getUserPosition(),
          ]);

          const displayGeometry = osrmGeometry ?? rawGeometry;

          let approachGeometry: [number, number][] | null = null;
          let approachSteps: NavStep[] = [];
          let approachDistanceM: number | null = null;

          if (userPos && routeStart) {
            const approach = await fetchOSRMApproach(
              { lat: userPos.lat, lng: userPos.lng },
              { lat: routeStart[1], lng: routeStart[0] }, // routeStart is [lng, lat]
              mode,
            );
            if (approach) {
              approachGeometry  = approach.geometry;
              approachSteps     = approach.steps;
              approachDistanceM = approach.distanceM;
            }
          }

          setNavRoute({
            name:             route.name,
            mode,
            stops,
            geometry:         displayGeometry,
            distanceKm:       route.distanceKm,
            durationMinutes:  route.estimatedMinutes,
            steps,
            approachGeometry,
            approachSteps,
            approachDistanceM,
          });
        } catch {
          router.replace(`/${locale}/home`);
        }
        return;
      }

      // ── Preset route (routes-tabel) ──────────────────────────────────────
      if (!slug) { router.replace(`/${locale}/home`); return; }

      const { data: route } = await supabase
        .from("routes")
        .select("id, title, route_type, distance_km, duration_minutes, geometry_points")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (!route) { setError(t("route_detail.not_found")); return; }

      const { data: routeStops } = await supabase
        .from("route_stops")
        .select("id, sort_order, locations(id, title, latitude, longitude, category, bloom_status)")
        .eq("route_id", route.id)
        .order("sort_order");

      const mode: "bike" | "car" | "walk" =
        route.route_type === "walk" ? "walk"
        : route.route_type === "car" ? "car"
        : "bike";

      type RawStop = { locations: { id: string; title: string; latitude: number; longitude: number; category: string | null; bloom_status: string | null } };
      const stops = ((routeStops ?? []) as unknown as RawStop[])
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

      // geometry_points is opgeslagen als [lat, lng] → omzetten naar [lng, lat] voor MapLibre
      const geometry: [number, number][] =
        route.geometry_points?.length
          ? (route.geometry_points as [number, number][]).map(([lat, lng]) => [lng, lat])
          : stops.map((s) => [s.lng, s.lat]);

      const routeStart = geometry[0]; // [lng, lat]

      // Parallel: OSRM-stappen + GPS-locatie + geometrie snappen aan wegennetwerk
      const [{ steps }, userPos, snappedGeo] = await Promise.all([
        fetchOSRMSteps(stops, mode),
        getUserPosition(),
        fetchSnappedGeometry(geometry, OSRM_PROFILES[mode]),
      ]);

      const displayGeometry = snappedGeo ?? geometry;

      let approachGeometry: [number, number][] | null = null;
      let approachSteps: NavStep[] = [];
      let approachDistanceM: number | null = null;

      if (userPos && routeStart) {
        const approach = await fetchOSRMApproach(
          { lat: userPos.lat, lng: userPos.lng },
          { lat: routeStart[1], lng: routeStart[0] }, // routeStart is [lng, lat]
          mode,
        );
        if (approach) {
          approachGeometry  = approach.geometry;
          approachSteps     = approach.steps;
          approachDistanceM = approach.distanceM;
        }
      }

      setNavRoute({
        name:             route.title,
        mode,
        stops,
        geometry:         displayGeometry,
        distanceKm:       route.distance_km ?? 0,
        durationMinutes:  route.duration_minutes ?? 0,
        steps,
        approachGeometry,
        approachSteps,
        approachDistanceM,
      });
    }

    load().catch(() => setError(t("common.load_error")));
  }, [slug, generated, locale, router]);

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 text-center"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <p style={{ color: "var(--color-text)" }}>{error}</p>
      </div>
    );
  }

  if (!navRoute) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-tulip-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <NavigationView navRoute={navRoute} locale={locale} />;
}
