export interface CorsoStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
}

export const CORSO_ROUTE: CorsoStop[] = [
  { id: "s1", name: "Noordwijkerhout", lat: 52.2618, lng: 4.5000, order: 1 },
  { id: "s2", name: "Lisse",           lat: 52.2593, lng: 4.5579, order: 2 },
  { id: "s3", name: "Hillegom",        lat: 52.2972, lng: 4.5789, order: 3 },
  { id: "s4", name: "Bennebroek",      lat: 52.3182, lng: 4.6089, order: 4 },
  { id: "s5", name: "Heemstede",       lat: 52.3497, lng: 4.6194, order: 5 },
  { id: "s6", name: "Bloemendaal",     lat: 52.3940, lng: 4.6158, order: 6 },
  { id: "s7", name: "Haarlem-West",   lat: 52.3820, lng: 4.6200, order: 7 },
  { id: "s8", name: "Haarlem Centrum", lat: 52.3874, lng: 4.6382, order: 8 },
];

export function nearestStop(lat: number, lng: number): CorsoStop {
  let best = CORSO_ROUTE[0];
  let bestDist = Infinity;
  for (const stop of CORSO_ROUTE) {
    const d = Math.sqrt((stop.lat - lat) ** 2 + (stop.lng - lng) ** 2);
    if (d < bestDist) { bestDist = d; best = stop; }
  }
  return best;
}
