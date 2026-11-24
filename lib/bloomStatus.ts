// Eén bloeistatus voor de hele app: de waarden van locations.bloom_status.
//   early → blooming → peak → ending (volgorde in het seizoen)
// Labels staan in messages/*.json onder `bloom.<status>`; kleuren via tokens.
// Partner-updates (bloom_phase in het partnerportaal) worden hierheen vertaald.

import { ensureUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { BloomStatus } from "@/lib/types";

export const BLOOM_STATUSES: readonly BloomStatus[] = ["early", "blooming", "peak", "ending"];

/** Sorteervolgorde voor "mooiste eerst". */
export const BLOOM_RANK: Record<BloomStatus, number> = { peak: 0, blooming: 1, early: 2, ending: 3 };

export function isBloomStatus(value: unknown): value is BloomStatus {
  return typeof value === "string" && (BLOOM_STATUSES as readonly string[]).includes(value);
}

/** Toon (Badge) en stip-kleur per status, als Tailwind-tokens. */
export const BLOOM_TONE: Record<BloomStatus, { tone: "success" | "warning" | "neutral"; dot: string }> = {
  peak:     { tone: "success", dot: "bg-success" },
  blooming: { tone: "warning", dot: "bg-warning" },
  early:    { tone: "neutral", dot: "bg-info"    },
  ending:   { tone: "neutral", dot: "bg-ink-3"   },
};

/** Fase uit het partnerportaal → app-status. */
export function fromPartnerPhase(phase: string): BloomStatus | null {
  switch (phase) {
    case "not_yet":
    case "first_buds": return "early";
    case "starting":   return "blooming";
    case "peak":       return "peak";
    case "fading":     return "ending";
    default:           return null;
  }
}

export type BloomReportResult = "ok" | "too_often" | "error";

/** Meldt de bloeistatus van een bollenveld (Supabase-functie report_bloom). */
export async function reportBloom(locationId: string, status: BloomStatus): Promise<BloomReportResult> {
  const userId = await ensureUser();
  if (!userId) return "error";
  const { data, error } = await supabase.rpc("report_bloom", { p_location_id: locationId, p_status: status });
  if (error) return "error";
  return data === "too_often" ? "too_often" : "ok";
}
