/**
 * Tests voor lib/bloomStatus.ts
 *
 * Kritiekheid: HOOG
 * - getBloomStatus bepaalt de badge op elke locatiekaart in Discover, Home en Map.
 * - filterByStatus stuurt de gehele swipe-kaart-volgorde en homefeed aan.
 * - locationToFieldData is de centrale mapper van Supabase-data → UI-model.
 * - Een fout hier geeft gebruikers verkeerde bloeistatus voor alle bollenvelden.
 */

import { describe, it, expect } from "vitest";
import {
  getBloomStatus,
  getBloomLabel,
  getBloomColor,
  getDaysLabel,
  filterByStatus,
  filterByDistance,
  locationToFieldData,
  type FieldData,
} from "@/lib/bloomStatus";
import type { Location } from "@/lib/types";

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeField(overrides: Partial<FieldData> = {}): FieldData {
  return {
    id:           "test-id",
    slug:         "test-slug",
    name:         "Testlocatie",
    location:     "Lisse",
    distanceKm:   5,
    flowerTypes:  ["tulp"],
    bloomStatus:  "in_bloom",
    bloomPercent: 80,
    daysRemaining: 14,
    tags:         [],
    imageUrl:     null,
    imageEmoji:   "🌷",
    imageBgColor: "#FFE4E8",
    ...overrides,
  };
}

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id:               "loc-1",
    title:            "Tulpenveld Lisse",
    slug:             "tulpenveld-lisse",
    category:         "flower_field",
    latitude:         52.2553,
    longitude:        4.5573,
    address:          "Lisse",
    short_description: null,
    full_description: null,
    flower_type:      "tulp,narcis",
    bloom_status:     "blooming",
    photo_score:      null,
    crowd_score:      null,
    access_type:      "roadside_only",
    parking_info:     null,
    best_visit_time:  null,
    image_url:        null,
    opening_hours:    null,
    website_url:      null,
    is_featured:      false,
    is_active:        true,
    created_at:       "2024-01-01",
    updated_at:       "2024-01-01",
    ...overrides,
  };
}

// ── getBloomStatus ────────────────────────────────────────────────────────────

describe("getBloomStatus", () => {
  it("geeft 'in_bloom' bij bloomPercent >= 50 (grensgeval)", () => {
    expect(getBloomStatus(makeField({ bloomPercent: 50 }))).toBe("in_bloom");
    expect(getBloomStatus(makeField({ bloomPercent: 51 }))).toBe("in_bloom");
    expect(getBloomStatus(makeField({ bloomPercent: 100 }))).toBe("in_bloom");
  });

  it("geeft 'almost' bij bloomPercent 15–49 (grensgeval)", () => {
    expect(getBloomStatus(makeField({ bloomPercent: 15 }))).toBe("almost");
    expect(getBloomStatus(makeField({ bloomPercent: 49 }))).toBe("almost");
  });

  it("geeft 'over' bij bloomPercent < 15", () => {
    expect(getBloomStatus(makeField({ bloomPercent: 14 }))).toBe("over");
    expect(getBloomStatus(makeField({ bloomPercent: 0 }))).toBe("over");
  });
});

// ── getBloomLabel ─────────────────────────────────────────────────────────────

describe("getBloomLabel", () => {
  it("geeft het juiste label voor alle drie statussen", () => {
    expect(getBloomLabel("in_bloom")).toBe("In volle bloei");
    expect(getBloomLabel("almost")).toBe("Bijna in bloei");
    expect(getBloomLabel("over")).toBe("Bloei voorbij");
  });
});

// ── getBloomColor ─────────────────────────────────────────────────────────────

