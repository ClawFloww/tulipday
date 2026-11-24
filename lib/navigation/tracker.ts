// Volgt een GPS-fix langs de routelijn: waar ben je op de route, hoe ver ben je
// ervan af en ben je echt van de route af (niet één uitschieter van de GPS).

import { project, type LngLat, type NavLine } from "./geometry";

export const OFF_ROUTE_M      = 30; // verder dan dit van de lijn telt als "van de route"
const OFF_ROUTE_FIXES         = 3;  // zoveel fixes achter elkaar voordat we herberekenen
const MAX_TRUSTED_ACCURACY_M  = 50; // onnauwkeuriger fixes beslissen niets over off-route
const BACK_M                  = 40; // zo ver mag je terug langs de route (GPS-ruis, keren)
const AHEAD_M                 = 600; // normaal zoekvenster vooruit

export type TrackState = {
  /** Laatste betrouwbare plek langs de route; null vóór de eerste fix. */
  along:    number | null;
  offCount: number;
};

export const initialTrackState: TrackState = { along: null, offCount: 0 };

export type TrackResult = {
  state:    TrackState;
  /** Plek langs de route (bij off-route: de laatste plek op de route). */
  along:    number;
  /** Dichtstbijzijnde punt op de lijn. */
  point:    LngLat;
  /** Afstand van de fix tot de lijn, in meters. */
  offset:   number;
  onRoute:  boolean;
  /** Lang genoeg van de route af om te herberekenen. */
  offRoute: boolean;
};

export function trackFix(
  line: NavLine,
  pos: LngLat,
  accuracy: number | null,
  state: TrackState,
): TrackResult | null {
  let proj;
  if (state.along === null) {
    // Eerste fix: bij een rondje liggen start en finish op dezelfde plek, dus
    // eerst in de eerste helft zoeken
    proj = project(line, pos, 0, line.length / 2);
    if (!proj || proj.offset > OFF_ROUTE_M) {
      const all = project(line, pos);
      if (all && (!proj || all.offset < proj.offset)) proj = all;
    }
  } else {
    proj = project(line, pos, state.along - BACK_M, state.along + AHEAD_M);
    // Grote sprong (GPS-gat, snel gereden): verder vooruit zoeken, nooit ver terug
    if (!proj || proj.offset > OFF_ROUTE_M) {
      const ahead = project(line, pos, state.along - BACK_M);
      if (ahead && (!proj || ahead.offset < proj.offset)) proj = ahead;
    }
  }
  if (!proj) return null;

  const onRoute = proj.offset <= OFF_ROUTE_M;
  const trusted = accuracy === null || accuracy <= MAX_TRUSTED_ACCURACY_M || proj.offset > accuracy * 1.5;
  const offCount = onRoute ? 0 : trusted ? state.offCount + 1 : state.offCount;
  const along = onRoute || state.along === null ? proj.along : state.along;

  return {
    state:    { along, offCount },
    along,
    point:    proj.point,
    offset:   proj.offset,
    onRoute,
    offRoute: offCount >= OFF_ROUTE_FIXES,
  };
}
