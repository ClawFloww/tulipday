export interface FieldData {
  id: string;
  name: string;
  location: string;
  distanceKm: number;
  flowerTypes: string[];
  bloomStatus: "in_bloom" | "almost" | "over";
  bloomPercent: number;
  daysRemaining: number;
  tags: string[];
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
