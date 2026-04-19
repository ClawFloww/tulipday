// ─── Types ────────────────────────────────────────────────────────────────────

export interface CorsoStopData {
  id: number;
  plaats: string;
  tijd: string;       // "HH:MM" — local NL time
  lat: number;
  lng: number;
  info: string | null;
  tribune: boolean;
  pauze?: boolean;
}

export type StopStatus = "passed" | "current" | "upcoming" | "future_day";

// ─── Route data ───────────────────────────────────────────────────────────────

export const CORSO_STOPS: CorsoStopData[] = [
  { id: 1, plaats: "Noordwijk",  tijd: "09:00", lat: 52.2466, lng: 4.4317, info: "Officiële start op de Koningin Wilhelmina Boulevard", tribune: true },
  { id: 2, plaats: "Voorhout",   tijd: "11:00", lat: 52.2205, lng: 4.4812, info: "Rijdt de Herenstraat binnen", tribune: true },
  { id: 3, plaats: "Sassenheim", tijd: "12:00", lat: 52.2296, lng: 4.5240, info: "Pauze ~1,5 uur rond 13:00. Corso zichtbaar 12:00–14:30", tribune: true, pauze: true },
  { id: 4, plaats: "Lisse",      tijd: "15:15", lat: 52.2579, lng: 4.5527, info: "Langs Gemeentehuis & Keukenhof boulevard — populairste kijkplek", tribune: true },
  { id: 5, plaats: "Hillegom",   tijd: "16:25", lat: 52.2952, lng: 4.5791, info: "Verlaat de Bollenstreek rond 17:30", tribune: true },
  { id: 6, plaats: "Bennebroek", tijd: "18:05", lat: 52.3221, lng: 4.5920, info: null, tribune: false },
  { id: 7, plaats: "Heemstede",  tijd: "19:40", lat: 52.3529, lng: 4.6248, info: null, tribune: false },
  { id: 8, plaats: "Haarlem",    tijd: "21:30", lat: 52.3813, lng: 4.6363, info: "Feestelijke avondintocht in het centrum", tribune: false },
];

export const LICHTJES_CORSO = {
  plaats: "Noordwijkerhout",
  tijd: "21:00",
  lat: 52.2556,
  lng: 4.5025,
  info: "Vrijdagavond verlicht corso — duizenden lampjes op de praalwagens",
};

// ─── Annual dates (third Saturday of April) ──────────────────────────────────

const KNOWN_DATES: Record<number, string> = {
  2026: "2026-04-18",
  2027: "2027-04-17",
  2028: "2028-04-15",
  2029: "2029-04-21",
  2030: "2030-04-20",
};

export function getCorsoDate(year: number): Date {
  if (KNOWN_DATES[year]) return new Date(KNOWN_DATES[year] + "T00:00:00");
  // Third Saturday of April
  const d = new Date(year, 3, 1);
  const dow = d.getDay(); // 0=Sun … 6=Sat
  const daysToSat = (6 - dow + 7) % 7;
  return new Date(year, 3, 1 + daysToSat + 14);
}

export function getLichtjesDate(year: number): Date {
  const corso = getCorsoDate(year);
  const d = new Date(corso);
  d.setDate(d.getDate() - 1); // Friday before
  return d;
}

// ─── Live-timing helpers ──────────────────────────────────────────────────────

function parseStopTime(stop: CorsoStopData, day: Date): Date {
  const [h, m] = stop.tijd.split(":").map(Number);
  const t = new Date(day);
  t.setHours(h, m, 0, 0);
  return t;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * Returns the status of each stop relative to `now`.
 * - future_day : corso hasn't happened yet (different day)
 * - upcoming   : corso day, but this stop not yet reached
 * - current    : this is the stop the corso is currently at or just left
 * - passed     : this stop was clearly passed (next stop already active)
 */
export function getStopStatuses(now: Date): StopStatus[] {
  const year = now.getFullYear();
  const corsoDate = getCorsoDate(year);

  if (!isSameDay(now, corsoDate)) {
    const future = now < corsoDate;
    return CORSO_STOPS.map(() => (future ? "future_day" : "passed"));
  }

  // Find the last stop whose time <= now
  const stopTimes = CORSO_STOPS.map((s) => parseStopTime(s, corsoDate));
  let currentIdx = -1;
  for (let i = 0; i < stopTimes.length; i++) {
    if (stopTimes[i] <= now) currentIdx = i;
  }

  return CORSO_STOPS.map((_, i) => {
    if (i < currentIdx) return "passed";
    if (i === currentIdx) return "current";
    return "upcoming";
  });
}

export type CorsoPhase = "before" | "today_countdown" | "live" | "ended";

export function getCorsoPhase(now: Date): CorsoPhase {
  const year = now.getFullYear();
  const corsoDate = getCorsoDate(year);

  if (!isSameDay(now, corsoDate)) {
    return now < corsoDate ? "before" : "ended";
  }

  const start = parseStopTime(CORSO_STOPS[0], corsoDate);
  const end = parseStopTime(CORSO_STOPS[CORSO_STOPS.length - 1], corsoDate);
  // Add ~2h after last stop
  const endPlus = new Date(end.getTime() + 2 * 3600 * 1000);

  if (now < start) return "today_countdown";
  if (now > endPlus) return "ended";
  return "live";
}

export function msUntilCorso(now: Date): number {
  const year = now.getFullYear();
  const corsoDate = getCorsoDate(year);
  const start = new Date(corsoDate);
  start.setHours(9, 0, 0, 0);
  return Math.max(0, start.getTime() - now.getTime());
}

// ─── Backward-compat shims for photo-upload + photo-map ──────────────────────

export interface CorsoStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
}

export const CORSO_ROUTE: CorsoStop[] = CORSO_STOPS.map((s) => ({
  id:    `s${s.id}`,
  name:  s.plaats,
  lat:   s.lat,
  lng:   s.lng,
  order: s.id,
}));

export function nearestStop(lat: number, lng: number): CorsoStop {
  let best = CORSO_ROUTE[0];
  let bestDist = Infinity;
  for (const stop of CORSO_ROUTE) {
    const d = Math.sqrt((stop.lat - lat) ** 2 + (stop.lng - lng) ** 2);
    if (d < bestDist) { bestDist = d; best = stop; }
  }
  return best;
}
