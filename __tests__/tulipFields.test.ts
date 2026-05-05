/**
 * Tests voor lib/tulipFields.ts
 *
 * Kritiekheid: HOOG
 * - haversineDistance wordt gebruikt voor alle afstandsberekeningen in de app
 *   (dichtstbijzijnde velden, route-filtering, discover-volgorde).
 * - calculateReliabilityScore bepaalt hoe zwaar een community-bijdrage meetelt
 *   in de bloom-score — een bug hier corrumpeert alle crowd-sourced data.
 * - Een fout in haversineDistance geeft verkeerde volgorde in Discover en Map.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  haversineDistance,
  calculateReliabilityScore,
  getReliabilityLabel,
  timeAgo,
  TULIP_FIELDS,
} from "@/lib/tulipFields";

// ── haversineDistance ─────────────────────────────────────────────────────────

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

describe("calculateReliabilityScore", () => {
  const now = new Date();

  it("geeft hoge score (bijna 1.0) voor een verse status", () => {
    const score = calculateReliabilityScore({
      timestamp:   now,
      photoUrl:    undefined,
      confirmedBy: 0,
    });
    // Net ingediend: ageMs ≈ 0 → score ≈ 1.0
    expect(score).toBeGreaterThan(0.9);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it("geeft 0 terug voor een status ouder dan 24 uur", () => {
    const ouder = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const score = calculateReliabilityScore({
      timestamp:   ouder,
      photoUrl:    undefined,
      confirmedBy: 0,
    });
    expect(score).toBe(0);
  });

  it("bonus van +0.15 als er een foto aanwezig is", () => {
    const halfwayAge = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const metFoto    = calculateReliabilityScore({ timestamp: halfwayAge, photoUrl: "https://example.com/foto.jpg", confirmedBy: 0 });
    const zonderFoto = calculateReliabilityScore({ timestamp: halfwayAge, photoUrl: undefined, confirmedBy: 0 });
    expect(metFoto - zonderFoto).toBeCloseTo(0.15, 1);
  });

  it("confirmedBy verhoogt score met 0.05 per bevestiging, max +0.30", () => {
    // Gebruik een 18 uur oude status zodat de basiscore laag genoeg is
    // dat de bonus niet gecapt wordt: base ≈ 0.25, met6 = 0.55, diff = 0.30
    const oud18u = new Date(now.getTime() - 18 * 60 * 60 * 1000);
    const met6   = calculateReliabilityScore({ timestamp: oud18u, photoUrl: undefined, confirmedBy: 6 });
    const met0   = calculateReliabilityScore({ timestamp: oud18u, photoUrl: undefined, confirmedBy: 0 });
    const bonus  = met6 - met0;
    // 6 * 0.05 = 0.30 (maximale bonus)
    expect(bonus).toBeCloseTo(0.30, 1);
  });

  it("confirmedBy > 6 geeft dezelfde bonus als 6 (cap op +0.30)", () => {
    const vers  = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const met6  = calculateReliabilityScore({ timestamp: vers, photoUrl: undefined, confirmedBy: 6 });
    const met20 = calculateReliabilityScore({ timestamp: vers, photoUrl: undefined, confirmedBy: 20 });
    expect(met6).toBeCloseTo(met20, 5);
  });

  it("score wordt nooit hoger dan 1.0", () => {
    // Combinatie van vers + foto + veel bevestigingen
    const score = calculateReliabilityScore({
      timestamp:   now,
      photoUrl:    "https://example.com/foto.jpg",
      confirmedBy: 100,
    });
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it("score is altijd >= 0", () => {
    const oud = new Date(now.getTime() - 30 * 60 * 60 * 1000);
    const score = calculateReliabilityScore({ timestamp: oud, photoUrl: undefined, confirmedBy: 0 });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ── getReliabilityLabel ───────────────────────────────────────────────────────

describe("getReliabilityLabel", () => {
  it("geeft 'Onbevestigd' bij score < 0.3", () => {
    expect(getReliabilityLabel(0)).toBe("Onbevestigd");
    expect(getReliabilityLabel(0.29)).toBe("Onbevestigd");
  });

  it("geeft 'Redelijk betrouwbaar' bij score 0.3–0.7 (grensgeval)", () => {
    expect(getReliabilityLabel(0.3)).toBe("Redelijk betrouwbaar");
    expect(getReliabilityLabel(0.7)).toBe("Redelijk betrouwbaar");
  });

  it("geeft 'Betrouwbaar' bij score > 0.7", () => {
    expect(getReliabilityLabel(0.71)).toBe("Betrouwbaar");
    expect(getReliabilityLabel(1.0)).toBe("Betrouwbaar");
  });
});

// ── timeAgo ───────────────────────────────────────────────────────────────────

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-04-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("geeft 'zojuist' voor minder dan 1 minuut geleden", () => {
    const date = new Date("2024-04-15T11:59:30Z");
    expect(timeAgo(date)).toBe("zojuist");
  });

  it("geeft '30 min geleden' voor 30 minuten geleden", () => {
    const date = new Date("2024-04-15T11:30:00Z");
    expect(timeAgo(date)).toBe("30 min geleden");
  });

  it("geeft '2 uur geleden' voor 2 uur geleden", () => {
    const date = new Date("2024-04-15T10:00:00Z");
    expect(timeAgo(date)).toBe("2 uur geleden");
  });

  it("geeft '1 dag geleden' voor meer dan 24 uur geleden", () => {
    const date = new Date("2024-04-14T10:00:00Z");
    expect(timeAgo(date)).toBe("1 dag geleden");
  });

  it("geeft '3 dag geleden' voor 3 dagen geleden", () => {
    const date = new Date("2024-04-12T12:00:00Z");
    expect(timeAgo(date)).toBe("3 dag geleden");
  });
});

// ── TULIP_FIELDS dataset ──────────────────────────────────────────────────────

describe("TULIP_FIELDS dataset", () => {
  it("bevat exact 174 velden", () => {
    expect(TULIP_FIELDS).toHaveLength(174);
  });

  it("alle velden hebben unieke IDs", () => {
    const ids = TULIP_FIELDS.map((f) => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(174);
  });

  it("alle velden hebben geldige Bollenstreek-coördinaten", () => {
    TULIP_FIELDS.forEach((f) => {
      // Bollenstreek: lat 52.1–52.4, lng 4.3–4.7
      expect(f.lat).toBeGreaterThan(52.0);
      expect(f.lat).toBeLessThan(52.5);
      expect(f.lng).toBeGreaterThan(4.2);
      expect(f.lng).toBeLessThan(4.8);
    });
  });

  it("alle velden hebben een niet-lege naam", () => {
    TULIP_FIELDS.forEach((f) => {
      expect(f.name.trim().length).toBeGreaterThan(0);
    });
  });
});
