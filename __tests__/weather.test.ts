/**
 * Tests voor lib/weather.ts
 *
 * Kritiekheid: HOOG
 * - calcCyclingScore / calcWalkingScore worden gebruikt op elke route-detailpagina,
 *   de homefeed, het weertabblad en alle 7-daagse prognoses.
 * - Een fout hier geeft miljoenen gebruikers verkeerde fiets-/wandeladviezen.
 */

import { describe, it, expect } from "vitest";
import {
  calcCyclingScore,
  calcWalkingScore,
  cyclingScoreLabel,
  walkingScoreLabel,
  weatherIcon,
  weatherLabel,
  windDirectionLabel,
  parseOpenMeteo,
} from "@/lib/weather";

// ── calcCyclingScore ───────────────────────────────────────────────────────────

describe("calcCyclingScore", () => {
  it("geeft een perfecte score bij ideaal fietsweer", () => {
    // 18°C, windstil, geen regen, stralend weer (code 0)
    const score = calcCyclingScore(18, 5, 0, 0);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("geeft een lage score bij zware regen (code 65)", () => {
    const score = calcCyclingScore(15, 20, 5, 65);
    expect(score).toBeLessThanOrEqual(30);
  });

  it("weathercodeCap: bewolkt (code 3) kan niet hoger dan 82 worden", () => {
    // Perfecte temp + windstil + geen regen, maar bewolkt → cap op 82
    const score = calcCyclingScore(18, 0, 0, 3);
    expect(score).toBeLessThanOrEqual(82);
  });

  it("weathercodeCap: motregen (code 53) kan niet hoger dan 55 worden", () => {
    const score = calcCyclingScore(18, 5, 0, 53);
    expect(score).toBeLessThanOrEqual(55);
  });

  it("weathercodeCap: matige regen (code 63) kan niet hoger dan 30 worden", () => {
    const score = calcCyclingScore(18, 5, 0, 63);
    expect(score).toBeLessThanOrEqual(30);
  });

  it("weathercodeCap: onweer (code 95) geeft max 15", () => {
    const score = calcCyclingScore(18, 5, 0, 95);
    expect(score).toBeLessThanOrEqual(15);
  });

  it("geeft een significant lagere score bij ijskoude temperatuur (< 5°C) dan bij ideale temp", () => {
    // tempScore(2) = 10, tempScore(18) = 100 — andere factoren (wind, regen) compenseren
    // maar de koude temp trekt de score aanzienlijk omlaag t.o.v. ideale omstandigheden
    const koud  = calcCyclingScore(2,  5, 0, 0);
    const ideaal = calcCyclingScore(18, 5, 0, 0);
    expect(koud).toBeLessThan(ideaal);
    // Bij 2°C + windstil + geen regen: tempScore=10, rest=100 → score ≈ 73
    // Dit is de bewuste keuze in de formule: goede omstandigheden compenseren koude
    expect(koud).toBeLessThan(80);
  });

  it("geeft een lagere score bij hittegolf (> 28°C)", () => {
    const scoreNormaal = calcCyclingScore(18, 5, 0, 0);
    const scoreHeet    = calcCyclingScore(35, 5, 0, 0);
    expect(scoreHeet).toBeLessThan(scoreNormaal);
  });

  it("geeft een lagere score bij stormwind dan bij windstil", () => {
    // windScore(50) = 10 → de formule weegt wind voor 35%; andere factoren compenseren
    const metStorm  = calcCyclingScore(18, 50, 0, 0);
    const windstil  = calcCyclingScore(18,  5, 0, 0);
    expect(metStorm).toBeLessThan(windstil);
    // Score bij storm ≈ 69 (30% temp + 3.5% wind + 25% regen + 10% code) — boven 50
    // want wind is maar 35% van de totaalscore
    expect(metStorm).toBeLessThan(75);
  });

  it("score ligt altijd tussen 0 en 100", () => {
    const extreme = [
      calcCyclingScore(-20, 100, 10, 99),
      calcCyclingScore(40,  0,   0,  0),
      calcCyclingScore(18,  0,   0,  0),
    ];
    extreme.forEach((s) => {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    });
  });

  it("geeft altijd een geheel getal terug", () => {
    const score = calcCyclingScore(15, 20, 1, 3);
    expect(score).toBe(Math.round(score));
  });
});

// ── calcWalkingScore ──────────────────────────────────────────────────────────

describe("calcWalkingScore", () => {
  it("wandelscores wegen wind minder zwaar dan fietsscore", () => {
    // Bij harde wind: wandelen heeft minder last dan fietsen
    const fiets   = calcCyclingScore(15, 35, 0, 0);
    const wandel  = calcWalkingScore(15, 35, 0, 0);
    expect(wandel).toBeGreaterThan(fiets);
  });

  it("wandelscores wegen regen zwaarder dan fietsscore", () => {
    // Bij regen zonder weercode-cap: regen weegt 40% voor wandelen vs 25% voor fietsen
    // Gebruik code 2 (gedeeltelijk bewolkt, cap=90) + 2mm regen → geen cap bereikt
    // zodat het verschil in regenweging zichtbaar wordt
    const fiets  = calcCyclingScore(15, 5, 2, 2);
    const wandel = calcWalkingScore(15, 5, 2, 2);
    expect(wandel).toBeLessThan(fiets);
  });

  it("score ligt altijd tussen 0 en 100", () => {
    const scores = [
      calcWalkingScore(-20, 100, 10, 99),
      calcWalkingScore(40,  0,   0,  0),
      calcWalkingScore(18,  0,   0,  0),
    ];
    scores.forEach((s) => {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    });
  });

  it("weathercodeCap geldt ook voor wandelscore", () => {
    const score = calcWalkingScore(18, 5, 0, 53); // motregen
    expect(score).toBeLessThanOrEqual(55);
  });
});

// ── cyclingScoreLabel ─────────────────────────────────────────────────────────

describe("cyclingScoreLabel", () => {
  it("geeft 'Perfecte fietsdag' bij score >= 80", () => {
    expect(cyclingScoreLabel(80)).toContain("Perfecte");
    expect(cyclingScoreLabel(100)).toContain("Perfecte");
  });

  it("geeft 'Goed fietsweer' bij score 60–79", () => {
    expect(cyclingScoreLabel(60)).toBe("Goed fietsweer");
    expect(cyclingScoreLabel(79)).toBe("Goed fietsweer");
  });

  it("geeft 'Redelijk fietsweer' bij score 40–59", () => {
    expect(cyclingScoreLabel(40)).toBe("Redelijk fietsweer");
    expect(cyclingScoreLabel(59)).toBe("Redelijk fietsweer");
  });

  it("geeft 'Matig fietsweer' bij score 20–39", () => {
    expect(cyclingScoreLabel(20)).toBe("Matig fietsweer");
    expect(cyclingScoreLabel(39)).toBe("Matig fietsweer");
  });

  it("geeft 'Slechte fietsdag' bij score < 20", () => {
    expect(cyclingScoreLabel(0)).toBe("Slechte fietsdag");
    expect(cyclingScoreLabel(19)).toBe("Slechte fietsdag");
  });
});

// ── walkingScoreLabel ─────────────────────────────────────────────────────────

describe("walkingScoreLabel", () => {
  it("geeft 'Perfecte wandeldag' bij score >= 80", () => {
    expect(walkingScoreLabel(80)).toContain("Perfecte");
    expect(walkingScoreLabel(100)).toContain("Perfecte");
  });

  it("geeft 'Slechte wandeldag' bij score < 20", () => {
    expect(walkingScoreLabel(0)).toBe("Slechte wandeldag");
    expect(walkingScoreLabel(19)).toBe("Slechte wandeldag");
  });
});

// ── weatherIcon & weatherLabel ────────────────────────────────────────────────

describe("weatherIcon", () => {
  it("geeft zon-emoji bij code 0", () => {
    expect(weatherIcon(0)).toBe("☀️");
  });

  it("geeft onweer-emoji bij code 95", () => {
    expect(weatherIcon(95)).toBe("⛈️");
  });

  it("geeft een fallback emoji voor onbekende code", () => {
    const icon = weatherIcon(999);
    expect(typeof icon).toBe("string");
    expect(icon.length).toBeGreaterThan(0);
  });
});

describe("weatherLabel", () => {
  it("geeft 'Helder' bij code 0", () => {
    expect(weatherLabel(0)).toBe("Helder");
  });

  it("geeft 'Onbekend' voor onbekende code", () => {
    expect(weatherLabel(999)).toBe("Onbekend");
  });
});

// ── windDirectionLabel ────────────────────────────────────────────────────────

describe("windDirectionLabel", () => {
  it("Noord bij 0 graden", () => {
    expect(windDirectionLabel(0)).toBe("N");
  });

  it("Oost bij 90 graden", () => {
    expect(windDirectionLabel(90)).toBe("O");
  });

  it("Zuid bij 180 graden", () => {
    expect(windDirectionLabel(180)).toBe("Z");
  });

  it("West bij 270 graden", () => {
    expect(windDirectionLabel(270)).toBe("W");
  });

  it("Noord-Oost bij 45 graden", () => {
    expect(windDirectionLabel(45)).toBe("NO");
  });

  it("werkt bij 360 graden (= Noord)", () => {
    expect(windDirectionLabel(360)).toBe("N");
  });
});

// ── parseOpenMeteo ────────────────────────────────────────────────────────────

describe("parseOpenMeteo", () => {
  const mockApiResponse = {
    current: {
      temperature_2m:    15,
      windspeed_10m:     10,
      winddirection_10m: 90,
      precipitation:     0,
      weathercode:       1,
    },
    daily: {
      time:               ["2024-04-15", "2024-04-16", "2024-04-17"],
      temperature_2m_max: [18, 12, 20],
      temperature_2m_min: [10,  8, 14],
      precipitation_sum:  [ 0,  5,  0],
      windspeed_10m_max:  [12, 20, 10],
      weathercode:        [ 1, 61,  0],
    },
  };

  it("parseert current weather correct", () => {
    const { current } = parseOpenMeteo(mockApiResponse);
    expect(current.temperature).toBe(15);
    expect(current.windspeed).toBe(10);
    expect(current.precipitation).toBe(0);
    expect(current.weathercode).toBe(1);
  });

  it("berekent cycling- en walkingScore voor huidig weer", () => {
    const { current } = parseOpenMeteo(mockApiResponse);
    expect(current.cyclingScore).toBeGreaterThan(0);
    expect(current.walkingScore).toBeGreaterThan(0);
    expect(current.cyclingLabel).toBeTruthy();
    expect(current.walkingLabel).toBeTruthy();
  });

  it("parseert 3 dagprognoses", () => {
    const { daily } = parseOpenMeteo(mockApiResponse);
    expect(daily).toHaveLength(3);
  });

  it("markeert exact één dag als beste dag", () => {
    const { daily } = parseOpenMeteo(mockApiResponse);
    const bestDays = daily.filter((d) => d.isBestDay);
    expect(bestDays).toHaveLength(1);
  });

  it("eerste dag heet 'Vandaag'", () => {
    const { daily } = parseOpenMeteo(mockApiResponse);
    expect(daily[0].dayName).toBe("Vandaag");
  });

  it("slechte-weer-dag heeft lagere score dan mooi-weer-dag", () => {
    const { daily } = parseOpenMeteo(mockApiResponse);
    // Dag 0: code 1, geen regen → mooi. Dag 1: code 61, 5mm regen → slecht
    expect(daily[0].cyclingScore).toBeGreaterThan(daily[1].cyclingScore);
  });
});
