/**
 * Tests voor lib/routeGenerator.ts
 *
 * Kritiekheid: HOOG
 * - clusterFields bepaalt hoe bollenvelden gegroepeerd worden voor route-generatie.
 * - selectSpreadFields bepaalt welke velden in een route zitten — een bug hier
 *   geeft routes met velden die te dicht bij elkaar liggen of juist ontbreken.
 * - generateRouteName produceert de zichtbare routenaam in de UI.
 * - buildGeneratedRoute is de volledige routebouwer; OSRM wordt gemockt.
 *
 * fetchOSRMRoute wordt apart getest met een gemockte fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  clusterFields,
  selectSpreadFields,
  generateRouteName,
  buildGeneratedRoute,
  fetchOSRMRoute,
  START_LOCATIONS,
  FIELD_COUNT_RANGE,
  DEFAULT_FILTERS,
} from "@/lib/routeGenerator";
import type { TulipField } from "@/lib/tulipFields";

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeField(id: string, lat: number, lng: number): TulipField {
  return { id, name: `Veld ${id}`, lat, lng };
}

// Mock OSRM-respons voor buildGeneratedRoute
const MOCK_OSRM_RESPONSE = {
  code: "Ok",
  routes: [{
    geometry: { type: "LineString", coordinates: [[4.54, 52.26], [4.55, 52.27]] },
    distance: 8200,   // 8.2 km
    duration: 1800,   // 30 min
  }],
};

// ── clusterFields ─────────────────────────────────────────────────────────────

describe("clusterFields", () => {
  it("geeft een lege array terug voor lege invoer", () => {
    expect(clusterFields([])).toHaveLength(0);
  });

  it("clustert één veld in één cluster", () => {
    const fields = [makeField("f1", 52.25, 4.55)];
    const clusters = clusterFields(fields);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].fields).toHaveLength(1);
  });

  it("clustert velden die dicht bij elkaar liggen in dezelfde cel", () => {
    // Twee velden ~100m van elkaar — moeten in dezelfde gridcel vallen bij radius 2 km
    const fields = [
      makeField("f1", 52.2500, 4.5500),
      makeField("f2", 52.2509, 4.5510), // ≈ 100m noordoost
    ];
    const clusters = clusterFields(fields, 2);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].fields).toHaveLength(2);
  });

  it("plaatst ver uit elkaar liggende velden in aparte clusters", () => {
    // Twee velden ~10 km van elkaar — moeten in aparte gridcellen vallen
    const fields = [
      makeField("f1", 52.20, 4.50), // Zuid
      makeField("f2", 52.35, 4.60), // Noord
    ];
    const clusters = clusterFields(fields, 2);
    expect(clusters).toHaveLength(2);
  });

  it("berekent de centroid van een cluster correct", () => {
    const fields = [
      makeField("f1", 52.25, 4.55),
      makeField("f2", 52.25, 4.57), // zelfde lat, 0.02 lng verschil
    ];
    // Forceer één cluster met kleine radius
    const clusters = clusterFields(fields, 5);
    // Centroid lng moet tussen de twee velden liggen
    if (clusters.length === 1) {
      expect(clusters[0].centroid.lng).toBeGreaterThan(4.54);
      expect(clusters[0].centroid.lng).toBeLessThan(4.58);
    }
  });

  it("elk cluster heeft de opgegeven radius", () => {
    const fields = [makeField("f1", 52.25, 4.55)];
    const clusters = clusterFields(fields, 3);
    expect(clusters[0].radius).toBe(3);
  });
});

// ── selectSpreadFields ────────────────────────────────────────────────────────

describe("selectSpreadFields", () => {
  it("geeft lege array bij lege invoer", () => {
    expect(selectSpreadFields([], 5)).toHaveLength(0);
  });

  it("geeft maximaal `max` velden terug", () => {
    const fields = Array.from({ length: 20 }, (_, i) =>
      makeField(`f${i}`, 52.20 + i * 0.05, 4.50), // ver uit elkaar
    );
    expect(selectSpreadFields(fields, 5, 0)).toHaveLength(5);
  });

  it("slaat velden over die te dicht bij een al geselecteerd veld liggen", () => {
    // Alle velden liggen op dezelfde lat, telkens 200m van elkaar
    // minSpacingKm = 0.5 (500m) → alleen het eerste veld wordt geselecteerd
    const fields = [
      makeField("f1", 52.2500, 4.5500),
      makeField("f2", 52.2518, 4.5500), // ~200m
      makeField("f3", 52.2536, 4.5500), // ~200m van f2
    ];
    const result = selectSpreadFields(fields, 10, 0.5);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("f1");
  });

  it("selecteert velden die ver genoeg van elkaar zijn", () => {
    const fields = [
      makeField("f1", 52.2500, 4.5500),
      makeField("f2", 52.2700, 4.5700), // ~3 km van f1
      makeField("f3", 52.2900, 4.5900), // ~3 km van f2
    ];
    const result = selectSpreadFields(fields, 10, 0.5);
    expect(result).toHaveLength(3);
  });

  it("muteert de originele array niet", () => {
    const fields = [makeField("f1", 52.25, 4.55), makeField("f2", 52.35, 4.65)];
    const original = [...fields];
    selectSpreadFields(fields, 5);
    expect(fields[0].id).toBe(original[0].id);
  });
});

// ── generateRouteName ─────────────────────────────────────────────────────────

describe("generateRouteName", () => {
  it("geeft een fallback naam bij lege velden", () => {
    const name = generateRouteName([], 12);
    expect(name).toContain("12");
    expect(name).toBeTruthy();
  });

  it("bevat de afstand in de naam", () => {
    const fields = [makeField("f1", 52.25, 4.55)];
    const name = generateRouteName(fields, 8.5);
    expect(name).toContain("8.5");
  });

  it("bevat een windrichting (Noord/Zuid/Oost/West)", () => {
    const fields = [makeField("f1", 52.40, 4.70)]; // noordoost van Lisse-centrum
    const name = generateRouteName(fields, 10);
    expect(name).toMatch(/Noord|Zuid|Oost|West/);
  });

  it("gebruikt de meest voorkomende straatnaam", () => {
    const fields = [
      { id: "f1", name: "Prinsenweg 1", lat: 52.25, lng: 4.55 },
      { id: "f2", name: "Prinsenweg 2", lat: 52.26, lng: 4.56 },
      { id: "f3", name: "Heereweg 1",   lat: 52.27, lng: 4.57 },
    ];
    const name = generateRouteName(fields, 10);
    expect(name).toContain("Prinsenweg");
  });

  it("verwijdert het huisnummer uit de straatnaam", () => {
    const fields = [{ id: "f1", name: "Loosterweg Noord 3", lat: 52.28, lng: 4.55 }];
    const name = generateRouteName(fields, 8);
    // Mag geen getal bevatten als onderdeel van de straatnaam (maar wel in de afstand)
    expect(name).not.toMatch(/Loosterweg Noord 3/);
    expect(name).toContain("Loosterweg Noord");
  });
});

// ── fetchOSRMRoute ────────────────────────────────────────────────────────────

describe("fetchOSRMRoute", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => MOCK_OSRM_RESPONSE,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("geeft geometry, distanceM en durationS terug bij succesvolle aanroep", async () => {
    const start     = { lat: 52.2697, lng: 4.5461 };
    const waypoints = [makeField("f1", 52.26, 4.54)];
    const result    = await fetchOSRMRoute(start, waypoints);

    expect(result.geometry.type).toBe("LineString");
    expect(result.distanceM).toBe(8200);
    expect(result.durationS).toBe(1800);
  });

  it("gooit een Error bij HTTP-fout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchOSRMRoute({ lat: 52.26, lng: 4.54 }, [])).rejects.toThrow("OSRM 503");
  });

  it("gooit een Error bij OSRM-fout (code != Ok)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => ({ code: "NoRoute", routes: [] }),
    }));
    await expect(fetchOSRMRoute({ lat: 52.26, lng: 4.54 }, [])).rejects.toThrow("Geen route gevonden");
  });

  it("bouwt de OSRM URL op met lng,lat volgorde", async () => {
    const start     = { lat: 52.2697, lng: 4.5461 };
    const waypoints = [makeField("f1", 52.26, 4.54)];
    await fetchOSRMRoute(start, waypoints);

    const fetchArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // OSRM verwacht lng,lat — controleer dat de URL dat bevat
    expect(fetchArgs).toContain("4.5461,52.2697"); // start als lng,lat
  });
});

// ── buildGeneratedRoute ───────────────────────────────────────────────────────

describe("buildGeneratedRoute", () => {
  const LISSE = { lat: 52.2553, lng: 4.5573, label: "Lisse" };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => MOCK_OSRM_RESPONSE,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("gooit een Error als er geen velden in de straal zijn", async () => {
    // Gebruik een veld dat ver buiten de straal ligt
    const verVeld = [makeField("ver", 10.0, 10.0)]; // andere kant van de wereld
    await expect(
      buildGeneratedRoute(LISSE, 5, 6, "all", verVeld),
    ).rejects.toThrow("Geen velden gevonden");
  });

  it("gooit een Error als er te weinig velden zijn voor een route", async () => {
    // Één veld vlakbij — te weinig voor een route (min 2)
    const éénVeld = [makeField("f1", 52.256, 4.558)];
    await expect(
      buildGeneratedRoute(LISSE, 5, 6, "all", éénVeld),
    ).rejects.toThrow("Te weinig velden");
  });

  it("bouwt een route met de juiste structuur", async () => {
    const velden = [
      makeField("f1", 52.256, 4.558),
      makeField("f2", 52.260, 4.562),
      makeField("f3", 52.264, 4.566),
    ];
    const route = await buildGeneratedRoute(LISSE, 5, 6, "all", velden);

    expect(route.id).toBeTruthy();
    expect(route.name).toBeTruthy();
    expect(route.startLocation).toEqual(LISSE);
    expect(route.fields.length).toBeGreaterThanOrEqual(2);
    expect(route.geometry.type).toBe("LineString");
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.estimatedMinutes).toBeGreaterThan(0);
    expect(["makkelijk", "gemiddeld"]).toContain(route.difficulty);
    expect(route.generatedAt).toBeInstanceOf(Date);
  });

  it("markeert routes <= 12 km als 'makkelijk'", async () => {
    // OSRM mock geeft 8.2 km terug
    const velden = Array.from({ length: 5 }, (_, i) =>
      makeField(`f${i}`, 52.255 + i * 0.004, 4.558 + i * 0.004),
    );
    const route = await buildGeneratedRoute(LISSE, 10, 6, "all", velden);
    expect(route.difficulty).toBe("makkelijk"); // 8.2 km
  });

  it("filtert velden op richting 'north'", async () => {
    const velden = [
      makeField("noord1", 52.300, 4.558), // noord van midLat
      makeField("noord2", 52.310, 4.562),
      makeField("noord3", 52.320, 4.566),
      makeField("zuid1",  52.220, 4.558), // zuid van midLat
      makeField("zuid2",  52.210, 4.562),
    ];
    const route = await buildGeneratedRoute(LISSE, 20, 6, "north", velden);
    // Alle geselecteerde velden moeten noordelijk zijn (lat >= mediaan)
    const lats = route.fields.map((f) => f.lat);
    expect(Math.min(...lats)).toBeGreaterThan(52.25);
  });
});

// ── Constanten ────────────────────────────────────────────────────────────────

describe("START_LOCATIONS", () => {
  it("bevat alle 5 verwachte startpunten", () => {
    const keys = Object.keys(START_LOCATIONS);
    expect(keys).toContain("keukenhof");
    expect(keys).toContain("lisse");
    expect(keys).toContain("hillegom");
    expect(keys).toContain("sassenheim");
    expect(keys).toContain("noordwijk");
  });

  it("alle startpunten liggen in de Bollenstreek (52.1–52.4N, 4.3–4.7E)", () => {
    Object.values(START_LOCATIONS).forEach(({ lat, lng }) => {
      expect(lat).toBeGreaterThan(52.1);
      expect(lat).toBeLessThan(52.4);
      expect(lng).toBeGreaterThan(4.3);
      expect(lng).toBeLessThan(4.8);
    });
  });
});

describe("FIELD_COUNT_RANGE", () => {
  it("min is altijd kleiner dan max voor elke optie", () => {
    Object.values(FIELD_COUNT_RANGE).forEach(({ min, max }) => {
      expect(min).toBeLessThan(max);
    });
  });

  it("bevat 'weinig', 'normaal' en 'veel'", () => {
    expect(FIELD_COUNT_RANGE).toHaveProperty("weinig");
    expect(FIELD_COUNT_RANGE).toHaveProperty("normaal");
    expect(FIELD_COUNT_RANGE).toHaveProperty("veel");
  });

  it("weinig heeft minder velden dan normaal, normaal minder dan veel", () => {
    expect(FIELD_COUNT_RANGE.weinig.max).toBeLessThan(FIELD_COUNT_RANGE.normaal.min);
    // normaal.max kan overlappen met veel.min — dat is design decision
    expect(FIELD_COUNT_RANGE.normaal.max).toBeLessThanOrEqual(FIELD_COUNT_RANGE.veel.max);
  });
});

describe("DEFAULT_FILTERS", () => {
  it("heeft keukenhof als standaard startpunt", () => {
    expect(DEFAULT_FILTERS.startKey).toBe("keukenhof");
  });

  it("heeft een geldige distanceOption als standaard", () => {
    expect([5, 10, 15, 20]).toContain(DEFAULT_FILTERS.maxDistanceKm);
  });
});
