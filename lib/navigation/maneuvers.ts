// Afslagen ("manoeuvres") voor turn-by-turn. Twee bronnen:
//  • deriveManeuvers: uit de eigen routelijn (presetroutes, BRouter-geometrie uit
//    Supabase) — klopt altijd met wat er getekend is, werkt offline, zonder straatnaam.
//  • fromOsrmSteps: uit OSRM-stappen (aanrijden, herberekenen, losse bestemming),
//    met straatnaam en rotonde-afslag.

import { angleDiff, bearingDeg, pointAt, project, type LngLat, type NavLine } from "./geometry";

export type ManeuverKind =
  | "depart" | "straight" | "arrive" | "uturn" | "roundabout"
  | "slight_left" | "left" | "sharp_left"
  | "slight_right" | "right" | "sharp_right";

export type Maneuver = {
  kind:     ManeuverKind;
  /** Afstand langs de lijn tot de afslag, in meters. */
  along:    number;
  location: LngLat;
  street?:  string;
  /** Afslagnummer op een rotonde. */
  exit?:    number;
};

const TURN_MIN_DEG = 35;   // kleinere knikken zijn de weg die buigt
const WINDOW_M     = 20;   // richting gemeten over 20 m vóór en na de knik
const CLUSTER_M    = 25;   // knikken dichter bij elkaar zijn één afslag
const EDGE_M       = 15;   // geen afslag vlak na de start of vlak voor het einde

export function kindFromAngle(angle: number): ManeuverKind {
  const a = Math.abs(angle);
  if (a < TURN_MIN_DEG) return "straight";
  if (a >= 170) return "uturn";
  const side = angle > 0 ? "right" : "left";
  if (a < 60)  return `slight_${side}`;
  if (a < 130) return side;
  return `sharp_${side}`;
}

/** Hoek van de route rond `along` (positief = rechtsaf). */
function turnAngle(line: NavLine, startAlong: number, endAlong: number): number {
  const inFrom  = pointAt(line, startAlong - WINDOW_M);
  const inTo    = pointAt(line, startAlong);
  const outFrom = pointAt(line, endAlong);
  const outTo   = pointAt(line, endAlong + WINDOW_M);
  return angleDiff(bearingDeg(inFrom, inTo), bearingDeg(outFrom, outTo));
}

export function deriveManeuvers(line: NavLine): Maneuver[] {
  const { coords, cum, length } = line;
  if (coords.length < 2) return [];

  // 1. Elke knik die op zichzelf al een afslag lijkt
  const candidates: { along: number; idx: number; angle: number }[] = [];
  for (let i = 1; i < coords.length - 1; i++) {
    const along = cum[i];
    if (along < EDGE_M || along > length - EDGE_M) continue;
    const angle = turnAngle(line, along, along);
    if (Math.abs(angle) >= TURN_MIN_DEG) candidates.push({ along, idx: i, angle });
  }

  // 2. Knikken vlak achter elkaar samenvoegen; de hoek over het hele cluster telt
  //    (een kort S-bochtje heft zichzelf op en verdwijnt)
  const out: Maneuver[] = [{ kind: "depart", along: 0, location: coords[0] }];
  let i = 0;
  while (i < candidates.length) {
    let j = i;
    while (j + 1 < candidates.length && candidates[j + 1].along - candidates[j].along <= CLUSTER_M) j++;
    const first = candidates[i], last = candidates[j];
    const angle = turnAngle(line, first.along, last.along);
    const kind = kindFromAngle(angle);
    if (kind !== "straight") {
      const peak = candidates.slice(i, j + 1).reduce((a, b) => (Math.abs(b.angle) > Math.abs(a.angle) ? b : a));
      out.push({ kind, along: peak.along, location: coords[peak.idx] });
    }
    i = j + 1;
  }

  out.push({ kind: "arrive", along: length, location: coords[coords.length - 1] });
  return out;
}

// ── OSRM ──────────────────────────────────────────────────────────────────────

export type OsrmStep = {
  name?:     string;
  distance:  number;
  maneuver:  { type: string; modifier?: string; location: LngLat; exit?: number };
};

function kindFromOsrm(type: string, modifier?: string): ManeuverKind {
  if (type === "depart") return "depart";
  if (type === "arrive") return "arrive";
  if (type === "roundabout" || type === "rotary" || type === "roundabout turn") return "roundabout";
  switch (modifier) {
    case "uturn":        return "uturn";
    case "sharp left":   return "sharp_left";
    case "left":         return "left";
    case "slight left":  return "slight_left";
    case "sharp right":  return "sharp_right";
    case "right":        return "right";
    case "slight right": return "slight_right";
    default:             return "straight";
  }
}

/**
 * Zet OSRM-stappen (van alle legs achter elkaar) om naar manoeuvres op `line`.
 * Tussentijdse aankomsten en vertrekken bij waypoints vallen weg, net als
 * "rechtdoor" zonder nieuwe straatnaam.
 */
export function fromOsrmSteps(line: NavLine, steps: OsrmStep[]): Maneuver[] {
  const out: Maneuver[] = [];
  let summed = 0;
  steps.forEach((step, idx) => {
    const kind = kindFromOsrm(step.maneuver.type, step.maneuver.modifier);
    const isFirst = idx === 0, isLast = idx === steps.length - 1;
    const atSummed = summed;
    summed += step.distance;

    if (kind === "depart" && !isFirst) return;
    if (kind === "arrive" && !isLast) return;
    if (kind === "straight" && step.maneuver.type !== "new name" && step.maneuver.type !== "continue") return;
    // "Ga rechtdoor" zonder andere straat zegt niets
    const prevStreet = out[out.length - 1]?.street;
    if (kind === "straight" && (!step.name || step.name === prevStreet)) return;

    // Plaats op de lijn: projecteren rond de opgetelde afstand (lussen!)
    const proj = project(line, step.maneuver.location, atSummed - 150, atSummed + 150)
      ?? project(line, step.maneuver.location);
    const along = isFirst ? 0 : isLast ? line.length : (proj?.along ?? atSummed);

    out.push({
      kind,
      along,
      location: step.maneuver.location,
      street:   step.name || undefined,
      exit:     step.maneuver.exit,
    });
  });
  if (out.length === 0 || out[out.length - 1].kind !== "arrive") {
    out.push({ kind: "arrive", along: line.length, location: line.coords[line.coords.length - 1] });
  }
  return out.sort((a, b) => a.along - b.along);
}

/** Index van de eerstvolgende manoeuvre ná `along` (vertrek telt niet). */
export function nextManeuverIndex(maneuvers: Maneuver[], along: number): number {
  const idx = maneuvers.findIndex((m) => m.kind !== "depart" && m.along > along + 5);
  return idx === -1 ? maneuvers.length - 1 : idx;
}

/** Vertaalsleutel voor de opdracht bij een manoeuvre. */
export function maneuverKey(m: Maneuver): string {
  if (m.kind === "roundabout") return m.exit ? "navigation.m_roundabout_exit" : "navigation.m_roundabout";
  return `navigation.m_${m.kind}`;
}

/** Ronde afstand voor banner en spraak: per 10 m, vanaf 100 m per 50 m, vanaf 1 km in km. */
export function roundDistance(m: number): { value: number; unit: "m" | "km" } {
  if (m >= 1000) return { value: Math.round(m / 100) / 10, unit: "km" };
  if (m >= 100)  return { value: Math.round(m / 50) * 50, unit: "m" };
  return { value: Math.max(0, Math.round(m / 10) * 10), unit: "m" };
}
