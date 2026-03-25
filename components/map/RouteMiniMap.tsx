"use client";

import { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Maximize2 } from "lucide-react";

export interface MiniMapStop {
  lat: number;
  lng: number;
  label: string; // stop number "1", "2", ...
}

interface Props {
  stops: MiniMapStop[];
  accentColor?: string; // polyline + pin colour
  onExpand?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAP_STYLES = [
  { featureType: "poi",     elementType: "labels",          stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels",          stylers: [{ visibility: "off" }] },
  { featureType: "road",    elementType: "geometry",        stylers: [{ color: "#f0f0f0" }] },
  { featureType: "road.highway", elementType: "geometry",   stylers: [{ color: "#e0e0e0" }] },
  { featureType: "water",   elementType: "geometry",        stylers: [{ color: "#d0eaf8" }] },
  { featureType: "landscape", elementType: "geometry",      stylers: [{ color: "#f8f8f3" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#e0e0e0" }] },
];

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

// ─── Component ────────────────────────────────────────────────────────────────

export function RouteMiniMap({ stops, accentColor = "#f43f5e", onExpand }: Props) {
  const divRef       = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!divRef.current || stops.length === 0) return;
    let cancelled = false;

    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!, v: "weekly" });

    importLibrary("maps").then(() => {
      if (cancelled || !divRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;

      const map = new g.maps.Map(divRef.current, {
        disableDefaultUI: true,
        gestureHandling: "none",
        keyboardShortcuts: false,
        clickableIcons: false,
        styles: MAP_STYLES,
        // centre / zoom will be overridden by fitBounds
        center: { lat: stops[0].lat, lng: stops[0].lng },
        zoom: 11,
      });

      mapRef.current = map;

      // ── Fit bounds ──
      const bounds = new g.maps.LatLngBounds();
      stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));

      // Add a bit of padding by expanding the bounds 10 %
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const latPad = (ne.lat() - sw.lat()) * 0.18;
      const lngPad = (ne.lng() - sw.lng()) * 0.18;
      const paddedBounds = new g.maps.LatLngBounds(
        { lat: sw.lat() - latPad, lng: sw.lng() - lngPad },
        { lat: ne.lat() + latPad, lng: ne.lng() + lngPad }
      );
      map.fitBounds(paddedBounds);

      // ── Polyline ──
      const path = stops.map((s) => ({ lat: s.lat, lng: s.lng }));
      new g.maps.Polyline({
        path,
        map,
        strokeColor:   accentColor,
        strokeOpacity: 0,
        strokeWeight:  3,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 0.85,
              strokeWeight:  3.5,
              scale: 4,
              strokeColor: accentColor,
            },
            offset: "0",
            repeat: "18px",
          },
        ],
      });

      // ── Numbered markers ──
      stops.forEach((stop, idx) => {
        new g.maps.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map,
          title: stop.label,
          icon: {
            url: createNumberedPin(String(idx + 1), accentColor),
            scaledSize: new g.maps.Size(30, 38),
            anchor: new g.maps.Point(15, 38),
          },
          optimized: false,
          zIndex: 10 + idx,
        });
      });

      setReady(true);
    });

    return () => { cancelled = true; };
  // Only run once when stops are available
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops.length > 0 ? "loaded" : "empty"]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ height: 220 }}>
      {/* Skeleton while loading */}
      {!ready && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center z-10">
          <span className="text-2xl opacity-30">🗺</span>
        </div>
      )}

      {/* Map div */}
      <div ref={divRef} className="w-full h-full" />

      {/* Expand button */}
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

      {/* Stop count badge */}
      <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-sm border border-gray-100
                      text-xs font-bold text-gray-700 px-2.5 py-1 rounded-full shadow-sm">
        {stops.length} stops
      </div>
    </div>
  );
}
