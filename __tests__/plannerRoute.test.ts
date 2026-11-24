/**
 * Tests voor lib/planner (scoring + routeOptimizer)
 *
 * Kritiekheid: HOOG
 * - Elke aangevinkte vibe moet in de gegenereerde dagroute terugkomen.
 * - Totale reis- + bezoektijd blijft binnen het gekozen tijdsbudget.
 * - Te voet geen sprongen tussen ver uiteen gelegen dorpen.
 * - Bij vibe "bloemen" krijgt een bollenveld in volle bloei voorrang.
 */

import { describe, it, expect } from "vitest";
import { scoreLocation } from "@/lib/planner/scoring";
import { buildOptimalRoute, TRAVEL_MIN_PER_KM } from "@/lib/planner/routeOptimizer";
import type { LocationCandidate, PlannerProfile, Vibe } from "@/lib/planner/types";

let n = 0;
function loc(category: string, lat: number, lng: number, extra: Partial<LocationCandidate> = {}): LocationCandidate {
  n++;
  return {
    id: `loc-${n}`, title: `${category} ${n}`, slug: null,
    latitude: lat, longitude: lng, category,
    bloom_status: null, access_type: "public_access", photo_score: 6, image_url: null,
    ...extra,
  };
}

// Veel bollenvelden in bloei rond Lisse en Hillegom; weinig horeca en cultuur.
// Zonder vibe-ankers verdringen de velden alle andere categorieën.
const LOCATIONS: LocationCandidate[] = [
  ...Array.from({ length: 12 }, (_, i) =>
    loc("flower_field", 52.25 + i * 0.004, 4.55 + (i % 4) * 0.004, { bloom_status: "peak", photo_score: 9 })),
  ...Array.from({ length: 8 }, (_, i) =>
    loc("flower_field", 52.29 + i * 0.003, 4.575 + (i % 3) * 0.003, { bloom_status: "blooming", photo_score: 8 })),
  loc("photo_spot", 52.262, 4.561),
  loc("attraction", 52.271, 4.546), // Keukenhof-gebied
  loc("attraction", 52.228, 4.522), // Sassenheim
  loc("food", 52.258, 4.558),       // Lisse
  loc("food", 52.237, 4.441, { access_type: null }), // Noordwijk, ver weg
];

function plan(profile: Partial<PlannerProfile>) {
  const full: PlannerProfile = {
    group: "couple", time: "full", transport: "cycling", vibes: ["bloemen"], pace: "normal", ...profile,
  };
  const scored = LOCATIONS.map((l) => scoreLocation(l, full));
  return { profile: full, scored, result: buildOptimalRoute(scored, full) };
}

const VIBE_CATEGORIES: Record<Vibe, string[]> = {
  bloemen:    ["flower_field"],
  fotografie: ["flower_field", "photo_spot"],
  cultuur:    ["attraction"],
  eten:       ["food"],
  natuur:     ["flower_field", "photo_spot"],
};

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

describe("buildOptimalRoute — vibe-dekking", () => {
  const cases: { vibes: Vibe[]; time: PlannerProfile["time"]; transport: PlannerProfile["transport"] }[] = [
    { vibes: ["bloemen", "cultuur", "eten"],                         time: "full", transport: "cycling" },
    { vibes: ["bloemen", "fotografie", "cultuur", "eten", "natuur"], time: "full", transport: "cycling" },
    { vibes: ["eten", "cultuur"],                                    time: "half", transport: "walking" },
    { vibes: ["bloemen", "fotografie", "cultuur", "eten", "natuur"], time: "half", transport: "car" },
    // Korte route: kortere bezoektijden zodat alles toch past
    { vibes: ["bloemen", "fotografie", "cultuur", "eten", "natuur"], time: "2h",   transport: "walking" },
  ];

  for (const { vibes, time, transport } of cases) {
    it(`dekt ${vibes.join(", ")} (${time}, ${transport})`, () => {
      const { result } = plan({ vibes, time, transport });
      const categories = new Set(result.stops.map((s) => s.category));
      for (const vibe of vibes) {
        expect(VIBE_CATEGORIES[vibe].some((c) => categories.has(c)), `vibe ${vibe}`).toBe(true);
      }
    });
  }
});

describe("buildOptimalRoute — acceptatiecriteria", () => {
  it("blijft binnen het tijdsbudget", () => {
    for (const time of ["2h", "half", "full"] as const) {
      for (const transport of ["walking", "cycling", "car"] as const) {
        const { result } = plan({ vibes: ["bloemen", "cultuur", "eten"], time, transport });
        const budget = { "2h": 120, half: 240, full: 420 }[time];
        expect(result.totalMin, `${time} ${transport}`).toBeLessThanOrEqual(budget);
      }
    }
  });

  it("maakt te voet geen sprongen tussen ver uiteen gelegen dorpen", () => {
    const { result } = plan({ vibes: ["bloemen", "cultuur", "eten"], time: "full", transport: "walking" });
    for (let i = 1; i < result.stops.length; i++) {
      const prev = result.stops[i - 1], cur = result.stops[i];
      expect(km(prev, cur)).toBeLessThan(5);
    }
  });

  it("geeft bij bloemen een veld in volle bloei voorrang", () => {
    const { result } = plan({ vibes: ["bloemen"], time: "2h", transport: "cycling" });
    const firstField = LOCATIONS.find((l) => l.id === result.stops.find((s) => s.category === "flower_field")?.id);
    expect(firstField?.bloom_status).toBe("peak");
  });

  it("rekent bij een korte route kortere bezoektijden", () => {
    const short = plan({ time: "2h" }).scored.find((l) => l.category === "food");
    const long  = plan({ time: "full" }).scored.find((l) => l.category === "food");
    expect(short?.avgVisitMin).toBe(30);
    expect(long?.avgVisitMin).toBe(50);
  });

  it("reistijd tussen stops volgt het snelheidsprofiel", () => {
    expect(TRAVEL_MIN_PER_KM).toEqual({ walking: 12, cycling: 4, car: 2 });
  });
});
