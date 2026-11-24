/**
 * Tests voor lib/tulipFields.ts
 *
 * Kritiekheid: HOOG
 * - haversineDistance wordt gebruikt voor alle afstandsberekeningen in de app
 *   (dichtstbijzijnde velden, route-filtering, discover-volgorde).
 * - Een fout in haversineDistance geeft verkeerde volgorde in Discover en Map.
 */

import { describe, it, expect } from "vitest";
import { haversineDistance } from "@/lib/tulipFields";

describe("haversineDistance", () => {
  it("geeft 0 meter terug voor hetzelfde punt", () => {
    expect(haversineDistance(52.2553, 4.5573, 52.2553, 4.5573)).toBe(0);
  });

  it("berekent de afstand Lisse → Keukenhof correct (~1.7 km)", () => {
    // Lisse: 52.2553, 4.5573 / Keukenhof: 52.2697, 4.5461
    const dist = haversineDistance(52.2553, 4.5573, 52.2697, 4.5461);
    // Tolerantie: ±200 meter (GPS-nauwkeurigheid)
    expect(dist).toBeGreaterThan(1_400);
    expect(dist).toBeLessThan(2_000);
  });

  it("berekent de afstand Amsterdam → Rotterdam correct (~57 km)", () => {
    const dist = haversineDistance(52.3676, 4.9041, 51.9244, 4.4777);
    expect(dist).toBeGreaterThan(55_000);
    expect(dist).toBeLessThan(60_000);
  });

  it("geeft meters terug (niet kilometers)", () => {
    // Amsterdam → Rotterdam ≈ 57.000 meter, niet 57
    const dist = haversineDistance(52.3676, 4.9041, 51.9244, 4.4777);
    expect(dist).toBeGreaterThan(1_000);
  });

  it("is symmetrisch: A→B = B→A", () => {
    const ab = haversineDistance(52.2553, 4.5573, 52.2697, 4.5461);
    const ba = haversineDistance(52.2697, 4.5461, 52.2553, 4.5573);
    expect(ab).toBeCloseTo(ba, 0); // binnen 1 meter
  });

  it("werkt correct bij grote afstanden (NL → Australië)", () => {
    // Amsterdam → Sydney ≈ 16.800 km
    const dist = haversineDistance(52.37, 4.90, -33.87, 151.21);
    expect(dist).toBeGreaterThan(16_000_000);
    expect(dist).toBeLessThan(17_500_000);
  });
});

// ── calculateReliabilityScore ─────────────────────────────────────────────────
