// Overpass API — gratis, geen key, ODbL-licentie (zelfde als OSM)
// Docs: https://overpass-api.de/

const OVERPASS_BASE =
  process.env.OVERPASS_BASE_URL ?? "https://overpass-api.de/api/interpreter";

// Bounding box Bollenstreek (Lisse / Hillegom / Noordwijkerhout / Sassenheim)
const BBOX = "52.18,4.44,52.35,4.68"; // south,west,north,east

export const OVERPASS_ATTRIBUTION = {
  source:      "overpass" as const,
  license:     "ODbL 1.0",
  attribution: "Knooppuntendata: © OpenStreetMap contributors",
  sourceUrl:   "https://www.openstreetmap.org/copyright",
  lastUpdated: new Date().toISOString().split("T")[0],
};

export interface OSMKnooppunt {
  id:     number;
  lat:    number;
  lng:    number;
  nummer: string;
  naam?:  string;
}

async function overpassQuery(query: string): Promise<unknown> {
  const res = await fetch(OVERPASS_BASE, {
    method:  "POST",
    body:    `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal:  AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Overpass fout: ${res.status}`);
  return res.json();
}

/** Fietsknooppunten (rcn_ref) in de Bollenstreek */
export async function fetchFietsknooppunten(): Promise<OSMKnooppunt[]> {
  const data = await overpassQuery(`
    [out:json][timeout:25];
    node["rcn_ref"](${BBOX});
    out body;
  `) as { elements: Array<{ type: string; id: number; lat: number; lon: number; tags?: Record<string, string> }> };
  return data.elements
    .filter((el) => el.type === "node" && el.tags?.rcn_ref)
    .map((el) => ({
      id:     el.id,
      lat:    el.lat,
      lng:    el.lon,
      nummer: el.tags!.rcn_ref,
      naam:   el.tags!.name,
    }));
}

/** Wandelknooppunten (lwn_ref) in de Bollenstreek */
export async function fetchWandelknooppunten(): Promise<OSMKnooppunt[]> {
  const data = await overpassQuery(`
    [out:json][timeout:25];
    node["lwn_ref"](${BBOX});
    out body;
  `) as { elements: Array<{ type: string; id: number; lat: number; lon: number; tags?: Record<string, string> }> };
  return data.elements
    .filter((el) => el.type === "node" && el.tags?.lwn_ref)
    .map((el) => ({
      id:     el.id,
      lat:    el.lat,
      lng:    el.lon,
      nummer: el.tags!.lwn_ref,
      naam:   el.tags!.name,
    }));
}

/**
 * Zet knooppuntnummers in volgorde om naar lat/lng-array.
 * Gebruik daarna calculateOSMRoute() uit osm-router.ts voor de geometrie.
 */
export function buildKnooppuntenWaypoints(
  knooppunten: OSMKnooppunt[],
  volgorde:    string[],
): Array<{ lat: number; lng: number }> {
  return volgorde
    .map((nr) => knooppunten.find((k) => k.nummer === nr))
    .filter((k): k is OSMKnooppunt => k !== undefined)
    .map((k) => ({ lat: k.lat, lng: k.lng }));
}
