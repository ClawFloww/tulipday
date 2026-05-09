"use client";

// MapLibre navigatiekaart — volgt GPS-positie met tilt en richtingsorientatie
// Gedraagt zich als Google Maps navigatiemodus: kaart draait mee met rijrichting,
// gebruiker staat in het onderste 1/3 van het scherm (via padding)

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://api.maptiler.com/maps/streets-v2/style.json?key=SeaEiJkthxx3KNUCV0aI";

export interface NavStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
}

interface Props {
  geometry:         [number, number][]; // [lng, lat] paren
  approachGeometry: [number, number][] | null; // grijze aanrijdlijn [lng, lat]
  stops:            NavStop[];
  activeStopIdx:    number;
  visitedStops:     Set<number>;
  userPos:          [number, number] | null; // [lat, lng]
  heading:          number;
  locked:           boolean;  // kaart vergrendeld op gebruikerslocatie
  onUserPan:        () => void;
}

export default function NavigationMap({
  geometry,
  approachGeometry,
  stops,
  activeStopIdx,
  visitedStops,
  userPos,
  heading,
  locked,
  onUserPan,
}: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const initDone      = useRef(false);
  const lockedRef     = useRef(locked);
  const onUserPanRef  = useRef(onUserPan);

  // Synchroniseer refs
  useEffect(() => { lockedRef.current    = locked; },    [locked]);
  useEffect(() => { onUserPanRef.current = onUserPan; }, [onUserPan]);

  // ── Kaart initialiseren (één keer) ────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!containerRef.current || initDone.current) return;
    initDone.current = true;

    // Start gecentreerd op de eerste stop of Nederland als er geen stops zijn
    const center: [number, number] = stops[activeStopIdx]
      ? [stops[activeStopIdx].lng, stops[activeStopIdx].lat]
      : [4.46, 52.24];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     MAP_STYLE,
      center,
      zoom:    13,
      pitch:   0,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    // Detecteer handmatig pannen/zoomen → ontgrendel kaart
    const unlockEvents = ["mousedown", "touchstart", "wheel"] as const;
    unlockEvents.forEach((evt) => {
      map.on(evt, () => {
        if (lockedRef.current) onUserPanRef.current();
      });
    });

    map.on("load", () => {
      // ── Aanrijdlijn (grijs) — van huidige locatie naar startpunt ──────
      map.addSource("nav-approach", {
        type: "geojson",
        data: approachGeometry && approachGeometry.length >= 2
          ? { type: "Feature", geometry: { type: "LineString", coordinates: approachGeometry }, properties: {} } as GeoJSON.Feature
          : { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "nav-approach-casing", type: "line", source: "nav-approach",
        layout: { "line-join": "round", "line-cap": "round" },
        paint:  { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.55 },
      });

      map.addLayer({
        id: "nav-approach-line", type: "line", source: "nav-approach",
        layout: { "line-join": "round", "line-cap": "round" },
        paint:  { "line-color": "#6B7280", "line-width": 6 },
      });

      // ── Route-lijn (rood) ─────────────────────────────────────────────
      map.addSource("nav-route", {
        type: "geojson",
        data: {
          type:     "Feature",
          geometry: { type: "LineString", coordinates: geometry },
          properties: {},
        },
      });

      map.addLayer({
        id: "nav-route-shadow", type: "line", source: "nav-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint:  { "line-color": "rgba(0,0,0,0.15)", "line-width": 14, "line-blur": 5 },
      });

      map.addLayer({
        id: "nav-route-line", type: "line", source: "nav-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint:  { "line-color": "#E8102A", "line-width": 8 },
      });

      map.addLayer({
        id: "nav-route-border", type: "line", source: "nav-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint:  { "line-color": "#fff", "line-width": 2, "line-opacity": 0.3 },
      });

      // ── Stop-markers ───────────────────────────────────────────────────
      stops.forEach((stop, idx) => {
        const isVisited = visitedStops.has(idx);
        const isActive  = idx === activeStopIdx;
        const size      = isActive ? 44 : 32;
        const bg        = isVisited ? "#2D7D46" : isActive ? "#E8102A" : "#9CA3AF";

        const el = document.createElement("div");
        el.style.cssText = [
          `width:${size}px`, `height:${size}px`,
          "border-radius:50%",
          `background:${bg}`,
          "border:3px solid white",
          "display:flex", "align-items:center", "justify-content:center",
          "color:white", "font-weight:800", `font-size:${isActive ? 14 : 12}px`,
          "font-family:system-ui,sans-serif",
          "box-shadow:0 3px 10px rgba(0,0,0,0.3)",
          "position:relative",
        ].join(";");
        el.textContent = isVisited ? "✓" : String(idx + 1);

        // Pulserende ring om actieve stop
        if (isActive) {
          const ring = document.createElement("div");
          ring.style.cssText = [
            "position:absolute", "inset:-6px", "border-radius:50%",
            "border:2.5px solid rgba(232,16,42,0.45)",
            "animation:navpulse 1.8s ease-in-out infinite",
          ].join(";");
          el.appendChild(ring);
        }

        new maplibregl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(new maplibregl.Popup({ offset: 30, closeButton: false })
            .setHTML(`<strong style="font-family:system-ui">${stop.name}</strong>`))
          .addTo(map);
      });

      // Animatie-CSS
      if (!document.getElementById("nav-map-style")) {
        const style = document.createElement("style");
        style.id = "nav-map-style";
        style.textContent = `
          @keyframes navpulse {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50%       { transform: scale(1.35); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      initDone.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // kaart initialiseer één keer; stop-markers worden via DOM aangemaakt

  // ── Aanrijdlijn tonen/verbergen op basis van approachGeometry ────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      const src = map.getSource("nav-approach") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      if (approachGeometry && approachGeometry.length >= 2) {
        src.setData({
          type: "Feature",
          geometry: { type: "LineString", coordinates: approachGeometry },
          properties: {},
        } as GeoJSON.Feature);
      } else {
        src.setData({ type: "FeatureCollection", features: [] });
      }
    };
    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [approachGeometry]);

  // ── GPS-positie bijwerken ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPos) return;

    const lngLat: [number, number] = [userPos[1], userPos[0]];

    // Maak GPS-marker (één keer)
    if (!userMarkerRef.current) {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position:relative;width:24px;height:24px;";

      // Richtingskegel (boven de stip)
      const cone = document.createElement("div");
      cone.id = "nav-cone";
      cone.style.cssText = [
        "position:absolute", "top:-18px", "left:50%",
        "transform:translateX(-50%)",
        "width:0", "height:0",
        "border-left:8px solid transparent",
        "border-right:8px solid transparent",
        "border-bottom:18px solid rgba(29,106,255,0.5)",
        "filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
      ].join(";");
      wrapper.appendChild(cone);

      // Blauwe accuratie-ring
      const ring = document.createElement("div");
      ring.style.cssText = [
        "position:absolute", "inset:-6px", "border-radius:50%",
        "background:rgba(29,106,255,0.15)",
        "border:1.5px solid rgba(29,106,255,0.3)",
      ].join(";");
      wrapper.appendChild(ring);

      // Blauwe stip
      const dot = document.createElement("div");
      dot.style.cssText = [
        "width:24px", "height:24px", "border-radius:50%",
        "background:#1D6AFF",
        "border:3px solid white",
        "box-shadow:0 2px 8px rgba(0,0,0,0.35)",
        "position:absolute", "top:0", "left:0",
      ].join(";");
      wrapper.appendChild(dot);

      userMarkerRef.current = new maplibregl.Marker({
        element:           wrapper,
        rotationAlignment: "map",
        pitchAlignment:    "map",
      })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat(lngLat);
    }

    userMarkerRef.current.setRotation(heading);

    // Volg gebruiker als kaart vergrendeld is
    if (lockedRef.current && map.isStyleLoaded()) {
      map.easeTo({
        center:   lngLat,
        bearing:  heading,
        pitch:    50,
        zoom:     16.5,
        // Padding: gebruiker staat in het onderste 1/3 van het scherm
        padding:  { top: 280, bottom: 60, left: 60, right: 60 },
        duration: 1000,
        easing:   (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
      });
    }
  }, [userPos, heading]);

  // ── Recenter als locked weer true wordt ───────────────────────────────────
  useEffect(() => {
    if (!locked || !userPos || !mapRef.current) return;
    const map = mapRef.current;
    const lngLat: [number, number] = [userPos[1], userPos[0]];
    if (map.isStyleLoaded()) {
      map.flyTo({
        center:   lngLat,
        bearing:  heading,
        pitch:    50,
        zoom:     16.5,
        padding:  { top: 280, bottom: 60, left: 60, right: 60 },
        duration: 1200,
      });
    }
  }, [locked]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="w-full h-full" />;
}
