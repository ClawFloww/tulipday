"use client";

// Interactieve MapLibre-kaart voor routedetail:
// toont de routelijn, genummerde stops, locatiemarkers en huidige GPS-positie.
// Geëxtraheerd uit RouteDetailClient.tsx.

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { RouteStop } from "@/lib/types";

export type MapLocation = {
  id:                string;
  title:             string;
  category:          string;
  short_description: string | null;
  image_url:         string | null;
  slug:              string;
  address:           string | null;
  latitude:          number;
  longitude:         number;
};

export const CATEGORY_COLOR: Record<string, string> = {
  flower_field: "#E8102A",
  photo_spot:   "#8b5cf6",
  attraction:   "#f59e0b",
  food:         "#10b981",
  parking:      "#6b7280",
  bike_rental:  "#a855f7",
};

export const CATEGORY_LABEL: Record<string, string> = {
  flower_field: "Bollenveld",
  photo_spot:   "Fotoplek",
  attraction:   "Attractie",
  food:         "Eten & Drinken",
  parking:      "Parkeren",
  bike_rental:  "Fietsverhuur",
};

const MAP_STYLE = "https://api.maptiler.com/maps/streets-v2/style.json?key=SeaEiJkthxx3KNUCV0aI";

interface Props {
  points?:          [number, number][] | null;
  stops:            RouteStop[];
  routeType?:       string | null;
  locations:        MapLocation[];
  onLocationSelect: (loc: MapLocation) => void;
}

export function RouteInteractiveMap({ points, stops, locations, onLocationSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);
  const onSelectRef  = useRef(onLocationSelect);
  useEffect(() => { onSelectRef.current = onLocationSelect; }, [onLocationSelect]);

  // Bouw [lng, lat]-coördinaten voor MapLibre (stops hebben voorrang)
  const routeCoords: [number, number][] =
    stops.length > 0
      ? stops
          .filter((s) => s.locations.latitude != null && s.locations.longitude != null)
          .map((s) => [s.locations.longitude as number, s.locations.latitude as number])
      : (points ?? []).map(([lat, lng]) => [lng, lat]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || routeCoords.length === 0) return;

    const map = new maplibregl.Map({
      container:   containerRef.current,
      style:       MAP_STYLE,
      center:      routeCoords[0],
      zoom:        12,
      interactive: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      // Routelijn
      if (routeCoords.length > 1) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type:     "Feature",
            geometry: { type: "LineString", coordinates: routeCoords },
            properties: {},
          },
        });
        map.addLayer({
          id: "route-casing", type: "line", source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint:  { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.85 },
        });
        map.addLayer({
          id: "route-line", type: "line", source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint:  { "line-color": "#E8102A", "line-width": 4 },
        });
      }

      // Markers: genummerde stops of alleen start/eind
      const markerDefs =
        stops.length > 0
          ? stops
              .filter((s) => s.locations.latitude)
              .map((s, i) => ({
                lngLat: [s.locations.longitude as number, s.locations.latitude as number] as [number, number],
                label:  String(i + 1),
                color:  i === 0 ? "#2D7D46" : i === stops.length - 1 ? "#E8102A" : "#E8527A",
              }))
          : routeCoords.length > 1
          ? [
              { lngLat: routeCoords[0],                      label: "S", color: "#2D7D46" },
              { lngLat: routeCoords[routeCoords.length - 1], label: "E", color: "#E8102A" },
            ]
          : [];

      markerDefs.forEach(({ lngLat, label, color }) => {
        const el = document.createElement("div");
        el.style.cssText = [
          "width:28px", "height:28px", "border-radius:50%",
          `background:${color}`, "color:white", "font-size:11px", "font-weight:800",
          "display:flex", "align-items:center", "justify-content:center",
          "border:2.5px solid white", "box-shadow:0 2px 8px rgba(0,0,0,.35)",
          "font-family:system-ui,sans-serif",
        ].join(";");
        el.textContent = label;
        new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
      });

      // Locatiemarkers (aangeleverd via prop)
      locations.forEach((loc) => {
        if (!loc.latitude || !loc.longitude) return;
        const color = CATEGORY_COLOR[loc.category] ?? "#6b7280";
        const el    = document.createElement("div");
        el.style.cssText = [
          "width:18px", "height:18px", "border-radius:50%",
          `background:${color}`, "border:2.5px solid white",
          "box-shadow:0 1px 6px rgba(0,0,0,.4)", "cursor:pointer",
          "transition:transform 0.15s", "pointer-events:auto",
          "position:relative", "z-index:1",
        ].join(";");
        el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.5)"; });
        el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
        // Gebruik pointerdown i.p.v. click — werkt betrouwbaarder in MapLibre op desktop
        el.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
          onSelectRef.current(loc);
        });
        new maplibregl.Marker({ element: el })
          .setLngLat([loc.longitude, loc.latitude])
          .addTo(map);
      });

      // Pas bounds aan op de route
      if (routeCoords.length > 1) {
        const bounds = routeCoords.reduce(
          (b, c) => b.extend(c),
          new maplibregl.LngLatBounds(routeCoords[0], routeCoords[0]),
        );
        map.fitBounds(bounds, { padding: 52, maxZoom: 14, duration: 600 });
      }
    });

    // Huidige locatie als blauwe stip
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mapRef.current) return;
          const el = document.createElement("div");
          el.style.cssText = [
            "width:16px", "height:16px", "border-radius:50%",
            "background:#2563eb", "border:3px solid white",
            "box-shadow:0 0 0 4px rgba(37,99,235,0.25)",
          ].join(";");
          new maplibregl.Marker({ element: el })
            .setLngLat([pos.coords.longitude, pos.coords.latitude])
            .addTo(mapRef.current);
        },
        undefined,
        { timeout: 8000, maximumAge: 60000 },
      );
    }

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (routeCoords.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden w-full"
      style={{ height: 300 }}
    />
  );
}
