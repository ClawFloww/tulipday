"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CORSO_STOPS, LICHTJES_CORSO, CorsoStopData, StopStatus,
  getStopStatuses, getCorsoPhase, msUntilCorso, getCorsoDate,
} from "@/lib/corsoData";
import { Clock, X, Star } from "lucide-react";

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
        ? "bg-corso text-white"
        : "bg-surface-2 border-b border-line"}`}
    >
      <div>
        <p className={`text-xs font-semibold uppercase tracking-widest ${phase === "live" ? "text-white/70" : "text-ink-3"}`}>
          Bloemencorso Bollenstreek
        </p>
        <p className={`text-sm font-extrabold ${phase === "live" ? "text-white" : "text-ink"}`}>
          {phase === "live"      && "Corso rijdt nu!"}
          {phase === "ended"     && `Corso ${year} afgelopen`}
          {phase === "before"    && dateStr}
          {phase === "today_countdown" && "Start vandaag om 09:00"}
        </p>
      </div>

      {(phase === "before" || phase === "today_countdown") && remaining > 0 && (
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-ink-3 font-medium">Nog</p>
          <p className="text-sm font-extrabold text-corso tabular-nums">
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
    stop.status === "passed"     ? "Gepasseerd" :
    stop.status === "current"    ? "Corso is hier nu" :
    stop.status === "future_day" ? `Aankomsttijd` :
                                    "Aankomsttijd";

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface-2 rounded-t-3xl shadow-2xl z-20 p-5 pb-8">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {stop.id}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-ink">{stop.plaats}</h3>
            <p className="text-xs text-ink-3">{statusLabel}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Sluiten" className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-3">
          <X size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }}>
          <Clock size={12} className="mr-1 inline" aria-hidden />{stop.tijd}
        </span>
        {stop.tribune && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-3 text-ink-2">
            Tribune
          </span>
        )}
        {stop.pauze && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-3 text-ink-2">
            Pauze
          </span>
        )}
      </div>

      {stop.info && (
        <p className="text-sm text-ink-2 leading-relaxed">{stop.info}</p>
      )}
    </div>
  );
}

function LichtjesSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-surface-2 rounded-t-3xl shadow-2xl z-20 p-5 pb-8">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-extrabold bg-warning flex-shrink-0">
            <Star size={18} fill="white" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-ink">{LICHTJES_CORSO.plaats}</h3>
            <p className="text-xs text-warning font-semibold">Lichtjescorso — vrijdagavond</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Sluiten" className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-3"><X size={18} /></button>
      </div>
      <div className="mb-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-3 text-ink-2">
          {LICHTJES_CORSO.tijd} uur
        </span>
      </div>
      <p className="text-sm text-ink-2 leading-relaxed">{LICHTJES_CORSO.info}</p>
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
        `;
        badge.setAttribute("aria-label", "Tribune");
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
    // Ster (lucide-vorm) in plaats van een emoji
    lEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
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
            <span className="text-[11px] text-ink-2 font-medium">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 flex-shrink-0 rounded-full border border-white" style={{ background: "#a855f7" }} aria-hidden />
          <span className="text-[11px] text-ink-2 font-medium">Tribune</span>
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
