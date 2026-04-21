// Route-generator utilities voor TulipDay auto-fietsroutes

import { TulipField, TULIP_FIELDS, haversineDistance } from "@/lib/tulipFields";

// ── Types ────────────────────────────────────────────────────────────────────

export interface LineStringGeo {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat]
}

export interface GeneratedRoute {
  id: string;
  name: string;
  startLocation: { lat: number; lng: number; label: string };
  fields: TulipField[];
  geometry: LineStringGeo;
  distanceKm: number;
  estimatedMinutes: number;
  difficulty: "makkelijk" | "gemiddeld";
  bloomCount: number;
  generatedAt: Date;
}

export interface FieldCluster {
  id: string;
  centroid: { lat: number; lng: number };
  fields: TulipField[];
  radius: number;
}

export type StartLocationKey = "keukenhof" | "lisse" | "hillegom" | "sassenheim" | "noordwijk";
export type DistanceOption   = 5 | 10 | 15 | 20;
export type FieldCountOption = "weinig" | "normaal" | "veel";
export type SortOption       = "dichtstbij" | "meeste_bloei" | "kortste";

export interface RouteFiltersState {
  startKey: StartLocationKey;
  maxDistanceKm: DistanceOption;
  fieldCount: FieldCountOption;
  sort: SortOption;
}

export const DEFAULT_FILTERS: RouteFiltersState = {
  startKey:      "keukenhof",
  maxDistanceKm: 10,
  fieldCount:    "normaal",
  sort:          "dichtstbij",
};

// ── Startpunten ──────────────────────────────────────────────────────────────

export const START_LOCATIONS: Record<StartLocationKey, { name: string; lat: number; lng: number }> = {
  keukenhof:  { name: "Keukenhof",   lat: 52.2697, lng: 4.5461 },
  lisse:      { name: "Lisse",       lat: 52.2553, lng: 4.5573 },
  hillegom:   { name: "Hillegom",    lat: 52.2917, lng: 4.5783 },
  sassenheim: { name: "Sassenheim",  lat: 52.2239, lng: 4.5208 },
  noordwijk:  { name: "Noordwijk",   lat: 52.2378, lng: 4.4436 },
};

// Centroid van de Bollenstreek (relatief referentie voor windrichting)
const LISSE_CENTER = { lat: 52.2553, lng: 4.5573 };

// Aantal velden per filteroptie
export const FIELD_COUNT_RANGE: Record<FieldCountOption, { min: number; max: number }> = {
  weinig:  { min: 3,  max: 5  },
  normaal: { min: 6,  max: 10 },
  veel:    { min: 11, max: 15 },
};

// ── Grid-gebaseerde clustering ───────────────────────────────────────────────

