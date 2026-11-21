// Centrale kaartstijl-configuratie.
//
// Basiskaart: OpenFreeMap Positron (gratis, geen API-key, OSM-data) met warme
// TulipDay-tinten over achtergrond, water en groen. De kaart blijft altijd licht,
// ook in dark mode.
//
// MapTiler blijft alleen voor de navigatiekaart (straten + satelliet, fase 3).
// Een MapTiler-key is per definitie publiek — MapLibre haalt de tiles vanuit de
// browser op. De echte bescherming is een domeinrestrictie in het MapTiler-dashboard.

import type maplibregl from "maplibre-gl";

/** Huidige key; blijft de fallback zolang de env-var nog niet overal gezet is. */
const FALLBACK_KEY = "SeaEiJkthxx3KNUCV0aI";

export const MAPTILER_KEY =
  process.env.NEXT_PUBLIC_MAPTILER_KEY || FALLBACK_KEY;

/** MapTiler-straatkaart — alleen nog in de navigatiekaart en startpuntkiezer. */
export const MAP_STYLE_STREETS =
  `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

/** Satelliet/hybride — alleen in de navigatiekaart als alternatieve laag. */
export const MAP_STYLE_SATELLITE =
  `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`;

/** Standaard kaartstijl voor alle kaarten behalve de navigatiekaart. */
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

/** Lettertype voor eigen tekstlagen; OpenFreeMap levert alleen Noto Sans-glyphs. */
export const MAP_FONT_BOLD = ["Noto Sans Bold"];

// MapLibre leest geen CSS-variabelen; achtergrond volgt --color-surface (licht)
const TINT = { background: "#FAFAF7", water: "#CFE2EC", green: "#E2EDD8" } as const;

/**
 * Warme TulipDay-tinten over de basislagen zodra de stijl geladen is. Lagen
 * die niet bestaan worden overgeslagen. Direct na `new maplibregl.Map` aanroepen.
 */
export function tintMap(map: maplibregl.Map) {
  map.once("style.load", () => {
    for (const layer of map.getStyle().layers ?? []) {
      const id = layer.id;
      if (layer.type === "background") {
        map.setPaintProperty(id, "background-color", TINT.background);
      } else if (layer.type === "fill" && /water/.test(id)) {
        map.setPaintProperty(id, "fill-color", TINT.water);
      } else if (layer.type === "fill" && /park|wood|grass|forest/.test(id)) {
        map.setPaintProperty(id, "fill-color", TINT.green);
      }
    }
  });
}
