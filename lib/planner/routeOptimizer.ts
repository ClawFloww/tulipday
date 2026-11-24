// Route optimizer — selecteert en sorteert stops op basis van tijdsbudget
// Strategie: eerst één ankerstop per gekozen vibe, daarna aanvullen met topscorers
// in de buurt (max 2 per dorp); volgorde via nearest-neighbor TSP + 2-opt

import type { ScoredLocation, PlannedStop, DayPlan, PlannerProfile, TimeBudget, Transport, Vibe } from "./types";

// ── Tijdsbudgetten (in minuten) ───────────────────────────────────────────
const BUDGET_MINUTES: Record<TimeBudget, number> = {
  "2h":   120,
  "half": 240,
  "full": 420,
};

// Reistijd per km per vervoersmiddel (minuten/km)
export const TRAVEL_MIN_PER_KM: Record<Transport, number> = {
  walking:  12,
  cycling:   4,
  car:       2,
};

// Afstandsstraf (scorepunten per km) bij het kiezen van stops: houdt de route
// compact, vooral te voet
const DISTANCE_PENALTY_PER_KM: Record<Transport, number> = {
  walking: 0.15,
  cycling: 0.04,
  car:     0.01,
};

const MAX_STOPS            = 8;
const MAX_STOPS_PER_VILLAGE = 2;

// ── Preset dorpen voor clustering ─────────────────────────────────────────
const VILLAGES = [
  { id: "lisse",      lat: 52.258, lng: 4.558 },
  { id: "hillegom",   lat: 52.292, lng: 4.579 },
  { id: "sassenheim", lat: 52.227, lng: 4.524 },
  { id: "noordwijk",  lat: 52.237, lng: 4.441 },
  { id: "voorhout",   lat: 52.213, lng: 4.490 },
  { id: "keukenhof",  lat: 52.271, lng: 4.546 },
];

// ── Haversine afstand in km ────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Dichtstbijzijnd dorp ──────────────────────────────────────────────────
function nearestVillage(lat: number, lng: number): string {
  let best = VILLAGES[0].id;
  let bestDist = Infinity;
  for (const v of VILLAGES) {
    const d = haversineKm(lat, lng, v.lat, v.lng);
    if (d < bestDist) { bestDist = d; best = v.id; }
  }
  return best;
}

// ── Nearest-neighbor TSP op een lijst stops ───────────────────────────────
function sortByNearestNeighbor(stops: ScoredLocation[]): ScoredLocation[] {
  if (stops.length <= 2) return stops;
  const remaining = [...stops];
  const ordered: ScoredLocation[] = [remaining.shift()!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(last.latitude, last.longitude, remaining[i].latitude, remaining[i].longitude);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    ordered.push(remaining.splice(nearestIdx, 1)[0]);
  }
  return ordered;
}

// ── Totale routelengte in km ──────────────────────────────────────────────
function routeDistanceKm(route: ScoredLocation[]): number {
  let d = 0;
  for (let i = 0; i < route.length - 1; i++) {
    d += haversineKm(route[i].latitude, route[i].longitude, route[i + 1].latitude, route[i + 1].longitude);
  }
  return d;
}

// ── 2-opt verbetering: keer segmenten om zolang de route korter wordt ─────
function twoOpt(route: ScoredLocation[]): ScoredLocation[] {
  if (route.length <= 3) return route;
  let best = [...route];
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [
          ...best.slice(0, i),
          ...best.slice(i, j + 1).reverse(),
          ...best.slice(j + 1),
        ];
        if (routeDistanceKm(candidate) < routeDistanceKm(best)) {
          best = candidate;
          improved = true;
        }
      }
    }
  }
  return best;
}

// ── Reistijd schatten (minuten) tussen twee punten ────────────────────────
function travelMinutes(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
  transport: Transport,
): number {
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  return Math.round(km * TRAVEL_MIN_PER_KM[transport]);
}

// ── Volgorde + totale tijd (reizen + bezoeken) van een set stops ──────────
function orderStops(stops: ScoredLocation[]): ScoredLocation[] {
  return twoOpt(sortByNearestNeighbor(stops));
}

function routeMinutes(route: ScoredLocation[], transport: Transport): number {
  let min = 0;
  for (let i = 0; i < route.length; i++) {
    min += route[i].avgVisitMin;
    if (i > 0) {
      min += travelMinutes(
        { lat: route[i - 1].latitude, lng: route[i - 1].longitude },
        { lat: route[i].latitude,     lng: route[i].longitude },
        transport,
      );
    }
  }
  return min;
}

