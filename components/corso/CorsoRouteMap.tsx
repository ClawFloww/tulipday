"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CORSO_STOPS, LICHTJES_CORSO, CorsoStopData, StopStatus,
  getStopStatuses, getCorsoPhase, msUntilCorso, getCorsoDate,
} from "@/lib/corsoData";
import { X, Star } from "lucide-react";

// ─── Color palette ─────────────────────────────────────────────────────────

const STATUS_COLOR: Record<StopStatus, string> = {
  passed:     "#22c55e",   // green
  current:    "#f97316",   // orange
  upcoming:   "#9ca3af",   // gray
  future_day: "#9ca3af",
};

const LICHTJES_COLOR = "#eab308"; // amber/gold

// ─── Countdown component ───────────────────────────────────────────────────

function Countdown({ targetMs }: { targetMs: number }) {
  const [ms, setMs] = useState(targetMs);
  useEffect(() => {
    const id = setInterval(() => setMs((prev) => Math.max(0, prev - 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const totalS = Math.floor(ms / 1000);
  const d = Math.floor(totalS / 86400);
  const h = Math.floor((totalS % 86400) / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;

  if (d > 0) return <span>{d}d {h}u {String(m).padStart(2, "0")}m</span>;
  return <span>{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
}

// ─── Header banner ─────────────────────────────────────────────────────────

function CorsoHeader() {
  const now = new Date();
  const year = now.getFullYear();
  const corsoDate = getCorsoDate(year);
  const dateStr = corsoDate.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const phase = getCorsoPhase(now);
  const remaining = msUntilCorso(now);

  return (
    <div className={`px-4 py-3 flex items-center justify-between gap-2
      ${phase === "live"
        ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white"
        : "bg-white border-b border-gray-100"}`}
    >
      <div>
        <p className={`text-xs font-semibold uppercase tracking-widest ${phase === "live" ? "text-white/70" : "text-gray-400"}`}>
          Bloemencorso Bollenstreek
        </p>
        <p className={`text-sm font-extrabold ${phase === "live" ? "text-white" : "text-gray-800"}`}>
          {phase === "live"      && "🌷 Corso rijdt nu!"}
          {phase === "ended"     && `✅ Corso ${year} afgelopen`}
          {phase === "before"    && dateStr}
          {phase === "today_countdown" && `🌸 Start vandaag om 09:00`}
        </p>
      </div>

      {(phase === "before" || phase === "today_countdown") && remaining > 0 && (
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-400 font-medium">Nog</p>
          <p className="text-sm font-extrabold text-rose-500 tabular-nums">
            <Countdown targetMs={remaining} />
          </p>
        </div>
      )}

      {phase === "live" && (
        <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold animate-pulse">
          LIVE
        </span>
      )}
    </div>
  );
}

// ─── Bottom sheet ──────────────────────────────────────────────────────────

interface SheetStop extends CorsoStopData { status: StopStatus }

function StopSheet({ stop, onClose }: { stop: SheetStop; onClose: () => void }) {
  const color = STATUS_COLOR[stop.status];
  const statusLabel =
    stop.status === "passed"     ? "Gepasseerd ✓" :
    stop.status === "current"    ? "Corso hier nu 🌷" :
    stop.status === "future_day" ? `Aankomsttijd` :
                                    "Aankomsttijd";

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20 p-5 pb-8">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {stop.id}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900">{stop.plaats}</h3>
            <p className="text-xs text-gray-400">{statusLabel}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400">
          <X size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>
          🕐 {stop.tijd}
        </span>
        {stop.tribune && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
            🎪 Tribune
          </span>
        )}
        {stop.pauze && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
            ⏸ Pauze
          </span>
        )}
      </div>

      {stop.info && (
        <p className="text-sm text-gray-600 leading-relaxed">{stop.info}</p>
      )}
    </div>
  );
}

function LichtjesSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20 p-5 pb-8">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-extrabold bg-amber-400 flex-shrink-0">
            <Star size={18} fill="white" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-gray-900">{LICHTJES_CORSO.plaats}</h3>
            <p className="text-xs text-amber-600 font-semibold">Lichtjescorso — vrijdagavond</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400"><X size={18} /></button>
      </div>
      <div className="mb-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
          🌟 {LICHTJES_CORSO.tijd} uur
        </span>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{LICHTJES_CORSO.info}</p>
    </div>
  );
}

// ─── Main map component ────────────────────────────────────────────────────

type ActiveSheet =
  | { type: "stop"; stop: SheetStop }
  | { type: "lichtjes" }
  | null;

export function CorsoRouteMap() {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapInst    = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const lichtjesMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [sheet, setSheet]         = useState<ActiveSheet>(null);
  const [statuses, setStatuses]   = useState<StopStatus[]>(() => getStopStatuses(new Date()));

  // Refresh statuses every minute
  useEffect(() => {
    const id = setInterval(() => setStatuses(getStopStatuses(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [4.530, 52.310],
      zoom: 9.5,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapInst.current = map;
    return () => { map.remove(); mapInst.current = null; };
  }, []);

  const buildMarkers = useCallback(() => {
    const map = mapInst.current;
    if (!map || !map.isStyleLoaded()) return;

    // ── Route line ────────────────────────────────────────────────────
    const coords = CORSO_STOPS.map((s) => [s.lng, s.lat]);
    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    };

    if (map.getSource("route")) {
      (map.getSource("route") as maplibregl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource("route", { type: "geojson", data: geojson });
      map.addLayer({ id: "route-line", type: "line", source: "route",
        paint: { "line-color": "#f43f5e", "line-width": 3, "line-opacity": 0.6, "line-dasharray": [2, 1.5] },
      });
    }

    // ── Clear old markers ─────────────────────────────────────────────
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // ── Stop markers ──────────────────────────────────────────────────
    CORSO_STOPS.forEach((stop, i) => {
      const status = statuses[i];
      const color  = STATUS_COLOR[status];

      const el = document.createElement("div");
      el.style.cssText = `
        width:34px; height:34px; border-radius:50%;
        background:${color}; border:2.5px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
        display:flex; align-items:center; justify-content:center;
        font-size:12px; font-weight:800; color:white;
        cursor:pointer; transition:transform 0.15s;
        font-family:system-ui,sans-serif;
      `;
      el.textContent = String(stop.id);

      if (stop.tribune) {
        const badge = document.createElement("div");
        badge.style.cssText = `
          position:absolute; top:-4px; right:-4px;
          width:14px; height:14px; border-radius:50%;
          background:#a855f7; border:1.5px solid white;
          display:flex; align-items:center; justify-content:center;
          font-size:8px;
        `;
        badge.textContent = "🎪";
        el.style.position = "relative";
        el.appendChild(badge);
      }

      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.2)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
      el.addEventListener("click", () => {
        setSheet({ type: "stop", stop: { ...stop, status } });
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.lng, stop.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });

    // ── Lichtjes marker ───────────────────────────────────────────────
    lichtjesMarkerRef.current?.remove();
    const lEl = document.createElement("div");
    lEl.style.cssText = `
      width:34px; height:34px; border-radius:50%;
      background:${LICHTJES_COLOR}; border:2.5px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      display:flex; align-items:center; justify-content:center;
      font-size:16px; cursor:pointer; transition:transform 0.15s;
    `;
    lEl.textContent = "🌟";
    lEl.addEventListener("mouseenter", () => { lEl.style.transform = "scale(1.2)"; });
    lEl.addEventListener("mouseleave", () => { lEl.style.transform = "scale(1)"; });
    lEl.addEventListener("click", () => setSheet({ type: "lichtjes" }));

    lichtjesMarkerRef.current = new maplibregl.Marker({ element: lEl })
      .setLngLat([LICHTJES_CORSO.lng, LICHTJES_CORSO.lat])
      .addTo(map);
  }, [statuses]);

  // Re-build markers when statuses change or map loads
  useEffect(() => {
    const map = mapInst.current;
    if (!map) return;
    if (map.isStyleLoaded()) {
      buildMarkers();
    } else {
      map.once("load", buildMarkers);
    }
  }, [buildMarkers]);

  return (
    <div className="relative w-full flex flex-col" style={{ height: "calc(100dvh - 190px)" }}>
      {/* Status header */}
      <CorsoHeader />

      {/* Legend */}
      <div className="absolute top-16 left-3 z-10 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm space-y-1.5">
        {[
          { color: STATUS_COLOR.passed,  label: "Gepasseerd" },
          { color: STATUS_COLOR.current, label: "Nu hier"    },
          { color: STATUS_COLOR.upcoming,label: "Nog komen"  },
          { color: LICHTJES_COLOR,       label: "Lichtjes"   },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-[11px] text-gray-600 font-medium">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]">🎪</span>
          <span className="text-[11px] text-gray-600 font-medium">Tribune</span>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1 w-full" />

      {/* Bottom sheet */}
      {sheet?.type === "stop"    && <StopSheet stop={sheet.stop} onClose={() => setSheet(null)} />}
      {sheet?.type === "lichtjes" && <LichtjesSheet onClose={() => setSheet(null)} />}
    </div>
  );
}
