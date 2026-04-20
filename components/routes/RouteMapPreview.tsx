"use client";

// SVG-kaartpreview van een gegenereerde fietsroute
// Geen externe dependencies — pure SVG-projectie van GeoJSON coördinaten

import { useMemo } from "react";
import type { GeneratedRoute } from "@/lib/routeGenerator";
import type { FieldBloomStatus } from "@/lib/tulipFields";

const SVG_W = 340;
const SVG_H = 200;
const PADDING = 20;
const ROUTE_SAMPLE = 4; // neem elke Nth routepunt voor lichtere SVG

interface Props {
  route: GeneratedRoute;
  statuses?: FieldBloomStatus[];
  className?: string;
}

// Project geografische coördinaten naar SVG-coördinaten
function projectCoords(
  coords: [number, number][], // [lng, lat]
  w: number,
  h: number,
  pad: number,
): { x: number; y: number }[] {
  if (coords.length === 0) return [];

  const lngs = coords.map((c) => c[0]);
  const lats  = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat  = Math.min(...lats),  maxLat  = Math.max(...lats);

  const lngSpan = maxLng - minLng || 0.001;
  const latSpan  = maxLat - minLat   || 0.001;
  const innerW = w - 2 * pad;
  const innerH = h - 2 * pad;
  const scale = Math.min(innerW / lngSpan, innerH / latSpan);
  const offX = pad + (innerW - lngSpan * scale) / 2;
  const offY = pad + (innerH - latSpan * scale) / 2;

  return coords.map(([lng, lat]) => ({
    x: offX + (lng - minLng) * scale,
    // Y-as omgekeerd: hogere latitude = hoger op het scherm
    y: h - offY - (lat - minLat) * scale,
  }));
}

export default function RouteMapPreview({ route, statuses = [], className = "" }: Props) {
  const { routePoints, fieldPoints } = useMemo(() => {
    // Sample de routegeometrie voor een lichte SVG
    const geoCords = route.geometry.coordinates.filter((_, i) => i % ROUTE_SAMPLE === 0);

    // Voeg ook veldcoördinaten toe zodat de bounding box de velden omvat
    const fieldCoords: [number, number][] = route.fields.map((f) => [f.lng, f.lat]);
    const allCoords: [number, number][] = [...geoCords, ...fieldCoords];

    if (allCoords.length === 0) return { routePoints: [], fieldPoints: [] };

    const projected = projectCoords(allCoords, SVG_W, SVG_H, PADDING);

    const routePoints = projected.slice(0, geoCords.length);
    const fieldPoints = projected.slice(geoCords.length).map((pt, i) => ({
      ...pt,
      fieldId: route.fields[i].id,
    }));

    return { routePoints, fieldPoints };
  }, [route]);

  // Controleer welke velden in bloei zijn
  const bloomingIds = useMemo(() => {
    const inBloom = new Set<string>();
    for (const s of statuses) {
      if (s.status === "in_bloom" && route.fields.some((f) => f.id === s.fieldId)) {
        inBloom.add(s.fieldId);
      }
    }
    return inBloom;
  }, [statuses, route.fields]);

  const polyline = routePoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      className={`rounded-2xl overflow-hidden bg-[#F0F4EC] ${className}`}
      style={{ width: SVG_W, height: SVG_H }}
      aria-label={`Kaartpreview van route ${route.name}`}
    >
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        aria-hidden="true"
      >
        {/* Achtergrondkleur */}
        <rect width={SVG_W} height={SVG_H} fill="#EEF2E8" />

        {/* Routelijn — schaduw */}
        {polyline && (
          <polyline
            points={polyline}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.6}
          />
        )}

        {/* Routelijn — kleur */}
        {polyline && (
          <polyline
            points={polyline}
            fill="none"
            stroke="#E8527A"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Bollenveld markers */}
        {fieldPoints.map((pt) => {
          const inBloom = bloomingIds.has(pt.fieldId);
          return (
            <g key={pt.fieldId}>
              {/* Witte halo */}
              <circle cx={pt.x} cy={pt.y} r={inBloom ? 7 : 5} fill="white" />
              {/* Marker */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={inBloom ? 5 : 3.5}
                fill={inBloom ? "#E8527A" : "#8C8C8C"}
              />
            </g>
          );
        })}

        {/* Startpunt marker */}
        {routePoints[0] && (
          <g>
            <circle cx={routePoints[0].x} cy={routePoints[0].y} r={9} fill="white" />
            <circle cx={routePoints[0].x} cy={routePoints[0].y} r={6} fill="#2D7D46" />
            <circle cx={routePoints[0].x} cy={routePoints[0].y} r={2.5} fill="white" />
          </g>
        )}
      </svg>
    </div>
  );
}
