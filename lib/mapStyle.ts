// Centrale MapTiler-configuratie. De stijl-URL stond hardcoded in zes
// componenten, waardoor het roteren van de key zes code-wijzigingen kostte.
//
// Let op: een MapTiler-key is per definitie publiek — MapLibre haalt de tiles
// vanuit de browser op, dus de key zit hoe dan ook in de client-bundle. Ook
// NEXT_PUBLIC_MAPTILER_KEY verandert daar niets aan. De echte bescherming is
// een domeinrestrictie op de key in het MapTiler-dashboard. Wat dit bestand
// wél oplost: roteren zonder code-wijziging, en een andere key per omgeving.

/** Huidige key; blijft de fallback zolang de env-var nog niet overal gezet is. */
const FALLBACK_KEY = "SeaEiJkthxx3KNUCV0aI";

export const MAPTILER_KEY =
  process.env.NEXT_PUBLIC_MAPTILER_KEY || FALLBACK_KEY;

/** Standaard straatkaart — gebruikt door vrijwel elke kaartweergave. */
export const MAP_STYLE_STREETS =
  `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

/** Satelliet/hybride — alleen in de navigatiekaart als alternatieve laag. */
export const MAP_STYLE_SATELLITE =
  `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`;
