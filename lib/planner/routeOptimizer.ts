// Route optimizer — selecteert en sorteert stops op basis van tijdsbudget
// Strategie: kies topscorers, cluster per dorp, sorteer via nearest-neighbor TSP

import type { ScoredLocation, PlannedStop, DayPlan, PlannerProfile, TimeBudget, Transport } from "./types";

// ── Tijdsbudgetten (in minuten) ───────────────────────────────────────────
const BUDGET_MINUTES: Record<TimeBudget, number> = {
  "2h":   120,
  "half": 240,
  "full": 420,
};

// Reistijd per km per vervoersmiddel (minuten/km)
const TRAVEL_MIN_PER_KM: Record<Transport, number> = {
  walking:  12,
  cycling:   4,
  car:       2,
};

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

// ── Reistijd schatten (minuten) tussen twee punten ────────────────────────
function travelMinutes(
  from: { lat: number; lng: number },
  to:   { lat: number; lng: number },
  transport: Transport,
): number {
  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  return Math.round(km * TRAVEL_MIN_PER_KM[transport]);
}

// ── Hoofd-functie: bouw optimale dagroute ─────────────────────────────────
export function buildOptimalRoute(
  scored: ScoredLocation[],
  profile: PlannerProfile,
): DayPlan {
  const budget = BUDGET_MINUTES[profile.time];

  // 1. Sorteer op score (hoog → laag)
  const byScore = [...scored].sort((a, b) => b.score - a.score);

  // 2. Cluster kandidaten per dorp
  const clusters: Record<string, ScoredLocation[]> = {};
  for (const loc of byScore) {
    const v = nearestVillage(loc.latitude, loc.longitude);
    if (!clusters[v]) clusters[v] = [];
    clusters[v].push(loc);
  }

  // 3. Pak de top-scorers uit elke cluster (max 2 per dorp voor variatie)
  const candidates: ScoredLocation[] = [];
  const villageOrder = Object.keys(clusters).sort(
    (a, b) => (clusters[b][0]?.score ?? 0) - (clusters[a][0]?.score ?? 0),
  );
  for (const village of villageOrder) {
    candidates.push(...clusters[village].slice(0, 2));
  }

  // 4. Vul tijdsbudget met nearest-neighbor TSP
  const sorted = sortByNearestNeighbor(candidates);
  const selected: ScoredLocation[] = [];
  let usedMin = 0;
  let prevPos: { lat: number; lng: number } | null = null;

  for (const loc of sorted) {
    const travel = prevPos
      ? travelMinutes(prevPos, { lat: loc.latitude, lng: loc.longitude }, profile.transport)
      : 0;
    const visit = loc.avgVisitMin;
    if (usedMin + travel + visit > budget) continue;
    selected.push(loc);
    usedMin += travel + visit;
    prevPos = { lat: loc.latitude, lng: loc.longitude };
    if (selected.length >= 8) break; // hard cap
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
