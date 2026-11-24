// Rekenwerk op een routelijn voor de navigatie: lengte langs de lijn, de
// dichtstbijzijnde plek op de lijn voor een GPS-fix en een punt op afstand X.
// Alle coördinaten zijn [lng, lat] (MapLibre/GeoJSON). Lokaal plat gerekend
// (equirectangulair): voor afstanden binnen de Bollenstreek ruim nauwkeurig.

export type LngLat = [number, number];

const M_PER_DEG = 111_320;
const toRad = (d: number) => (d * Math.PI) / 180;

/** Afstand in meters tussen twee punten. */
export function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const x = (lng2 - lng1) * Math.cos(toRad((lat1 + lat2) / 2));
  const y = lat2 - lat1;
  return Math.sqrt(x * x + y * y) * M_PER_DEG;
}

/** Kompaskoers van a naar b, 0–360 (0 = noord, 90 = oost). */
export function bearingDeg([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const x = (lng2 - lng1) * Math.cos(toRad((lat1 + lat2) / 2));
  const y = lat2 - lat1;
  const deg = (Math.atan2(x, y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Kleinste hoekverschil b − a, tussen −180 en 180 (positief = rechtsom). */
export function angleDiff(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180;
}

export type NavLine = {
  coords: LngLat[];
  /** Afstand langs de lijn tot elk punt, in meters. */
  cum:    number[];
  length: number;
};

export function buildLine(coords: LngLat[]): NavLine {
  // Dubbele punten achter elkaar geven segmenten van 0 m en dus geen richting
  const clean: LngLat[] = [];
  for (const c of coords) {
    if (clean.length === 0 || distanceM(clean[clean.length - 1], c) > 0.5) clean.push(c);
  }
  const cum = [0];
  for (let i = 1; i < clean.length; i++) cum.push(cum[i - 1] + distanceM(clean[i - 1], clean[i]));
  return { coords: clean, cum, length: cum[cum.length - 1] ?? 0 };
}

/** Punt op de lijn op `along` meter vanaf het begin (begrensd op de lijn). */
export function pointAt(line: NavLine, along: number): LngLat {
  const { coords, cum } = line;
  if (coords.length === 0) return [0, 0];
  if (along <= 0) return coords[0];
  if (along >= line.length) return coords[coords.length - 1];
  // Binair zoeken naar het segment
  let lo = 0, hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= along) lo = mid; else hi = mid;
  }
  const seg = cum[hi] - cum[lo];
  const t = seg === 0 ? 0 : (along - cum[lo]) / seg;
  const [aLng, aLat] = coords[lo];
  const [bLng, bLat] = coords[hi];
  return [aLng + (bLng - aLng) * t, aLat + (bLat - aLat) * t];
}

/** Rijrichting op `along`, gemiddeld over een stukje vooruit zodat knikjes niet doorwerken. */
export function bearingAt(line: NavLine, along: number, lookAhead = 25): number {
  const from = pointAt(line, Math.min(along, line.length - 1));
  const to   = pointAt(line, Math.min(along + lookAhead, line.length));
  if (distanceM(from, to) < 1) {
    return bearingDeg(pointAt(line, Math.max(0, line.length - lookAhead)), pointAt(line, line.length));
  }
  return bearingDeg(from, to);
}

export type Projection = {
  point:  LngLat;
  /** Afstand van de fix tot de lijn, in meters. */
  offset: number;
  /** Afstand langs de lijn tot het geprojecteerde punt. */
  along:  number;
};

/**
 * Dichtstbijzijnde plek op de lijn. Met `minAlong`/`maxAlong` zoek je alleen in
 * een venster — nodig bij rondjes waar de lijn zichzelf kruist of terugkomt.
 */
export function project(line: NavLine, pos: LngLat, minAlong = -Infinity, maxAlong = Infinity): Projection | null {
  const { coords, cum } = line;
  if (coords.length < 2) return null;
  const [pLng, pLat] = pos;
  const kx = Math.cos(toRad(pLat)) * M_PER_DEG;
  const ky = M_PER_DEG;

  let best: Projection | null = null;
  for (let i = 0; i < coords.length - 1; i++) {
    if (cum[i + 1] < minAlong || cum[i] > maxAlong) continue;
    const ax = (coords[i][0] - pLng) * kx,     ay = (coords[i][1] - pLat) * ky;
    const bx = (coords[i + 1][0] - pLng) * kx, by = (coords[i + 1][1] - pLat) * ky;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : -(ax * dx + ay * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const along = cum[i] + t * (cum[i + 1] - cum[i]);
    if (along < minAlong || along > maxAlong) continue;
    const x = ax + t * dx, y = ay + t * dy;
    const offset = Math.sqrt(x * x + y * y);
    if (!best || offset < best.offset) {
      best = {
        point: [pLng + x / kx, pLat + y / ky],
        offset,
        along,
      };
    }
  }
  return best;
}