describe("getBloomColor", () => {
  it("geeft een object met bg, text, dot en bar properties", () => {
    const color = getBloomColor("in_bloom");
    expect(color).toHaveProperty("bg");
    expect(color).toHaveProperty("text");
    expect(color).toHaveProperty("dot");
    expect(color).toHaveProperty("bar");
  });

  it("geeft verschillende kleuren voor verschillende statussen", () => {
    const inBloom = getBloomColor("in_bloom");
    const almost  = getBloomColor("almost");
    const over    = getBloomColor("over");
    expect(inBloom.bg).not.toBe(almost.bg);
    expect(almost.bg).not.toBe(over.bg);
  });

  it("alle kleurwaarden zijn CSS hex of rgb strings", () => {
    const color = getBloomColor("in_bloom");
    expect(color.bg).toMatch(/^#[0-9A-Fa-f]{3,8}$/);
  });
});

// ── getDaysLabel ──────────────────────────────────────────────────────────────

describe("getDaysLabel", () => {
  it("geeft 'seizoen afgelopen' bij 0 dagen", () => {
    expect(getDaysLabel(0)).toBe("seizoen afgelopen");
  });

  it("geeft '~1 dag' bij precies 1 dag", () => {
    expect(getDaysLabel(1)).toBe("nog ~1 dag");
  });

  it("geeft het aantal dagen bij meer dan 1 dag", () => {
    expect(getDaysLabel(14)).toBe("nog ~14 dagen");
    expect(getDaysLabel(7)).toBe("nog ~7 dagen");
  });
});

// ── filterByStatus ────────────────────────────────────────────────────────────

describe("filterByStatus", () => {
  const fields: FieldData[] = [
    makeField({ bloomPercent: 80, bloomStatus: "in_bloom" }),
    makeField({ id: "2", bloomPercent: 30, bloomStatus: "almost" }),
    makeField({ id: "3", bloomPercent: 5,  bloomStatus: "over" }),
    makeField({ id: "4", bloomPercent: 60, bloomStatus: "in_bloom" }),
  ];

  it("filtert op 'In bloei' → alleen in_bloom velden", () => {
    const result = filterByStatus(fields, "In bloei");
    expect(result).toHaveLength(2);
    result.forEach((f) => expect(getBloomStatus(f)).toBe("in_bloom"));
  });

  it("filtert op 'Bijna' → alleen almost velden", () => {
    const result = filterByStatus(fields, "Bijna");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("filtert op 'Voorbij' → alleen over velden", () => {
    const result = filterByStatus(fields, "Voorbij");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("3");
  });

  it("geeft alle velden terug bij onbekend filter", () => {
    expect(filterByStatus(fields, "Alles")).toHaveLength(4);
    expect(filterByStatus(fields, "")).toHaveLength(4);
    expect(filterByStatus(fields, "onbekend")).toHaveLength(4);
  });

  it("werkt op een lege array", () => {
    expect(filterByStatus([], "In bloei")).toHaveLength(0);
  });
});

// ── filterByDistance ──────────────────────────────────────────────────────────

describe("filterByDistance", () => {
  const fields: FieldData[] = [
    makeField({ id: "1", distanceKm: 2 }),
    makeField({ id: "2", distanceKm: 5 }),
    makeField({ id: "3", distanceKm: 10 }),
    makeField({ id: "4", distanceKm: 20 }),
  ];

  it("filtert op maximale afstand (inclusief grens)", () => {
    const result = filterByDistance(fields, 10);
    expect(result).toHaveLength(3);
    result.forEach((f) => expect(f.distanceKm).toBeLessThanOrEqual(10));
  });

  it("filtert op kleine afstand", () => {
    const result = filterByDistance(fields, 3);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("geeft alle velden bij maxKm = 999 (geen praktische limiet)", () => {
    expect(filterByDistance(fields, 999)).toHaveLength(4);
  });

  it("geeft lege array bij maxKm = 0", () => {
    expect(filterByDistance(fields, 0)).toHaveLength(0);
  });

  it("werkt op lege array", () => {
    expect(filterByDistance([], 10)).toHaveLength(0);
  });
});

// ── locationToFieldData ───────────────────────────────────────────────────────

describe("locationToFieldData", () => {
  it("converteert een Location naar FieldData", () => {
    const loc    = makeLocation();
    const result = locationToFieldData(loc);
    expect(result.id).toBe(loc.id);
    expect(result.slug).toBe(loc.slug);
    expect(result.name).toBe(loc.title);
  });

  it("zet 'blooming' status om naar 'in_bloom'", () => {
    const result = locationToFieldData(makeLocation({ bloom_status: "blooming" }));
    expect(result.bloomStatus).toBe("in_bloom");
    expect(result.bloomPercent).toBe(72);
  });

  it("zet 'peak' status om naar 'in_bloom' met hogere percentage", () => {
    const result = locationToFieldData(makeLocation({ bloom_status: "peak" }));
    expect(result.bloomStatus).toBe("in_bloom");
    expect(result.bloomPercent).toBe(92);
  });

  it("zet 'early' om naar 'almost'", () => {
    const result = locationToFieldData(makeLocation({ bloom_status: "early" }));
    expect(result.bloomStatus).toBe("almost");
  });

  it("zet 'ending' om naar 'over'", () => {
    const result = locationToFieldData(makeLocation({ bloom_status: "ending" }));
    expect(result.bloomStatus).toBe("over");
    expect(result.daysRemaining).toBe(0);
  });

  it("gebruikt fallback bij ontbrekende bloom_status", () => {
    const result = locationToFieldData(makeLocation({ bloom_status: null }));
    // Null valt terug op "blooming" (in_bloom)
    expect(result.bloomStatus).toBe("in_bloom");
  });

  it("berekent afstand als coördinaten beschikbaar zijn", () => {
    const result = locationToFieldData(
      makeLocation({ latitude: 52.2553, longitude: 4.5573 }),
      52.2553, 4.5573, // zelfde punt → afstand ≈ 0
    );
    expect(result.distanceKm).toBe(0);
  });

  it("geeft 999 km als coördinaten ontbreken", () => {
    const result = locationToFieldData(
      makeLocation({ latitude: null, longitude: null }),
      52.2553, 4.5573,
    );
    expect(result.distanceKm).toBe(999);
  });

  it("geeft 999 km als gebruikerslocatie ontbreekt", () => {
    const result = locationToFieldData(makeLocation());
    expect(result.distanceKm).toBe(999);
  });

  it("splitst flower_type op komma", () => {
    const result = locationToFieldData(makeLocation({ flower_type: "tulp,narcis,hyacint" }));
    expect(result.flowerTypes).toEqual(["tulp", "narcis", "hyacint"]);
  });

  it("geeft ['tulp'] als fallback bij lege flower_type", () => {
    const result = locationToFieldData(makeLocation({ flower_type: null }));
    expect(result.flowerTypes).toEqual(["tulp"]);
  });

  it("voegt parkeer-tag toe als parking_info aanwezig is", () => {
    const result = locationToFieldData(makeLocation({ parking_info: "Parkeerplaats bij ingang" }));
    expect(result.tags).toContain("Parkeren aanwezig");
  });

  it("voegt 'Vrij toegankelijk' tag toe bij public_access", () => {
    const result = locationToFieldData(makeLocation({ access_type: "public_access" }));
    expect(result.tags).toContain("Vrij toegankelijk");
  });

  it("voegt 'Langs de weg' tag toe bij roadside_only", () => {
    const result = locationToFieldData(makeLocation({ access_type: "roadside_only" }));
    expect(result.tags).toContain("Langs de weg");
  });
});
