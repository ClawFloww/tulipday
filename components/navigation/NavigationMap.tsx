"use client";

// MapLibre-navigatiekaart in Google Maps-stijl. GPS levert ongeveer één fix per
// seconde; tussen twee fixes schuift de locatiestip per frame vloeiend langs de
// route en draait de camera mee (heading-up). Zo verspringt er niets.
// Zoom en kanteling volgen de snelheid en komende afslag (prop `zoom`).

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE_SATELLITE, MAP_STYLE_STREETS } from "@/lib/mapStyle";
import { addRouteLayers, setRouteLines } from "@/lib/mapLayers";
import { addMapIcons, CATEGORY_COLOR, categoryIconId, ICON_FINISH } from "@/lib/mapIcons";
import { angleDiff, pointAt, type LngLat, type NavLine } from "@/lib/navigation/geometry";
import type { Category } from "@/lib/types";

export type MapStyle = "streets" | "satellite";

export type PuckFix = {
  point:    LngLat;
  bearing:  number;
  accuracy: number | null;
  /** Plek langs de getoonde lijn, als de fix op die lijn ligt (voor animatie langs de route). */
  along:    number | null;
  onLeg:    boolean;
};

export type MapStop = { id: string; lat: number; lng: number; category: string };

const STYLE_URLS: Record<MapStyle, string> = {
  streets:   MAP_STYLE_STREETS,
  satellite: MAP_STYLE_SATELLITE,
};

const NAV_PITCH  = 55;
const ROUTES_SRC = "nav-routes";
const STOPS_SRC  = "nav-stops";
// MapLibre en DOM-markers lezen geen CSS-variabelen; volgt --color-info
const PUCK_BLUE  = "#1D6AFF";
const VISITED    = "#8C8C88";
const KNOWN_CATEGORIES = Object.keys(CATEGORY_COLOR);

interface Props {
  route:         NavLine;
  /** Aanrij- of terugleidroute die nu gevolgd wordt; de hoofdroute is dan gedimd. */
  leg:           NavLine | null;
  stops:         MapStop[];
  activeStopIdx: number;
  visitedStops:  Set<number>;
  fix:           PuckFix | null;
  zoom:          number;
  locked:        boolean;
  onUserPan:     () => void;
  mapStyle:      MapStyle;
  /** Ruimte boven (instructiebanner) en onder (onderbalk) in px. */
  insets:        { top: number; bottom: number };
}

function stopsGeoJSON(stops: MapStop[], active: number, visited: Set<number>): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stops.map((s, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      properties: {
        icon:    KNOWN_CATEGORIES.includes(s.category) ? categoryIconId(s.category as Category) : ICON_FINISH,
        color:   visited.has(i) ? VISITED : (CATEGORY_COLOR[s.category as Category] ?? CATEGORY_COLOR.flower_field),
        visited: visited.has(i),
        active:  i === active,
      },
    })),
  };
}

