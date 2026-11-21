// Routelijnen op MapLibre-kaarten, overal in dezelfde stijl: dikke lijn met
// rand ("casing"), afgeronde uiteinden, richtingspijlen en start/finish.
// Eén GeoJSON-bron per kaart, geen losse lagen per route. Een geselecteerde
// route is merkrood, de andere zijn gedimd.

import type maplibregl from "maplibre-gl";
import { ICON_ARROW, ICON_FINISH, ICON_START, MAP_PRIMARY } from "@/lib/mapIcons";

export type RouteLine = {
  id:        string;
  /** [lng, lat] — al omgezet vanuit Supabase' [lat, lng]. */
  coords:    [number, number][];
  selected?: boolean;
};

// MapLibre leest geen CSS-variabelen; gedimd volgt --color-text-3
const CASING = "#FFFFFF";
const DIMMED = "#8C8C88";

const SELECTED: maplibregl.ExpressionSpecification = ["boolean", ["get", "selected"], false];

export const routeLayerIds = (sourceId: string) => ({
  casing: `${sourceId}-casing`,
  line:   `${sourceId}-line`,
  hit:    `${sourceId}-hit`,
  arrows: `${sourceId}-arrows`,
  ends:   `${sourceId}-ends`,
});

const endsSourceId = (sourceId: string) => `${sourceId}-ends`;

/** Voegt bron en lagen toe. Pijlen en start/finish verschijnen zodra addMapIcons klaar is. */
export function addRouteLayers(map: maplibregl.Map, sourceId: string, beforeId?: string) {
  const ids = routeLayerIds(sourceId);
  const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

  map.addSource(sourceId, { type: "geojson", data: empty });
  map.addSource(endsSourceId(sourceId), { type: "geojson", data: empty });

  map.addLayer({
    id: ids.casing, type: "line", source: sourceId,
    layout: { "line-join": "round", "line-cap": "round", "line-sort-key": ["case", SELECTED, 1, 0] },
    paint: {
      "line-color": CASING,
      "line-width": ["interpolate", ["linear"], ["zoom"],
        10, ["case", SELECTED, 7, 4.5],
        16, ["case", SELECTED, 13, 8]],
      "line-opacity": ["case", SELECTED, 1, 0.7],
    },
  }, beforeId);

  map.addLayer({
    id: ids.line, type: "line", source: sourceId,
    layout: { "line-join": "round", "line-cap": "round", "line-sort-key": ["case", SELECTED, 1, 0] },
    paint: {
      "line-color": ["case", SELECTED, MAP_PRIMARY, DIMMED],
      "line-width": ["interpolate", ["linear"], ["zoom"],
        10, ["case", SELECTED, 4, 2.5],
        16, ["case", SELECTED, 8, 5]],
      "line-opacity": ["case", SELECTED, 1, 0.75],
    },
  }, beforeId);

  // Onzichtbare brede lijn zodat ook een dunne, gedimde route makkelijk te raken is
  map.addLayer({
    id: ids.hit, type: "line", source: sourceId,
    paint: { "line-color": "#000000", "line-width": 22, "line-opacity": 0 },
  }, beforeId);

  map.addLayer({
    id: ids.arrows, type: "symbol", source: sourceId,
    filter: SELECTED,
    minzoom: 11,
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 11, 60, 16, 110],
      "icon-image": ICON_ARROW,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 11, 0.7, 16, 1],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  }, beforeId);

  map.addLayer({
    id: ids.ends, type: "symbol", source: endsSourceId(sourceId),
    layout: {
      "icon-image": ["get", "icon"],
      "icon-size": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 15, 1],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "symbol-sort-key": ["case", ["==", ["get", "icon"], ICON_START], 1, 0],
    },
  }, beforeId);
}

function metersBetween([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]): number {
  const x = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const y = lat2 - lat1;
  return Math.sqrt(x * x + y * y) * 111_320;
}

/** Zet de routes op de kaart; start/finish alleen voor geselecteerde routes. */
export function setRouteLines(map: maplibregl.Map, sourceId: string, lines: RouteLine[]) {
  const routes = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
  const ends   = map.getSource(endsSourceId(sourceId)) as maplibregl.GeoJSONSource | undefined;
  if (!routes || !ends) return;

  const drawable = lines.filter((l) => l.coords.length > 1);
  routes.setData({
    type: "FeatureCollection",
    features: drawable.map((l) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: l.coords },
      properties: { id: l.id, selected: l.selected ?? false },
    })),
  });

  const endFeatures: GeoJSON.Feature[] = [];
  for (const l of drawable.filter((d) => d.selected)) {
    const start = l.coords[0];
    const finish = l.coords[l.coords.length - 1];
    endFeatures.push({ type: "Feature", geometry: { type: "Point", coordinates: start }, properties: { icon: ICON_START } });
    // Rondje: finish valt samen met start, dan alleen de start tonen
    if (metersBetween(start, finish) > 40) {
      endFeatures.push({ type: "Feature", geometry: { type: "Point", coordinates: finish }, properties: { icon: ICON_FINISH } });
    }
  }
  ends.setData({ type: "FeatureCollection", features: endFeatures });
}

/** Bounds van een reeks [lng, lat]-punten, of null bij een lege reeks. */
export function boundsOf(coords: [number, number][]): maplibregl.LngLatBoundsLike | null {
  if (coords.length === 0) return null;
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [[minLng, minLat], [maxLng, maxLat]];
}
