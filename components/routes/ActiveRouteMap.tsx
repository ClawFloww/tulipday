"use client";

// Responsieve SVG-kaart voor het actieve route scherm
// Genummerde stops, bezochtmarkering, actieve stop gemarkeerd

import { useMemo } from "react";
import type { GeneratedRoute } from "@/lib/routeGenerator";

const SVG_W   = 340;
const SVG_H   = 220;
const PADDING = 24;
const SAMPLE  = 3;

interface Props {
  route:      GeneratedRoute;
  activeIdx:  number;
  visitedIds: Set<number>;
  className?: string;
  height?:    number;
}

function project(coords: [number, number][], w: number, h: number, pad: number) {
  const lngs = coords.map((c) => c[0]);
  const lats  = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat  = Math.min(...lats),  maxLat  = Math.max(...lats);
  const lngSpan = maxLng - minLng || 0.001;
  const latSpan  = maxLat  - minLat  || 0.001;
  const innerW = w - 2 * pad, innerH = h - 2 * pad;
  const scale  = Math.min(innerW / lngSpan, innerH / latSpan);
  const offX   = pad + (innerW - lngSpan * scale) / 2;
  const offY   = pad + (innerH - latSpan * scale) / 2;
  return coords.map(([lng, lat]) => ({
    x: offX + (lng - minLng) * scale,
    y: h - offY - (lat - minLat) * scale,
  }));
}

export default function ActiveRouteMap({
  route, activeIdx, visitedIds, className = "", height = 220,
}: Props) {
  const { routePts, fieldPts } = useMemo(() => {
    const geo  = route.geometry.coordinates.filter((_, i) => i % SAMPLE === 0);
    const fld: [number, number][] = route.fields.map((f) => [f.lng, f.lat]);
    const all  = [...geo, ...fld];
    if (all.length === 0) return { routePts: [], fieldPts: [] };
    const proj = project(all, SVG_W, SVG_H, PADDING);
    return { routePts: proj.slice(0, geo.length), fieldPts: proj.slice(geo.length) };
  }, [route]);

  const poly = routePts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={`overflow-hidden bg-[#EEF2E8] ${className}`} style={{ height }}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" height="100%"
           preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <rect width={SVG_W} height={SVG_H} fill="#EEF2E8" />

        {/* Route schaduw */}
        {poly && <polyline points={poly} fill="none" stroke="white"
                           strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />}
        {/* Route lijn */}
        {poly && <polyline points={poly} fill="none" stroke="#E8527A"
                           strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}

        {/* Bollenveld-markers */}
        {fieldPts.map((pt, idx) => {
          const isVisited = visitedIds.has(idx);
          const isActive  = idx === activeIdx;
          const fill  = isVisited ? "#2D7D46" : isActive ? "#E8527A" : "#9CA3AF";
          const r     = isActive ? 13 : 10;
          return (
            <g key={route.fields[idx].id}>
              <circle cx={pt.x} cy={pt.y} r={r + 3} fill="white" />
              <circle cx={pt.x} cy={pt.y} r={r}     fill={fill} />
              {isVisited ? (
                <path
                  d={`M${pt.x - 3.5},${pt.y + 0.5} l2.8,2.8 l5,-5.5`}
                  stroke="white" strokeWidth={2} strokeLinecap="round"
                  strokeLinejoin="round" fill="none"
                />
              ) : (
                <text x={pt.x} y={pt.y + 0.5} textAnchor="middle"
                      dominantBaseline="middle" fill="white"
                      fontSize={isActive ? 9 : 8} fontWeight="bold">
                  {idx + 1}
                </text>
              )}
            </g>
          );
        })}

        {/* Startpunt (groen bolletje) */}
        {routePts[0] && (
          <g>
            <circle cx={routePts[0].x} cy={routePts[0].y} r={9}   fill="white" />
            <circle cx={routePts[0].x} cy={routePts[0].y} r={6}   fill="#2D7D46" />
            <circle cx={routePts[0].x} cy={routePts[0].y} r={2.5} fill="white" />
          </g>
        )}
      </svg>
    </div>
  );
}
