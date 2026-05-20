"use client";

// Fullscreen-overlay waarop de gebruiker een startpunt voor de route kan
// kiezen door op de kaart te tappen. Toont de complete route in rood en de
// stops als markers ter referentie. Tap op de kaart → marker, "Bevestig"
// in de footer → callback met [lng, lat].

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { motion } from "framer-motion";
import { Check, X, MapPin } from "lucide-react";
import { useT } from "@/lib/i18n-context";

import type { NavStop } from "./NavigationView";

const MAP_STYLE = "https://api.maptiler.com/maps/streets-v2/style.json?key=SeaEiJkthxx3KNUCV0aI";

interface Props {
  routeName:        string;
  routeGeometry:    [number, number][]; // [lng, lat]
  stops:            NavStop[];
  initialUserPos:   [number, number] | null; // [lat, lng]
  onConfirm:        (lngLat: [number, number]) => void;
  onCancel:         () => void;
}

export default function StartPointPicker({
  routeName, routeGeometry, stops, initialUserPos, onConfirm, onCancel,
}: Props) {
  const { t }            = useT();
  const containerRef     = useRef<HTMLDivElement>(null);
  const mapRef           = useRef<maplibregl.Map | null>(null);
  const pickedMarkerRef  = useRef<maplibregl.Marker | null>(null);
  const initDone         = useRef(false);
  const [picked, setPicked] = useState<[number, number] | null>(null);

  // ── Initialiseer kaart één keer ────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!containerRef.current || initDone.current) return;
    initDone.current = true;

    // Centreer op user-positie of fallback op eerste stop
    const center: [number, number] = initialUserPos
      ? [initialUserPos[1], initialUserPos[0]]
      : stops[0]
        ? [stops[0].lng, stops[0].lat]
        : [4.46, 52.24];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     MAP_STYLE,
      center,
      zoom:      13,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      // Route-lijn in rood ter referentie
      if (routeGeometry.length >= 2) {
        map.addSource("picker-route", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "LineString", coordinates: routeGeometry }, properties: {} },
        });
        map.addLayer({
          id: "picker-route-line", type: "line", source: "picker-route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint:  { "line-color": "#E8102A", "line-width": 5, "line-opacity": 0.7 },
        });
      }

      // Stop-markers (alleen visueel, niet tappable)
      stops.forEach((stop, idx) => {
        const el = document.createElement("div");
        el.style.cssText = [
          "width:24px", "height:24px", "border-radius:50%",
          idx === 0 ? "background:#E8102A" : "background:#9CA3AF",
          "border:3px solid white",
          "display:flex", "align-items:center", "justify-content:center",
          "color:white", "font-weight:800", "font-size:11px",
          "box-shadow:0 2px 6px rgba(0,0,0,0.3)",
          "pointer-events:none",
        ].join(";");
        el.textContent = String(idx + 1);
        new maplibregl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .addTo(map);
      });

      // Fit op route bounds
      if (routeGeometry.length >= 2) {
        const lngs = routeGeometry.map((p) => p[0]);
        const lats = routeGeometry.map((p) => p[1]);
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ];
        map.fitBounds(bounds, { padding: { top: 80, bottom: 120, left: 40, right: 40 }, duration: 0 });
      }
    });

    // Tap op kaart → marker plaatsen
    map.on("click", (e) => {
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setPicked(lngLat);

      if (pickedMarkerRef.current) {
        pickedMarkerRef.current.setLngLat(lngLat);
      } else {
        const el = document.createElement("div");
        el.style.cssText = [
          "width:34px", "height:42px",
          "background-image:url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"%23E8102A\" stroke=\"white\" stroke-width=\"1.5\"><path d=\"M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z\"/><circle cx=\"12\" cy=\"9\" r=\"2.5\" fill=\"white\"/></svg>')",
          "background-size:contain",
          "background-repeat:no-repeat",
          "filter:drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
        ].join(";");
        pickedMarkerRef.current = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat(lngLat)
          .addTo(map);
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      pickedMarkerRef.current = null;
      initDone.current = false;
    };
    // Kaart initialiseert één keer; route/stops worden direct erbij gezet en
    // veranderen niet meer tijdens de picker-sessie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {/* Top instructie */}
      <div
        className="absolute top-0 left-0 right-0 z-10 px-3"
        style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
      >
        <div
          className="rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
        >
          <div className="w-9 h-9 rounded-full bg-tulip-500/15 flex items-center justify-center flex-shrink-0">
            <MapPin size={18} className="text-tulip-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold leading-tight" style={{ color: "var(--color-text)" }}>
              {t("navigation.pick_start_title")}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-3)" }}>
              {routeName}
            </p>
          </div>
        </div>
        <p className="text-center text-xs mt-2 px-4 font-semibold" style={{ color: "var(--color-text-2)" }}>
          {t("navigation.pick_start_hint")}
        </p>
      </div>

      {/* Kaart */}
      <div ref={containerRef} className="flex-1 w-full" />

      {/* Footer met Annuleer / Bevestig */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-3 pt-3 flex gap-2"
        style={{
          backgroundColor: "var(--color-surface-2)",
          borderTop: "1px solid var(--color-border)",
          paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-bold active:scale-95 transition-transform"
          style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text)" }}
        >
          <X size={14} />
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={() => picked && onConfirm(picked)}
          disabled={!picked}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-tulip-500 text-white text-sm font-bold active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
          style={{ boxShadow: picked ? "0 4px 12px rgba(232,16,42,0.35)" : "none" }}
        >
          <Check size={14} />
          {t("navigation.pick_start_confirm")}
        </button>
      </div>
    </motion.div>
  );
}