// ── Score min afstandsstraf tot de dichtstbijzijnde al gekozen stop ──────
function rankNear(loc: ScoredLocation, chosen: ScoredLocation[], transport: Transport): number {
  if (chosen.length === 0) return loc.score;
  let nearest = Infinity;
  for (const c of chosen) {
    nearest = Math.min(nearest, haversineKm(loc.latitude, loc.longitude, c.latitude, c.longitude));
  }
  return loc.score - nearest * DISTANCE_PENALTY_PER_KM[transport];
}

/**
 * Eén ankerstop per gekozen vibe, zodat elk aangevinkt onderwerp in de route
 * zit. Een stop kan meerdere vibes dekken (bollenveld: bloemen, natuur,
 * fotografie). Zeldzame vibes eerst, zodat de route rond die plekken ligt.
 */
function pickVibeAnchors(scored: ScoredLocation[], profile: PlannerProfile): ScoredLocation[] {
  const optionsFor = (vibe: Vibe) => scored.filter((l) => l.vibeTags.includes(vibe));
  const vibes = [...profile.vibes].sort((a, b) => optionsFor(a).length - optionsFor(b).length);

  const anchors: ScoredLocation[] = [];
  for (const vibe of vibes) {
    if (anchors.some((a) => a.vibeTags.includes(vibe))) continue;
    let best: ScoredLocation | null = null;
    let bestRank = -Infinity;
    for (const loc of optionsFor(vibe)) {
      if (anchors.includes(loc)) continue;
      const rank = rankNear(loc, anchors, profile.transport);
      if (rank > bestRank) { bestRank = rank; best = loc; }
    }
    if (best) anchors.push(best);
  }
  return anchors;
}

// ── Hoofd-functie: bouw optimale dagroute ─────────────────────────────────
export function buildOptimalRoute(
  scored: ScoredLocation[],
  profile: PlannerProfile,
): DayPlan {
  const budget = BUDGET_MINUTES[profile.time];

  // 1. Ankers: elke gekozen vibe minstens één keer
  let selected = orderStops(pickVibeAnchors(scored, profile));

  // Past het niet in het budget, laat dan het anker vallen dat de meeste tijd kost
  while (selected.length > 1 && routeMinutes(selected, profile.transport) > budget) {
    let bestRoute = selected;
    let bestMin = Infinity;
    for (let i = 0; i < selected.length; i++) {
      const route = orderStops(selected.filter((_, k) => k !== i));
      const min = routeMinutes(route, profile.transport);
      if (min < bestMin) { bestMin = min; bestRoute = route; }
    }
    selected = bestRoute;
  }

  // 2. Aanvullen met de beste stops in de buurt, binnen het tijdsbudget
  //    (max 2 per dorp voor variatie)
  const perVillage: Record<string, number> = {};
  for (const loc of selected) {
    const v = nearestVillage(loc.latitude, loc.longitude);
    perVillage[v] = (perVillage[v] ?? 0) + 1;
  }
  const rejected = new Set<string>();

  while (selected.length < MAX_STOPS) {
    let next: ScoredLocation | null = null;
    let nextRank = -Infinity;
    for (const loc of scored) {
      if (rejected.has(loc.id) || selected.includes(loc)) continue;
      if ((perVillage[nearestVillage(loc.latitude, loc.longitude)] ?? 0) >= MAX_STOPS_PER_VILLAGE) continue;
      const rank = rankNear(loc, selected, profile.transport);
      if (rank > nextRank) { nextRank = rank; next = loc; }
    }
    if (!next) break;

    const route = orderStops([...selected, next]);
    if (routeMinutes(route, profile.transport) <= budget) {
      selected = route;
      const v = nearestVillage(next.latitude, next.longitude);
      perVillage[v] = (perVillage[v] ?? 0) + 1;
    } else {
      rejected.add(next.id);
    }
  }

  // 5. Bouw tijdblokken (start om 09:00)
  const START_HOUR_MIN = 0; // t.o.v. 09:00
  let cursor = START_HOUR_MIN;
  let prevStop: PlannedStop | null = null;

  const stops: PlannedStop[] = selected.map((loc) => {
    const travel = prevStop
      ? travelMinutes(
          { lat: prevStop.lat, lng: prevStop.lng },
          { lat: loc.latitude, lng: loc.longitude },
          profile.transport,
        )
      : 0;
    cursor += travel;
    const stop: PlannedStop = {
      id:          loc.id,
      name:        loc.title,
      slug:        loc.slug,
      lat:         loc.latitude,
      lng:         loc.longitude,
      category:    loc.category ?? "flower_field",
      image_url:   loc.image_url,
      startMin:    cursor,
      durationMin: loc.avgVisitMin,
      reasons:     loc.reasons,
    };
    cursor += loc.avgVisitMin;
    prevStop = stop;
    return stop;
  });

  return {
    profile,
    stops,
    totalMin: cursor,
    generatedAt: new Date().toISOString(),
  };
}
