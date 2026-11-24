// OSRM (routing.openstreetmap.de) voor stukken die niet in Supabase staan:
// aanrijden naar de route, terugleiden na off-route en navigeren naar één
// locatie. Let op: OSRM verwacht lng,lat.

import { buildLine, distanceM, type LngLat, type NavLine } from "./geometry";
import { fromOsrmSteps, type Maneuver, type OsrmStep } from "./maneuvers";

export type TravelMode = "bike" | "car" | "walk";

const PROFILE: Record<TravelMode, string> = {
  bike: "routed-bike",
  car:  "routed-car",
  walk: "routed-foot",
};

export type RoutedLine = {
  line:      NavLine;
  maneuvers: Maneuver[];
  durationS: number;
};

/** Route langs `points` ([lng, lat]); null bij een fout of time-out. */
export async function fetchOsrmRoute(points: LngLat[], mode: TravelMode, timeoutMs = 8000): Promise<RoutedLine | null> {
  if (points.length < 2) return null;
  const coords = points.map(([lng, lat]) => `${lng.toFixed(6)},${lat.toFixed(6)}`).join(";");
  const url = `https://routing.openstreetmap.de/${PROFILE[mode]}/route/v1/driving/${coords}?steps=true&overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const data = await res.json() as {
      routes?: { duration: number; geometry: { coordinates: LngLat[] }; legs: { steps: OsrmStep[] }[] }[];
    };
    const route = data.routes?.[0];
    if (!route || route.geometry.coordinates.length < 2) return null;
    // OSRM begint en eindigt op de dichtstbijzijnde weg. Sta je ernaast (veld,
    // parkeerplaats), dan loopt de lijn vanaf je echte plek, anders telt de
    // nieuwe route meteen weer als "van de route af".
    const coordsOut = [...route.geometry.coordinates];
    const first = points[0], last = points[points.length - 1];
    if (distanceM(first, coordsOut[0]) > 3) coordsOut.unshift(first);
    if (distanceM(last, coordsOut[coordsOut.length - 1]) > 3) coordsOut.push(last);
    const line = buildLine(coordsOut);
    const steps = route.legs.flatMap((leg) => leg.steps);
    return { line, maneuvers: fromOsrmSteps(line, steps), durationS: route.duration };
  } catch {
    return null;
  }
}
