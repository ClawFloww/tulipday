// Bloom-aware route utilities voor TulipDay

import type { GeneratedRoute } from "@/lib/routeGenerator";
import type { FieldBloomStatus } from "@/lib/tulipFields";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BloomAwareRoute extends GeneratedRoute {
  bloomScore: number;       // 0–1 gewogen bloeikwaliteit
  staleness: number;        // 0–1; 0 = vers, 1 = volledig stale (>4h)
  lastRecalculated: Date;
  fieldsWithStatus: number; // aantal velden met een bekende status
  fieldsInBloom: number;    // aantal velden in bloei
}

// ── Seizoenscurve ────────────────────────────────────────────────────────────

// Weeknummer → verwachte bloeifractie (week 13 = eind maart)
export const BLOOM_SEASON_CURVE: Record<number, number> = {
  13: 0.20,
  14: 0.45,
  15: 0.75,
  16: 0.95,
  17: 0.85,
  18: 0.50,
  19: 0.20,
  20: 0.05,
};

export function getCurrentWeek(): number {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff  = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
}

export function getSeasonExpectedBloom(week = getCurrentWeek()): number {
  if (week in BLOOM_SEASON_CURVE) return BLOOM_SEASON_CURVE[week];
  if (week < 13 || week > 20) return 0;
  return 0.10;
}

// ── Score-berekeningen ────────────────────────────────────────────────────────

// Staleness: 0 = vers, 1 = stale na 4 uur
export function calcStaleness(lastRecalculated: Date): number {
  const ageMs        = Date.now() - lastRecalculated.getTime();
  const staleAfterMs = 4 * 60 * 60 * 1000;
  return Math.min(1, ageMs / staleAfterMs);
}

export function calcBloomScore(
  route: GeneratedRoute,
  statuses: FieldBloomStatus[],
): { bloomScore: number; fieldsWithStatus: number; fieldsInBloom: number } {
  if (route.fields.length === 0) {
    return { bloomScore: 0, fieldsWithStatus: 0, fieldsInBloom: 0 };
  }

  let fieldsWithStatus = 0;
  let fieldsInBloom    = 0;
  let weightedScore    = 0;

  for (const field of route.fields) {
    // Neem de meest recente status voor dit veld
    const status = statuses
      .filter((s) => s.fieldId === field.id)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (!status) continue;

    fieldsWithStatus++;
    const reliability = status.reliabilityScore ?? 0.5;

    if (status.status === "in_bloom") {
      fieldsInBloom++;
      weightedScore += reliability;
    } else if (status.status === "fading") {
      weightedScore += reliability * 0.3;
    }
    // "finished" → 0 bijdrage
  }

  // Geen statusdata → schat op basis van seizoen (lagere zekerheid)
  if (fieldsWithStatus === 0) {
    return {
      bloomScore:      getSeasonExpectedBloom() * 0.5,
      fieldsWithStatus: 0,
      fieldsInBloom:   0,
    };
  }

  const coverageFraction = fieldsWithStatus / route.fields.length;
  const baseScore        = weightedScore / route.fields.length;

  // Blend: hoe meer velden met status, hoe betrouwbaarder de score
  const bloomScore = baseScore * (0.6 + 0.4 * coverageFraction);

  return { bloomScore: Math.min(1, bloomScore), fieldsWithStatus, fieldsInBloom };
}

// Verhef een GeneratedRoute naar een BloomAwareRoute
export function toBloomAwareRoute(
  route: GeneratedRoute,
  statuses: FieldBloomStatus[],
): BloomAwareRoute {
  const { bloomScore, fieldsWithStatus, fieldsInBloom } = calcBloomScore(route, statuses);
  return {
    ...route,
    bloomScore,
    staleness:        calcStaleness(route.generatedAt),
    lastRecalculated: route.generatedAt,
    fieldsWithStatus,
    fieldsInBloom,
  };
}

export function sortByBloomScore(routes: BloomAwareRoute[]): BloomAwareRoute[] {
  return [...routes].sort((a, b) => b.bloomScore - a.bloomScore);
}

// ── UI helpers ───────────────────────────────────────────────────────────────

export function bloomScoreColor(score: number): string {
  if (score >= 0.7) return "#2D7D46";
  if (score >= 0.4) return "#E8A020";
  return "#9E9E9E";
}

export function bloomScoreLabel(score: number): string {
  if (score >= 0.8) return "Prachtig in bloei";
  if (score >= 0.6) return "Veel bloei";
  if (score >= 0.4) return "Gedeeltelijk in bloei";
  if (score >= 0.2) return "Weinig bloei";
  return "Nog niet in bloei";
}
