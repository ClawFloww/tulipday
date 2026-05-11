// BRouter client — snapped routing via wandel- en fietspaden in OSM
// Profiel 'hiking-mountain' volgt duinpaden, onverharde trails en kustroutes
// die OSRM's routed-foot niet pikt (die kiest straten).
//
// Coordinaten-afspraken:
//   • Input: [lat, lng] — zelfde als onze DB geometry_points
//   • Output: [lat, lng] — zelfde als onze DB geometry_points
//   BRouter zelf verwacht/levert [lng, lat] (GeoJSON), die conversie zit in deze module.

const BROUTER_BASE = "https://brouter.de/brouter";

export type BRouterProfile =
  | "hiking-mountain"   // wandelroutes: duinen, natuur, kustpaden, onverhard
  | "trekking"          // standaard fietsen, volgt fietspaden
  | "safety"            // veilig fietsen: vermijdt drukke wegen
  | "shortest";         // kortste route (geen voorkeur voor pad-type)

export interface BRouterResult {
  /** [lat, lng] paren — direct te gebruiken als geometry_points in DB */
  coordinates:     [number, number][];
  distanceMeters:  number;
  durationSeconds: number;
  profile:         BRouterProfile;
}

// ── Hulpfuncties ──────────────────────────────────────────────────────────────

/** Subsamplet een array naar max `max` elementen, altijd met begin en einde. */
export function subsampleWaypoints<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const out: T[] = [arr[0]];
  const step = (arr.length - 1) / (max - 1);
  for (let i = 1; i < max - 1; i++) out.push(arr[Math.round(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

/** Sleep helper voor retry-backoff en fair-use delays */
function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// ── Hoofd-aanroep ─────────────────────────────────────────────────────────────

/**
 * Vraagt een route op bij de BRouter publieke API.
 *
 * @param waypoints  [lat, lng] paren die de route definiëren (max 25 wordt intern afgedwongen)
 * @param profile    BRouter-profiel op basis van route-activiteit
 * @param retries    Aantal retries bij 429 of 5xx (default: 3)
 */
export async function routeViaBRouter(
  waypoints: [number, number][],        // [lat, lng]
  profile:   BRouterProfile,
  retries  = 3,
): Promise<BRouterResult> {
  if (waypoints.length < 2) {
    throw new Error("BRouter heeft minimaal 2 waypoints nodig");
  }

  // Subsamplen naar max 25 (BRouter publieke endpoint comfortabel)
  const sampled = subsampleWaypoints(waypoints, 25);

  // Bouw URL — BRouter verwacht lng,lat (omgekeerd van onze DB)
  const lonlats = sampled.map(([lat, lng]) => `${lng},${lat}`).join("|");
  const url = `${BROUTER_BASE}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`;

  let lastErr: Error = new Error("Onbekende fout");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal:  AbortSignal.timeout(20_000),
      });

      // Exponential backoff bij rate-limit of serverfout
      if (res.status === 429 || res.status >= 500) {
        const delay = Math.min(1000 * 2 ** attempt, 16_000);
        if (attempt < retries) {
          await sleep(delay);
          continue;
        }
        throw new Error(`BRouter ${res.status} na ${retries} retries`);
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`BRouter ${res.status}: ${body.slice(0, 200)}`);
      }

      const geojson = await res.json();
      const feature = geojson.features?.[0];
      if (!feature?.geometry?.coordinates?.length) {
        throw new Error("BRouter gaf geen geldige geometrie terug");
      }

      // GeoJSON-coördinaten zijn [lng, lat] → flip naar [lat, lng] voor DB
      const coordinates: [number, number][] = (
        feature.geometry.coordinates as [number, number][]
      ).map(([lng, lat]) => [lat, lng]);

      return {
        coordinates,
        distanceMeters:  Number(feature.properties?.["track-length"] ?? 0),
        durationSeconds: Number(feature.properties?.["total-time"]   ?? 0),
        profile,
      };
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await sleep(Math.min(800 * 2 ** attempt, 8_000));
      }
    }
  }

  throw lastErr;
}
