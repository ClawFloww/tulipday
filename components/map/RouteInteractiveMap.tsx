"use client";

// Interactieve MapLibre-kaart voor routedetail:
// toont de routelijn, genummerde stops, locatiemarkers en huidige GPS-positie.
// Geëxtraheerd uit RouteDetailClient.tsx.

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { addMapIcons, CATEGORY_COLOR } from "@/lib/mapIcons";
import { addRouteLayers, setRouteLines } from "@/lib/mapLayers";
import { MAP_STYLE, tintMap } from "@/lib/mapStyle";
import type { Category, RouteStop } from "@/lib/types";

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
  bloom_status?:     string | null;
};

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

  // Bouw [lng, lat]-coördinaten voor MapLibre. De echte routegeometrie heeft
  // voorrang; alleen zonder geometrie rechte lijnen tussen de stops.
  const routeCoords: [number, number][] =
    points && points.length > 1
      ? points.map(([lat, lng]) => [lng, lat])
      : stops
          .filter((s) => s.locations.latitude != null && s.locations.longitude != null)
          .map((s) => [s.locations.longitude as number, s.locations.latitude as number]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || routeCoords.length === 0) return;

    const map = new maplibregl.Map({
      container:   containerRef.current,
      style:       MAP_STYLE,
      center:      routeCoords[0],
      zoom:        12,
      interactive: true,
    });

    tintMap(map);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      // Routelijn met rand, richtingspijlen en start/finish
      if (routeCoords.length > 1) {
        addRouteLayers(map, "route");
        setRouteLines(map, "route", [{ id: "route", coords: routeCoords, selected: true }]);
        addMapIcons(map).catch((err) => console.error("Kaarticonen laden mislukt", err));
      }

      // Genummerde stops
      const markerDefs = stops
        .filter((s) => s.locations.latitude)
        .map((s, i) => ({
          lngLat: [s.locations.longitude as number, s.locations.latitude as number] as [number, number],
          label:  String(i + 1),
          color:  "#E8102A",
        }));

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

      // Locatiemarkers — gekleurde stippen, afbeelding verschijnt bij aantikken (bottom sheet)
      locations.forEach((loc) => {
        if (!loc.latitude || !loc.longitude) return;
        const color = CATEGORY_COLOR[loc.category as Category] ?? CATEGORY_COLOR.parking;

        // Marker-element: gekleurde stip — afbeelding verschijnt alleen bij aantikken
        const el = document.createElement("div");
        el.style.cssText = [
          "width:22px", "height:22px", "border-radius:50%",
          `background:${color}`, "border:2.5px solid white",
          "box-shadow:0 1px 6px rgba(0,0,0,.4)", "cursor:pointer",
          "transition:transform 0.15s", "pointer-events:auto",
        ].join(";");

        el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.2)"; });
        el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
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
