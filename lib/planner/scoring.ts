// Scoring engine — berekent een score per locatie op basis van het plannerprofield
// Gewichten: bloom 0.30 | interest 0.25 | group 0.20 | accessibility 0.10 | uniqueness 0.15

import type { LocationCandidate, PlannerProfile, ScoredLocation, Vibe } from "./types";

// ── Gemiddelde bezoektijd per categorie (minuten) ─────────────────────────
const AVG_VISIT_MINUTES: Record<string, number> = {
  flower_field: 25,
  photo_spot:   20,
  attraction:   45,
  food:         50,
  bike_rental:  10,
};

// ── Vibe-tags per categorie ───────────────────────────────────────────────
const CATEGORY_VIBE_TAGS: Record<string, Vibe[]> = {
  flower_field: ["bloemen", "natuur", "fotografie"],
  photo_spot:   ["fotografie", "natuur"],
  attraction:   ["cultuur"],
  food:         ["eten"],
  bike_rental:  [],
};

// ── Bloom-score op basis van status ──────────────────────────────────────
// DB-waarden: 'early' | 'blooming' | 'peak' | 'ending' | null
function bloomScore(status: string | null): number {
  switch (status) {
    case "peak":    return 1.0;
    case "blooming":return 0.8;
    case "early":   return 0.5;
    case "ending":  return 0.3;
    default:        return 0.2; // onbekend / geen bloei
  }
}

// ── Interest-score: overlap van vibe-tags met gebruikersvoorkeur ──────────
function interestScore(vibeTags: Vibe[], profile: PlannerProfile): number {
  if (!profile.vibes.length || !vibeTags.length) return 0.4;
  const hits = vibeTags.filter((v) => profile.vibes.includes(v)).length;
  return Math.min(hits / profile.vibes.length, 1.0);
}

// ── Groep-geschiktheid ────────────────────────────────────────────────────
function groupScore(category: string | null, group: PlannerProfile["group"]): number {
  const cat = category ?? "";
  switch (group) {
    case "family":
      // Families houden van toegankelijke velddagen en attracties
      if (cat === "flower_field") return 0.9;
      if (cat === "attraction")   return 0.8;
      if (cat === "food")         return 0.7;
      return 0.5;
    case "couple":
      if (cat === "flower_field") return 1.0;
      if (cat === "photo_spot")   return 0.9;
      if (cat === "food")         return 0.8;
      return 0.6;
    case "friends":
      if (cat === "food")         return 0.9;
      if (cat === "attraction")   return 0.8;
      if (cat === "photo_spot")   return 0.7;
      return 0.6;
    case "solo":
      if (cat === "photo_spot")   return 1.0;
      if (cat === "flower_field") return 0.8;
      return 0.6;
    default:
      return 0.6;
  }
}

// ── Toegankelijkheidsscore ────────────────────────────────────────────────
function accessibilityScore(accessType: string | null, group: PlannerProfile["group"]): number {
  const isPublic = accessType === "public_access";
  // Families en mindervalide reizigers scoren publiek hoog
  if (group === "family") return isPublic ? 1.0 : 0.4;
  return isPublic ? 0.8 : 0.5;
}

// ── Uniekheids-score uit photo_score (genormaliseerd 0-10 → 0-1) ──────────
function uniquenessScore(photoScore: number | null): number {
  if (photoScore === null) return 0.5;
  return Math.min(photoScore / 10, 1.0);
}

// ── Publieksgerichte reden-zinnen (NL) ────────────────────────────────────
function buildReasons(
  loc: LocationCandidate,
  profile: PlannerProfile,
  vibeTags: Vibe[],
): string[] {
  const reasons: string[] = [];
  const cat = loc.category ?? "";

  // Bloei
  if (loc.bloom_status === "peak")     reasons.push("Momenteel op volle bloei");
  else if (loc.bloom_status === "blooming") reasons.push("Bloemen in bloei");
  else if (loc.bloom_status === "early")    reasons.push("Eerste bloemen staan open");

  // Vibe-match
  const hits = vibeTags.filter((v) => profile.vibes.includes(v));
  if (hits.includes("fotografie"))  reasons.push("Prachtige fotoplek");
  if (hits.includes("bloemen"))     reasons.push("Kleurrijke bollenvelden");
  if (hits.includes("natuur"))      reasons.push("In het groen");
  if (hits.includes("cultuur"))     reasons.push("Culturele bezienswaardigheid");
  if (hits.includes("eten"))        reasons.push("Lekker eten en drinken");

  // Groep
  if (profile.group === "family" && cat === "flower_field") reasons.push("Kindvriendelijk");
  if (profile.group === "couple"  && cat === "photo_spot")  reasons.push("Romantische sfeer");

  // Toegankelijkheid
  if (loc.access_type === "public_access") reasons.push("Vrij toegankelijk");

  // Uniciteit
  if ((loc.photo_score ?? 0) >= 8) reasons.push("Unieke plek, weinig bezoekers");

  return reasons.slice(0, 3); // max 3 redenen tonen
}

// ── Hoofd-scorefunctie ─────────────────────────────────────────────────────
export function scoreLocation(
  loc: LocationCandidate,
  profile: PlannerProfile,
): ScoredLocation {
  const vibeTags = CATEGORY_VIBE_TAGS[loc.category ?? ""] ?? [];
  const accessible = loc.access_type === "public_access";
  const avgVisitMin = AVG_VISIT_MINUTES[loc.category ?? ""] ?? 30;

  const bScore = bloomScore(loc.bloom_status);
  const iScore = interestScore(vibeTags, profile);
  const gScore = groupScore(loc.category, profile.group);
  const aScore = accessibilityScore(loc.access_type, profile.group);
  const uScore = uniquenessScore(loc.photo_score);

  const score =
    0.30 * bScore +
    0.25 * iScore +
    0.20 * gScore +
    0.10 * aScore +
    0.15 * uScore;

  const reasons = buildReasons(loc, profile, vibeTags);

  return {
    ...loc,
    score,
    reasons,
    vibeTags,
    accessible,
    avgVisitMin,
  };
}
