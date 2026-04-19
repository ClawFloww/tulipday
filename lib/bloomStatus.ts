export interface FieldData {
  id: string;
  slug: string;
  name: string;
  location: string;
  distanceKm: number;
  flowerTypes: string[];
  bloomStatus: "in_bloom" | "almost" | "over";
  bloomPercent: number;
  daysRemaining: number;
  tags: string[];
  imageUrl: string | null;
  imageEmoji: string;
  imageBgColor: string;
}

export type BloomStatusValue = "in_bloom" | "almost" | "over";

export interface BloomColors {
  bg: string;
  text: string;
  dot: string;
  bar: string;
}

export function getBloomStatus(field: FieldData): BloomStatusValue {
  if (field.bloomPercent >= 50) return "in_bloom";
  if (field.bloomPercent >= 15) return "almost";
  return "over";
}

export function getBloomLabel(status: BloomStatusValue): string {
  switch (status) {
    case "in_bloom": return "In volle bloei";
    case "almost":   return "Bijna in bloei";
    case "over":     return "Bloei voorbij";
  }
}

export function getBloomColor(status: BloomStatusValue): BloomColors {
  switch (status) {
    case "in_bloom":
      return { bg: "#EAF3DE", text: "#27500A", dot: "#639922", bar: "#639922" };
    case "almost":
      return { bg: "#FAEEDA", text: "#633806", dot: "#BA7517", bar: "#BA7517" };
    case "over":
      return { bg: "#FCEBEB", text: "#791F1F", dot: "#E24B4A", bar: "#E24B4A" };
  }
}

export function getDaysLabel(daysRemaining: number): string {
  if (daysRemaining === 0) return "seizoen afgelopen";
  if (daysRemaining === 1) return "nog ~1 dag";
  return `nog ~${daysRemaining} dagen`;
}

export function filterByStatus(fields: FieldData[], filter: string): FieldData[] {
  switch (filter) {
    case "In bloei": return fields.filter((f) => getBloomStatus(f) === "in_bloom");
    case "Bijna":    return fields.filter((f) => getBloomStatus(f) === "almost");
    case "Voorbij":  return fields.filter((f) => getBloomStatus(f) === "over");
    default:         return fields;
  }
}

export function filterByDistance(fields: FieldData[], maxKm: number): FieldData[] {
  return fields.filter((f) => f.distanceKm <= maxKm);
}

// ── DB-status → FieldData mapper ─────────────────────────────────────────────
import type { Location } from "@/lib/types";

const DB_TO_BLOOM: Record<string, "in_bloom" | "almost" | "over"> = {
  peak:     "in_bloom",
  blooming: "in_bloom",
  early:    "almost",
  ending:   "over",
};

const DB_TO_PERCENT: Record<string, number> = {
  peak: 92, blooming: 72, early: 28, ending: 12,
};

const BG_COLORS = ["#FFE4E8","#FDE8F5","#FFF8D6","#FFE0E0","#FFFBCC","#EFE0FF","#E8F0E8"];

export function locationToFieldData(
  loc: Location,
  userLat?: number,
  userLng?: number,
): FieldData {
  const status  = DB_TO_BLOOM[loc.bloom_status ?? "blooming"] ?? "in_bloom";
  const percent = DB_TO_PERCENT[loc.bloom_status ?? "blooming"] ?? 72;

  // Afstand berekenen (Haversine)
  let distanceKm = 999;
  if (userLat != null && userLng != null && loc.latitude && loc.longitude) {
    const R = 6371;
    const dLat = ((loc.latitude - userLat) * Math.PI) / 180;
    const dLon = ((loc.longitude - userLng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos((userLat * Math.PI) / 180)
      * Math.cos((loc.latitude * Math.PI) / 180)
      * Math.sin(dLon / 2) ** 2;
    distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  const tags: string[] = [];
  if (loc.access_type === "public_access")   tags.push("Vrij toegankelijk");
  if (loc.access_type === "roadside_only")   tags.push("Langs de weg");
  if (loc.parking_info)                      tags.push("Parkeren aanwezig");

  const bg = BG_COLORS[Math.abs(loc.id.charCodeAt(0) - 65) % BG_COLORS.length];

  return {
    id:           loc.id,
    slug:         loc.slug,
    name:         loc.title,
    location:     loc.address ?? "",
    distanceKm,
    flowerTypes:  loc.flower_type ? loc.flower_type.split(",").map(s => s.trim()) : ["tulp"],
    bloomStatus:  status,
    bloomPercent: percent,
    daysRemaining: status === "over" ? 0 : status === "almost" ? 5 : 14,
    tags,
    imageUrl:     loc.image_url,
    imageEmoji:   "🌷",
    imageBgColor: bg,
  };
}
