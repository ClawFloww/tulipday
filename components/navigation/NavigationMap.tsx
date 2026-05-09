"use client";

// Volledige MapLibre kaart voor navigatiemodus
// Toont: route-lijn, stop-markers, live GPS-positie met richtingsindicator
// Volgt automatisch de gebruiker met tilt en richtingsorientatie

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
  geometry: [number, number][]; // [lng, lat] paren
  stops: NavStop[];
  activeStopIdx: number;
  visitedStops: Set<number>;
  userPos: [number, number] | null; // [lat, lng]
  heading: number;
}

export default function NavigationMap({
  geometry,
  stops,
  activeStopIdx,
  visitedStops,
  userPos,
  heading,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const initDone      = useRef(false);

  // ── Initialiseer kaart ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || initDone.current) return;
    initDone.current = true;

    const center: [number, number] = stops[activeStopIdx]
      ? [stops[activeStopIdx].lng, stops[activeStopIdx].lat]
      : [4.46, 52.24];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     MAP_STYLE,
      center,
      zoom:    14,
      pitch:   40,
      bearing: 0,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      // ── Route-lijn ──────────────────────────────────────────────────────
      map.addSource("nav-route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: geometry },
          properties: {},
        },
      });

      map.addLayer({
        id:     "nav-route-shadow",
        type:   "line",
        source: "nav-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint:  {
          "line-color": "rgba(0,0,0,0.18)",
          "line-width": 12,
          "line-blur":  4,
        },
      });

      map.addLayer({
        id:     "nav-route-line",
        type:   "line",
        source: "nav-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint:  { "line-color": "#E8102A", "line-width": 7 },
      });

      // ── Stop-markers ───────────────────────────────────────────────────
      stops.forEach((stop, idx) => {
        const isVisited = visitedStops.has(idx);
        const isActive  = idx === activeStopIdx;

        const el = document.createElement("div");
        el.style.cssText = [
          `width:${isActive ? 44 : 32}px`,
          `height:${isActive ? 44 : 32}px`,
          "border-radius:50%",
          `background:${isVisited ? "#2D7D46" : isActive ? "#E8102A" : "#9CA3AF"}`,
          "border:3px solid white",
          "display:flex",
          "align-items:center",
          "justify-content:center",
          "color:white",
          `font-weight:800`,
          `font-size:${isActive ? 14 : 12}px`,
          "font-family:system-ui,sans-serif",
          "box-shadow:0 2px 8px rgba(0,0,0,0.28)",
          "cursor:default",
        ].join(";");
        el.textContent = isVisited ? "✓" : String(idx + 1);

        // Pulserende ring voor actieve stop
        if (isActive) {
          const ring = document.createElement("div");
          ring.style.cssText = [
            "position:absolute",
            "inset:-6px",
            "border-radius:50%",
            "border:2.5px solid rgba(232,16,42,0.4)",
            "animation:pulse 1.8s ease-in-out infinite",
          ].join(";");
          el.style.position = "relative";
          el.appendChild(ring);
        }

        new maplibregl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .addTo(map);
      });

      // CSS voor pulserende ring
      if (!document.getElementById("nav-pulse-style")) {
        const style = document.createElement("style");
        style.id = "nav-pulse-style";
        style.textContent = `
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50%       { transform: scale(1.3); opacity: 0; }
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
  }, []); // kaart init één keer; props worden intern bijgehouden via markers

  // ── Update GPS-positie ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPos) return;

    const lngLat: [number, number] = [userPos[1], userPos[0]];

    if (!userMarkerRef.current) {
      // Maak GPS-marker aan
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position:relative;width:22px;height:22px;";

      // Richtingskegel
      const cone = document.createElement("div");
      cone.style.cssText = [
        "position:absolute",
        "top:-14px",
        "left:50%",
        "transform:translateX(-50%)",
        "width:0",
        "height:0",
        "border-left:7px solid transparent",
        "border-right:7px solid transparent",
        "border-bottom:14px solid rgba(29,106,255,0.55)",
      ].join(";");
      wrapper.appendChild(cone);

      // Blauwe stip
      const dot = document.createElement("div");
      dot.style.cssText = [
        "width:22px",
        "height:22px",
        "border-radius:50%",
        "background:#1D6AFF",
        "border:3px solid white",
        "box-shadow:0 0 0 5px rgba(29,106,255,0.2),0 2px 8px rgba(0,0,0,0.3)",
      ].join(";");
      wrapper.appendChild(dot);

      userMarkerRef.current = new maplibregl.Marker({
        element:       wrapper,
        rotationAlignment: "map",
        pitchAlignment:    "map",
      })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat(lngLat);
    }

    // Roteer richtingskegel
    if (userMarkerRef.current) {
      userMarkerRef.current.setRotation(heading);
    }

    // Vloeiend volgen
    if (map.isStyleLoaded()) {
      map.easeTo({
        center:   lngLat,
        bearing:  heading,
        pitch:    45,
        zoom:     15.5,
        duration: 1200,
        easing:   (t) => t,
      });
    }
  }, [userPos, heading]);

  return <div ref={containerRef} className="w-full h-full" />;
}
