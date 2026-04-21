// OSM Routing via OSRM — officiële open-source routing engine
// Licentie routedata: ODbL 1.0 (OpenStreetMap contributors)
// Attributie verplicht tonen bij gebruik van gegenereerde routes

const OSRM_BASE = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";

export type OSRMProfile = "foot" | "bike" | "car";

export interface OSRMRouteResult {
  geojson:     GeoJSON.LineString;
  distanceM:   number;
  durationSec: number;
  waypoints:   Array<{ lat: number; lng: number; name: string }>;
}

export interface GeoJSONLineString {
  type:        "LineString";
  coordinates: [number, number][]; // [lng, lat]
}

// Verplichte attributietekst voor routes gegenereerd via OSM/OSRM
export const OSM_ATTRIBUTION = {
  source:      "osm" as const,
  license:     "ODbL 1.0",
  attribution: "© OpenStreetMap contributors",
  sourceUrl:   "https://www.openstreetmap.org/copyright",
};

/**
 * Bereken een route via OSRM tussen twee of meer waypoints.
 * Geeft GeoJSON LineString, afstand in meters en duur in seconden terug.
 */
export async function calculateOSMRoute(
  waypoints: Array<{ lat: number; lng: number }>,
  profile:   OSRMProfile = "bike",
): Promise<OSRMRouteResult> {
  if (waypoints.length < 2) throw new Error("Minimaal 2 waypoints vereist");

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url    = `${OSRM_BASE}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`OSRM fout: ${res.status}`);

  const data  = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("Geen route gevonden");

  return {
    geojson:     route.geometry as GeoJSON.LineString,
    distanceM:   Math.round(route.distance),
    durationSec: Math.round(route.duration),
    waypoints:   (data.waypoints as Array<{ location: [number, number]; name?: string }>).map((w) => ({
      lat:  w.location[1],
      lng:  w.location[0],
      name: w.name ?? "",
    })),
  };
}

/**
 * Handige wrapper: fietsroute van start naar eindpunt via tussenliggende waypoints.
 * Sluit de lus terug naar het startpunt (roundtrip).
 */
export async function calculateCyclingRoundTrip(
  start:      { lat: number; lng: number },
  via:        Array<{ lat: number; lng: number }>,
): Promise<OSRMRouteResult> {
  return calculateOSMRoute([start, ...via, start], "bike");
}
