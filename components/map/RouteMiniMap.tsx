"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Maximize2 } from "lucide-react";

export interface MiniMapStop {
  lat: number;
  lng: number;
  label: string;
}

interface Props {
  stops: MiniMapStop[];
  accentColor?: string;
  onExpand?: () => void;
}

const MAP_STYLE = "https://api.maptiler.com/maps/streets-v2/style.json?key=SeaEiJkthxx3KNUCV0aI";

function createNumberedPin(label: string, color: string): string {
  const w = 30, h = 38;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#00000044"/>
      </filter>
    </defs>
    <g filter="url(#s)">
      <path fill="${color}" d="M15 1 C7.3 1 1 7.3 1 15 C1 22.7 15 37 15 37 S29 22.7 29 15 C29 7.3 22.7 1 15 1Z"/>
    </g>
    <circle cx="15" cy="15" r="9.5" fill="white"/>
    <text x="15" y="19.5" text-anchor="middle" font-family="Arial,sans-serif"
          font-size="10" font-weight="800" fill="${color}">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function RouteMiniMap({ stops, accentColor = "#f43f5e", onExpand }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!divRef.current || stops.length === 0) return;
    let cancelled = false;

    const map = new maplibregl.Map({
      container: divRef.current,
      style: MAP_STYLE,
      center: [stops[0].lng, stops[0].lat],
      zoom: 11,
      interactive: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      if (cancelled) return;

      // ── Fit bounds ──
      const bounds = new maplibregl.LngLatBounds();
      stops.forEach((s) => bounds.extend([s.lng, s.lat]));
      map.fitBounds(bounds, { padding: 40, animate: false });

      // ── Polyline ──
      const coords = stops.map((s) => [s.lng, s.lat]);
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: {},
        },
      });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": accentColor,
          "line-width": 3,
          "line-dasharray": [2, 2],
          "line-opacity": 0.85,
        },
      });

      // ── Numbered markers ──
      stops.forEach((stop, idx) => {
        const el = document.createElement("div");
        el.style.cssText = `width:30px;height:38px;background-image:url("${createNumberedPin(String(idx + 1), accentColor)}");background-size:contain;background-repeat:no-repeat;`;
        new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([stop.lng, stop.lat])
          .addTo(map);
      });

      setReady(true);
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops.length > 0 ? "loaded" : "empty"]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ height: 220 }}>
      {!ready && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center z-10">
          <span className="text-2xl opacity-30">🗺</span>
        </div>
      )}

      <div ref={divRef} className="w-full h-full" />

      {onExpand && (
        <button
          onClick={onExpand}
          className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5
                     bg-white/90 backdrop-blur-sm border border-gray-200
                     text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-full
                     shadow-sm hover:bg-white active:scale-95 transition-all"
        >
          <Maximize2 size={12} />
          Full map
        </button>
      )}

      <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-sm border border-gray-100
                      text-xs font-bold text-gray-700 px-2.5 py-1 rounded-full shadow-sm">
        {stops.length} stops
      </div>
    </div>
  );
}