export function clusterFields(fields: TulipField[], radiusKm = 2): FieldCluster[] {
  // Bij lat ~52°: 1° lat ≈ 111.2 km, 1° lng ≈ 68.5 km
  const latStep = radiusKm / 111.2;
  const lngStep = radiusKm / 68.5;

  const grid = new Map<string, TulipField[]>();

  for (const field of fields) {
    const row = Math.floor(field.lat / latStep);
    const col = Math.floor(field.lng / lngStep);
    const key = `${row},${col}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(field);
  }

  return Array.from(grid.entries()).map(([, cellFields], i) => {
    const centroid = {
      lat: cellFields.reduce((s, f) => s + f.lat, 0) / cellFields.length,
      lng: cellFields.reduce((s, f) => s + f.lng, 0) / cellFields.length,
    };
    return {
      id: `cluster_${i}`,
      centroid,
      fields: cellFields,
      radius: radiusKm,
    };
  });
}

// ── Slimme veldselectie — verspreid over het gebied ──────────────────────────

export function selectSpreadFields(
  fields: TulipField[], // gesorteerd op afstand van startpunt
  max: number,
  minSpacingKm = 0.5,
): TulipField[] {
  const selected: TulipField[] = [];
  for (const field of fields) {
    if (selected.length >= max) break;
    const tooClose = selected.some(
      (s) => haversineDistance(s.lat, s.lng, field.lat, field.lng) < minSpacingKm * 1000,
    );
    if (!tooClose) selected.push(field);
  }
  return selected;
}

// ── Routenaam generatie ──────────────────────────────────────────────────────

function extractStreetName(fieldName: string): string {
  return fieldName
    .replace(/\s+\(.*?\)$/, "")  // verwijder suffix tussen haakjes
    .replace(/\s+\d+\s*$/, "")   // verwijder trailing getal
    .trim();
}

function getCardinalDirection(lat: number, lng: number): string {
  const dLat = lat - LISSE_CENTER.lat;
  const dLng = lng - LISSE_CENTER.lng;
  if (Math.abs(dLat) > Math.abs(dLng)) return dLat > 0 ? "Noord" : "Zuid";
  return dLng > 0 ? "Oost" : "West";
}

export function generateRouteName(fields: TulipField[], distanceKm: number): string {
  if (fields.length === 0) return `Route · ${distanceKm} km`;

  // Tel de meest voorkomende straatnamen
  const counts = new Map<string, number>();
  for (const f of fields) {
    const street = extractStreetName(f.name);
    counts.set(street, (counts.get(street) ?? 0) + 1);
  }

  // Meest voorkomende straatnaam
  let topStreet = extractStreetName(fields[0].name);
  let topCount  = 0;
  counts.forEach((count, street) => {
    if (count > topCount) { topCount = count; topStreet = street; }
  });

  // Windrichting op basis van centroid van de velden
  const centLat = fields.reduce((s, f) => s + f.lat, 0) / fields.length;
  const centLng = fields.reduce((s, f) => s + f.lng, 0) / fields.length;
  const dir = getCardinalDirection(centLat, centLng);

  return `${topStreet} ${dir} · ${distanceKm} km`;
}

// ── OSRM API aanroep ─────────────────────────────────────────────────────────

const OSRM_BASE = "https://router.project-osrm.org/route/v1/bike";

export async function fetchOSRMRoute(
  start: { lat: number; lng: number },
  waypoints: TulipField[],
): Promise<{ geometry: LineStringGeo; distanceM: number; durationS: number }> {
  // OSRM verwacht lng,lat volgorde; sluit de lus terug naar start
  const points = [
    start,
    ...waypoints.map((f) => ({ lat: f.lat, lng: f.lng })),
    start,
  ];

  const coordStr = points.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson`;

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.[0]) {
    throw new Error("Geen route gevonden");
  }

  const r = data.routes[0];
  return { geometry: r.geometry, distanceM: r.distance, durationS: r.duration };
}

// ── Bouw een complete GeneratedRoute ─────────────────────────────────────────

export type RouteDirection = "all" | "north" | "south" | "east" | "west";

export async function buildGeneratedRoute(
  start: { lat: number; lng: number; label: string },
  maxDistanceKm: number,
  maxFields: number,
  direction: RouteDirection = "all",
  fields: TulipField[] = TULIP_FIELDS,
): Promise<GeneratedRoute> {
  // Stap 1: filter velden binnen straal
  const nearby = fields.filter(
    (f) => haversineDistance(start.lat, start.lng, f.lat, f.lng) <= maxDistanceKm * 1000,
  );

  if (nearby.length === 0) throw new Error("Geen velden gevonden in dit gebied");

  // Stap 2: richtingsfilter voor variatie tussen routes
  const midLat = nearby.reduce((s, f) => s + f.lat, 0) / nearby.length;
  const midLng = nearby.reduce((s, f) => s + f.lng, 0) / nearby.length;

  const directional = direction === "all" ? nearby
    : direction === "north" ? nearby.filter((f) => f.lat >= midLat)
    : direction === "south" ? nearby.filter((f) => f.lat < midLat)
    : direction === "east"  ? nearby.filter((f) => f.lng >= midLng)
    : nearby.filter((f) => f.lng < midLng); // west

  const pool = directional.length >= 3 ? directional : nearby;

  // Stap 3: sorteer op afstand van start, selecteer verspreid
  const sorted = [...pool].sort(
    (a, b) =>
      haversineDistance(start.lat, start.lng, a.lat, a.lng) -
      haversineDistance(start.lat, start.lng, b.lat, b.lng),
  );

  const minSpacing = maxDistanceKm / 20; // schaalt mee met radius
  const selected = selectSpreadFields(sorted, maxFields, minSpacing);
  if (selected.length < 2) throw new Error("Te weinig velden voor een route");

  // Stap 4: OSRM route ophalen
  const { geometry, distanceM } = await fetchOSRMRoute(start, selected);

  const distanceKm      = Math.round(distanceM / 100) / 10;
  const estimatedMinutes = Math.round((distanceKm / 15) * 60);

  return {
    id:             `route_${Date.now()}_${direction}`,
    name:           generateRouteName(selected, distanceKm),
    startLocation:  start,
    fields:         selected,
    geometry,
    distanceKm,
    estimatedMinutes,
    difficulty:     distanceKm <= 12 ? "makkelijk" : "gemiddeld",
    bloomCount:     0, // wordt ingesteld door de aanroeper op basis van live statussen
    generatedAt:    new Date(),
  };
}
