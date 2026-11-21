// Centrale kaartstijl-configuratie.
//
// Basiskaart: OpenFreeMap (gratis, geen API-key, OSM-data). Positron voor licht,
// Dark voor donker, met TulipDay-tinten over achtergrond, water en groen.
// De kaart wisselt mee met de `.dark`-klasse op <html> (zie watchMapTheme).
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

const OPENFREEMAP_LIGHT = "https://tiles.openfreemap.org/styles/positron";
const OPENFREEMAP_DARK  = "https://tiles.openfreemap.org/styles/dark";

/** Lettertype voor eigen tekstlagen; OpenFreeMap levert alleen Noto Sans-glyphs. */
export const MAP_FONT_BOLD = ["Noto Sans Bold"];

// MapLibre leest geen CSS-variabelen; waarden volgen app/globals.css
const TINT = {
  light: { background: "#FAFAF7", water: "#CFE2EC", green: "#E2EDD8" },
  dark:  { background: "#0F0F0E", water: "#14222B", green: "#151D14" },
} as const;

export function isDarkTheme(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark");
}

export function mapStyleUrl(dark = isDarkTheme()): string {
  return dark ? OPENFREEMAP_DARK : OPENFREEMAP_LIGHT;
}

/** Warme TulipDay-tinten over de basislagen. Lagen die niet bestaan worden overgeslagen. */
function tintBaseMap(map: maplibregl.Map, dark: boolean) {
  const tint = dark ? TINT.dark : TINT.light;
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id;
    if (layer.type === "background") {
      map.setPaintProperty(id, "background-color", tint.background);
    } else if (layer.type === "fill" && /water/.test(id)) {
      map.setPaintProperty(id, "fill-color", tint.water);
    } else if (layer.type === "fill" && /park|wood|grass|forest/.test(id)) {
      map.setPaintProperty(id, "fill-color", tint.green);
    }
  }
}

/**
 * Behoudt eigen GeoJSON-bronnen en -lagen bij een stijlwissel. Basisstijlen
 * gebruiken alleen vectorbronnen, dus elke bron die de nieuwe stijl niet kent
 * is van ons.
 */
function keepCustomLayers(
  previous: maplibregl.StyleSpecification | undefined,
  next: maplibregl.StyleSpecification,
): maplibregl.StyleSpecification {
  if (!previous) return next;
  const custom = Object.entries(previous.sources).filter(([id]) => !(id in next.sources));
  const customIds = new Set(custom.map(([id]) => id));
  return {
    ...next,
    sources: { ...next.sources, ...Object.fromEntries(custom) },
    layers: [
      ...next.layers,
      ...previous.layers.filter((l) => "source" in l && customIds.has(l.source as string)),
    ],
  };
}

/**
 * Tint de basiskaart en wisselt licht/donker mee met de app. `onThemeChange`
 * draait na elke wissel, voor eigen lagen met thema-afhankelijke kleuren.
 * Geeft een opruimfunctie terug.
 */
export function watchMapTheme(map: maplibregl.Map, onThemeChange?: (dark: boolean) => void): () => void {
  let dark = isDarkTheme();
  let styleLoaded = false;
  let fellBack = false;

  const onStyleLoad = () => { styleLoaded = true; tintBaseMap(map, dark); };
  map.on("style.load", onStyleLoad);

  // Vangnet: laadt de donkere stijl niet, dan de lichte (met donkere tinten)
  const onError = () => {
    if (styleLoaded || !dark || fellBack) return;
    fellBack = true;
    map.setStyle(OPENFREEMAP_LIGHT, { transformStyle: keepCustomLayers });
  };
  map.on("error", onError);

  const observer = new MutationObserver(() => {
    const nextDark = isDarkTheme();
    if (nextDark === dark) return;
    dark = nextDark;
    styleLoaded = false;
    map.once("style.load", () => onThemeChange?.(dark));
    map.setStyle(fellBack ? OPENFREEMAP_LIGHT : mapStyleUrl(dark), { transformStyle: keepCustomLayers });
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  return () => {
    observer.disconnect();
    map.off("style.load", onStyleLoad);
    map.off("error", onError);
  };
}