function setupLayers(map: maplibregl.Map) {
  addRouteLayers(map, ROUTES_SRC);
  map.addSource(STOPS_SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  // Gekleurde cirkel als vangnet zolang de iconen nog laden
  map.addLayer({
    id: `${STOPS_SRC}-dot`, type: "circle", source: STOPS_SRC,
    paint: {
      "circle-radius": ["case", ["get", "active"], 11, 8],
      "circle-color": ["get", "color"],
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 2.5,
      "circle-pitch-alignment": "map",
    },
  });
  map.addLayer({
    id: `${STOPS_SRC}-icon`, type: "symbol", source: STOPS_SRC,
    layout: {
      "icon-image": ["get", "icon"],
      "icon-size": ["case", ["get", "active"], 1.15, 0.85],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-pitch-alignment": "viewport",
    },
    paint: { "icon-opacity": ["case", ["get", "visited"], 0.45, 1] },
  });
  addMapIcons(map);
}

/** Meters per schermpixel op deze breedte en zoom (512px-tegels). */
function metersPerPixel(lat: number, zoom: number) {
  return (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / 2 ** (zoom + 9);
}

function createPuck(): { el: HTMLDivElement; accuracy: HTMLDivElement; cone: HTMLDivElement } {
  const el = document.createElement("div");
  el.style.cssText = "position:relative;width:22px;height:22px;pointer-events:none;";

  const accuracy = document.createElement("div");
  accuracy.style.cssText = `position:absolute;left:50%;top:50%;width:0;height:0;border-radius:50%;transform:translate(-50%,-50%);background:${PUCK_BLUE}1F;border:1px solid ${PUCK_BLUE}55;`;

  // Lichtbundel in de looprichting
  const cone = document.createElement("div");
  cone.innerHTML = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="nav-beam" cx="32" cy="32" r="32" gradientUnits="userSpaceOnUse">
      <stop offset="0.3" stop-color="${PUCK_BLUE}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${PUCK_BLUE}" stop-opacity="0"/>
    </radialGradient></defs>
    <path d="M32 32 L14 2 A34 34 0 0 1 50 2 Z" fill="url(#nav-beam)"/>
  </svg>`;
  cone.style.cssText = "position:absolute;left:-21px;top:-21px;width:64px;height:64px;";

  const dot = document.createElement("div");
  dot.style.cssText = `position:absolute;inset:0;border-radius:50%;background:${PUCK_BLUE};border:3px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.35);`;

  el.append(accuracy, cone, dot);
  return { el, accuracy, cone };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function NavigationMap({
  route, leg, stops, activeStopIdx, visitedStops, fix, zoom, locked, onUserPan, mapStyle, insets,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  // Laatste props voor de animatielus en voor herstel na een stijlwissel
  const live = useRef({ route, leg, stops, activeStopIdx, visitedStops, zoom, locked, onUserPan, insets });
  live.current = { route, leg, stops, activeStopIdx, visitedStops, zoom, locked, onUserPan, insets };

  // Animatie: van de vorige weergegeven plek naar de nieuwe fix
  const anim = useRef<{
    from: { point: LngLat; along: number | null; bearing: number };
    to:   PuckFix;
    start: number;
    duration: number;
  } | null>(null);
  const shown      = useRef<{ point: LngLat; along: number | null; bearing: number; accuracy: number | null } | null>(null);
  const lastFixAt  = useRef(0);
  const camZoom    = useRef(zoom);
  const freeUntil  = useRef(0); // camera even niet aansturen (tijdens hercentreren)

  const pushData = (map: maplibregl.Map) => {
    const p = live.current;
    setRouteLines(map, ROUTES_SRC, [
      { id: "route", coords: p.route.coords, selected: !p.leg },
      ...(p.leg ? [{ id: "leg", coords: p.leg.coords, selected: true }] : []),
    ]);
    const src = map.getSource(STOPS_SRC) as maplibregl.GeoJSONSource | undefined;
    src?.setData(stopsGeoJSON(p.stops, p.activeStopIdx, p.visitedStops));
  };

  // ── Kaart (één keer) + animatielus ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const first = live.current.route.coords[0] ?? [4.55, 52.26];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     STYLE_URLS[mapStyle],
      center:    first,
      zoom:      15,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    map.on("style.load", () => {
      if (!map.getSource(ROUTES_SRC)) setupLayers(map);
      pushData(map);
    });

    // Handmatig schuiven, zoomen of draaien → camera loslaten
    const release = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent && live.current.locked) live.current.onUserPan();
    };
    map.on("dragstart", release);
    map.on("zoomstart", release);
    map.on("rotatestart", release);
    map.on("pitchstart", release);

    const puck = createPuck();
    const marker = new maplibregl.Marker({ element: puck.el, rotationAlignment: "map", pitchAlignment: "map" });
    let markerAdded = false;
    let lastAccPx = -1;

    let frame = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const a = anim.current;
      if (!a) return;

      // Positie: langs de routelijn als beide fixes erop liggen, anders rechtstreeks
      const t = Math.min(1, (now - a.start) / a.duration);
      const p = live.current;
      const line = a.to.onLeg ? p.leg : p.route;
      let point: LngLat;
      let along: number | null = null;
      if (line && a.from.along !== null && a.to.along !== null && Math.abs(a.to.along - a.from.along) < 250) {
        along = lerp(a.from.along, a.to.along, t);
        point = pointAt(line, along);
      } else {
        point = [lerp(a.from.point[0], a.to.point[0], t), lerp(a.from.point[1], a.to.point[1], t)];
        along = t >= 1 ? a.to.along : null;
      }
      const bearing = (a.from.bearing + angleDiff(a.from.bearing, a.to.bearing) * Math.min(1, t * 1.5) + 360) % 360;
      shown.current = { point, along, bearing, accuracy: a.to.accuracy };

      marker.setLngLat(point).setRotation(bearing);
      if (!markerAdded) { marker.addTo(map); markerAdded = true; }

      // Nauwkeurigheidscirkel in echte meters
      const accPx = a.to.accuracy ? Math.min(400, a.to.accuracy / metersPerPixel(point[1], map.getZoom())) : 0;
      if (Math.abs(accPx - lastAccPx) > 0.5) {
        lastAccPx = accPx;
        const size = accPx > 14 ? accPx * 2 : 0;
        puck.accuracy.style.width = puck.accuracy.style.height = `${size}px`;
      }

      // Camera volgt: kleine stapjes per frame naar zoom, positie en richting
      if (p.locked && now > freeUntil.current && map.isStyleLoaded()) {
        camZoom.current = lerp(camZoom.current, p.zoom, 0.04);
        const cam = map.getCenter();
        const moved = Math.abs(cam.lng - point[0]) + Math.abs(cam.lat - point[1]) > 1e-7
          || Math.abs(angleDiff(map.getBearing(), bearing)) > 0.05
          || Math.abs(map.getZoom() - camZoom.current) > 0.002
          || Math.abs(map.getPitch() - NAV_PITCH) > 0.1;
        if (moved) {
          map.jumpTo({
            center:  point,
            bearing,
            zoom:    camZoom.current,
            pitch:   lerp(map.getPitch(), NAV_PITCH, 0.08),
          });
        }
      }
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      marker.remove();
      map.remove();
      mapRef.current = null;
    };
    // De kaart wordt één keer gemaakt; de lus leest actuele props via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Nieuwe GPS-fix → animatie starten ───────────────────────────────────
  useEffect(() => {
    if (!fix) return;
    const now = performance.now();
    const sinceLast = lastFixAt.current ? now - lastFixAt.current : 0;
    lastFixAt.current = now;
    const from = shown.current;
    // Wisselt de fix van lijn (aanrijden → route), dan geldt de oude along niet meer
    const sameLine = anim.current?.to.onLeg === fix.onLeg;
    anim.current = {
      from: from
        ? { point: from.point, along: sameLine ? from.along : null, bearing: from.bearing }
        : { point: fix.point, along: fix.along, bearing: fix.bearing },
      to: fix,
      start: now,
      // Iets langer dan het fix-interval, zodat de stip nooit stilvalt tussen fixes
      duration: from ? Math.min(2000, Math.max(400, sinceLast * 1.1)) : 1,
    };
  }, [fix]);

  // ── Routes en stops bijwerken ───────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (map?.getSource(ROUTES_SRC)) pushData(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, leg, stops, activeStopIdx, visitedStops]);

  // ── Ruimte voor banner en onderbalk: de stip staat in het onderste deel ─
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el) return;
    const apply = () => {
      const h = el.clientHeight;
      // Stip op ~70% van de hoogte, zoals in een navigatie-app
      map.setPadding({ top: Math.max(insets.top, h * 0.45), bottom: insets.bottom, left: 0, right: 0 });
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [insets.top, insets.bottom]);

  // ── Hercentreren: vloeiend terug naar de stip ──────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const s = shown.current;
    if (!locked || !map || !s) return;
    freeUntil.current = performance.now() + 700;
    camZoom.current = live.current.zoom;
    map.easeTo({ center: s.point, bearing: s.bearing, zoom: camZoom.current, pitch: NAV_PITCH, duration: 650 });
  }, [locked]);

  // ── Stijl wisselen (straten ↔ satelliet) ────────────────────────────────
  const styleRef = useRef(mapStyle);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleRef.current === mapStyle) return;
    styleRef.current = mapStyle;
    // setStyle gooit bronnen en lagen weg; "style.load" zet ze terug
    map.setStyle(STYLE_URLS[mapStyle]);
  }, [mapStyle]);

  return <div ref={containerRef} className="w-full h-full" />;
}
