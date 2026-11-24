/**
 * Tests voor lib/navigation (geometrie, afslagen, voortgang langs de route).
 *
 * Kritiekheid: HOOG
 * - Afslagen uit de eigen routelijn bepalen wat de gebruiker hoort en ziet.
 * - trackFix bepaalt resterende afstand en wanneer er wordt herberekend;
 *   één GPS-uitschieter mag geen herberekening starten.
 */

import { describe, it, expect } from "vitest";
import { buildLine, pointAt, project, distanceM, type LngLat } from "@/lib/navigation/geometry";
import { deriveManeuvers, fromOsrmSteps, nextManeuverIndex, roundDistance } from "@/lib/navigation/maneuvers";
import { trackFix, initialTrackState } from "@/lib/navigation/tracker";

// ~1 m in graden rond Lisse
const LAT = 52.26, LNG = 4.55;
const DLAT = 1 / 111_320;
const DLNG = 1 / (111_320 * Math.cos((LAT * Math.PI) / 180));
const at = (eastM: number, northM: number): LngLat => [LNG + eastM * DLNG, LAT + northM * DLAT];

// 200 m noord, dan 200 m oost (rechtsaf), dan 200 m noord (linksaf)
const zigzag = buildLine([at(0, 0), at(0, 200), at(200, 200), at(200, 400)]);

describe("geometry", () => {
  it("meet de lengte langs de lijn", () => {
    expect(zigzag.length).toBeGreaterThan(599);
    expect(zigzag.length).toBeLessThan(601);
  });

  it("pointAt en project zijn elkaars omgekeerde", () => {
    const p = pointAt(zigzag, 300);
    const proj = project(zigzag, p)!;
    expect(proj.along).toBeCloseTo(300, 0);
    expect(proj.offset).toBeLessThan(0.5);
  });

  it("project meet de afstand tot de lijn", () => {
    const proj = project(zigzag, at(10, 100))!;
    expect(proj.offset).toBeCloseTo(10, 0);
    expect(proj.along).toBeCloseTo(100, 0);
  });
});

describe("deriveManeuvers", () => {
  it("vindt rechtsaf en linksaf op de juiste plek", () => {
    const m = deriveManeuvers(zigzag);
    expect(m.map((x) => x.kind)).toEqual(["depart", "right", "left", "arrive"]);
    expect(m[1].along).toBeCloseTo(200, 0);
    expect(m[2].along).toBeCloseTo(400, 0);
  });

  it("ziet een flauwe bocht niet als afslag", () => {
    const curve: LngLat[] = [];
    for (let i = 0; i <= 20; i++) curve.push(at(i * i * 0.2, i * 20)); // buigt langzaam naar rechts
    const m = deriveManeuvers(buildLine(curve));
    expect(m.map((x) => x.kind)).toEqual(["depart", "arrive"]);
  });

  it("voegt een afslag die over een paar punten is getekend samen", () => {
    const line = buildLine([at(0, 0), at(0, 100), at(3, 106), at(8, 108), at(100, 108)]);
    const m = deriveManeuvers(line);
    expect(m.map((x) => x.kind)).toEqual(["depart", "right", "arrive"]);
  });

  it("laat een kort S-bochtje weg", () => {
    const line = buildLine([at(0, 0), at(0, 100), at(8, 104), at(8, 200)]);
    expect(deriveManeuvers(line).map((x) => x.kind)).toEqual(["depart", "arrive"]);
  });
});

describe("fromOsrmSteps", () => {
  it("neemt straatnamen over en laat tussentijdse aankomsten weg", () => {
    const steps = [
      { name: "Heereweg", distance: 200, maneuver: { type: "depart", location: at(0, 0) } },
      { name: "Stationsweg", distance: 100, maneuver: { type: "turn", modifier: "right", location: at(0, 200) } },
      { name: "", distance: 0, maneuver: { type: "arrive", location: at(100, 200) } },
      { name: "Stationsweg", distance: 100, maneuver: { type: "depart", location: at(100, 200) } },
      { name: "Kanaalstraat", distance: 200, maneuver: { type: "turn", modifier: "left", location: at(200, 200) } },
      { name: "", distance: 0, maneuver: { type: "arrive", location: at(200, 400) } },
    ];
    const m = fromOsrmSteps(zigzag, steps);
    expect(m.map((x) => x.kind)).toEqual(["depart", "right", "left", "arrive"]);
    expect(m[1].street).toBe("Stationsweg");
    expect(m[2].along).toBeCloseTo(400, 0);
  });
});

describe("nextManeuverIndex", () => {
  it("geeft de eerstvolgende afslag na de huidige plek", () => {
    const m = deriveManeuvers(zigzag);
    expect(nextManeuverIndex(m, 0)).toBe(1);
    expect(nextManeuverIndex(m, 250)).toBe(2);
    expect(nextManeuverIndex(m, 590)).toBe(3);
  });
});

describe("roundDistance", () => {
  it("rondt af zoals een navigatie-app", () => {
    expect(roundDistance(43)).toEqual({ value: 40, unit: "m" });
    expect(roundDistance(230)).toEqual({ value: 250, unit: "m" });
    expect(roundDistance(1260)).toEqual({ value: 1.3, unit: "km" });
  });
});

describe("trackFix", () => {
  it("volgt de voortgang langs de route", () => {
    const r = trackFix(zigzag, at(4, 150), 10, initialTrackState)!;
    expect(r.onRoute).toBe(true);
    expect(r.along).toBeCloseTo(150, 0);
  });

  it("herberekent pas na meerdere fixes ver van de route", () => {
    let state = trackFix(zigzag, at(0, 150), 10, initialTrackState)!.state;
    const results = [1, 2, 3].map(() => {
      const r = trackFix(zigzag, at(-60, 160), 10, state)!;
      state = r.state;
      return r.offRoute;
    });
    expect(results).toEqual([false, false, true]);
    expect(state.along).toBeCloseTo(150, 0); // voortgang blijft op de laatste plek op de route
  });

  it("negeert een onnauwkeurige uitschieter", () => {
    let state = trackFix(zigzag, at(0, 150), 10, initialTrackState)!.state;
    for (let i = 0; i < 5; i++) state = trackFix(zigzag, at(-40, 150), 120, state)!.state;
    expect(state.offCount).toBe(0);
  });

  it("springt bij een rondje niet naar de finish", () => {
    const loop = buildLine([at(0, 0), at(0, 300), at(300, 300), at(300, 0), at(0, 2)]);
    const first = trackFix(loop, at(0, 5), 10, initialTrackState)!;
    expect(first.along).toBeLessThan(20);
    // en aan het eind van het rondje wel richting finish
    let state = first.state;
    for (const along of [400, 700, 1000, 1150]) state = trackFix(loop, pointAt(loop, along), 10, state)!.state;
    expect(state.along!).toBeGreaterThan(1100);
    expect(distanceM(pointAt(loop, state.along!), at(50, 2))).toBeLessThan(10);
  });
});
