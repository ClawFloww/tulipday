"use client";

// Laadt route-data (preset of gegenereerd) en haalt OSRM-stappen op voor afslag-instructies.
// Geeft een NavRoute door aan NavigationView.

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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

async function fetchOSRMSteps(
  waypoints: Array<{ lat: number; lng: number }>,
  mode: "bike" | "car" | "walk",
): Promise<NavStep[]> {
  if (waypoints.length < 2) return [];
  try {
    const profile = OSRM_PROFILES[mode];
    const coords  = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
    const url     = `https://routing.openstreetmap.de/${profile}/route/v1/driving/${coords}?steps=true&overview=full&geometries=geojson&annotations=false`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.routes?.[0]) return [];

    const steps: NavStep[] = [];
    for (const leg of data.routes[0].legs) {
      for (const step of leg.steps) {
        // Sla de "arrive"-stap op tussenstops over (alleen eindstap behouden)
        if (step.maneuver.type === "arrive" && steps.length > 0 && leg !== data.routes[0].legs.at(-1)) continue;
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
    return steps;
  } catch {
    return []; // stilzwijgend degraderen
  }
}

export default function NavigateClient() {
  const { locale }    = useParams<{ locale: string }>();
  const searchParams  = useSearchParams();
  const router        = useRouter();

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

          const steps = await fetchOSRMSteps(stops, mode);

          setNavRoute({
            name:            route.name,
            mode,
            stops,
            geometry:        route.geometry.coordinates, // al [lng, lat]
            distanceKm:      route.distanceKm,
            durationMinutes: route.estimatedMinutes,
            steps,
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

      if (!route) { setError("Route niet gevonden"); return; }

      const { data: routeStops } = await supabase
        .from("route_stops")
        .select("id, sort_order, locations(id, title, latitude, longitude, category, bloom_status)")
        .eq("route_id", route.id)
        .order("sort_order");

      const mode: "bike" | "car" | "walk" =
        route.route_type === "walk" ? "walk"
        : route.route_type === "car" ? "car"
        : "bike";

      const stops = (routeStops ?? [])
        .filter((s: any) => s.locations?.latitude && s.locations?.longitude)
        .map((s: any) => ({
          id:           s.locations.id as string,
          name:         s.locations.title as string,
          lat:          s.locations.latitude as number,
          lng:          s.locations.longitude as number,
          category:     (s.locations.category ?? "food") as string,
          bloom_status: s.locations.bloom_status as string | null,
          location_id:  s.locations.id as string,
        }));

      // geometry_points is opgeslagen als [lat, lng] → omzetten naar [lng, lat] voor MapLibre
      const geometry: [number, number][] =
        route.geometry_points?.length
          ? (route.geometry_points as [number, number][]).map(([lat, lng]) => [lng, lat])
          : stops.map((s) => [s.lng, s.lat]);

      const steps = await fetchOSRMSteps(stops, mode);

      setNavRoute({
        name:            route.title,
        mode,
        stops,
        geometry,
        distanceKm:      route.distance_km ?? 0,
        durationMinutes: route.duration_minutes ?? 0,
        steps,
      });
    }

    load().catch(() => setError("Fout bij laden route"));
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
