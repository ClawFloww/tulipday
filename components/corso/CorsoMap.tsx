"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CORSO_ROUTE, CorsoStop } from "@/lib/corsoData";
import Image from "next/image";
import { X, MapPin } from "lucide-react";

interface CorsoPhoto {
  id: string;
  image_url: string;
  caption: string | null;
  stop_naam: string;
  created_at: string;
}

interface StopWithCount extends CorsoStop {
  count: number;
  recentPhotos: CorsoPhoto[];
}

export function CorsoMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [stops, setStops] = useState<StopWithCount[]>([]);
  const [activeStop, setActiveStop] = useState<StopWithCount | null>(null);

  // Fetch photo counts per stop
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/corso/photos", { cache: "no-store" });
      if (!res.ok) return;
      const photos: CorsoPhoto[] = await res.json();

      const stopsWithData: StopWithCount[] = CORSO_ROUTE.map((stop) => {
        const stopPhotos = photos.filter((p) => p.stop_naam === stop.name);
        return {
          ...stop,
          count: stopPhotos.length,
          recentPhotos: stopPhotos.slice(0, 2),
        };
      });
      setStops(stopsWithData);
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [4.5700, 52.3200],
      zoom: 10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    mapInstance.current = map;

    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  // Add markers once map + stops are ready
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || stops.length === 0) return;

    // Wait for map to be loaded
    function addMarkers() {
      if (!map) return;
      // Remove existing markers (simple approach: re-render)
      document.querySelectorAll(".corso-marker").forEach((el) => el.remove());

      // Draw route line
      if (map.getSource("corso-route")) {
        (map.getSource("corso-route") as maplibregl.GeoJSONSource).setData({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: CORSO_ROUTE.map((s) => [s.lng, s.lat]),
          },
          properties: {},
        });
      } else if (map.isStyleLoaded()) {
        map.addSource("corso-route", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: CORSO_ROUTE.map((s) => [s.lng, s.lat]),
            },
            properties: {},
          },
        });
        map.addLayer({
          id: "corso-route-line",
          type: "line",
          source: "corso-route",
          paint: {
            "line-color": "#f43f5e",
            "line-width": 3,
            "line-dasharray": [2, 1],
            "line-opacity": 0.7,
          },
        });
      }

      stops.forEach((stop) => {
        const el = document.createElement("div");
        el.className = "corso-marker";
        el.style.cssText = `
          position: relative;
          width: 36px; height: 36px;
          border-radius: 50%;
          background: ${stop.count > 0 ? "#f43f5e" : "#e5e7eb"};
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
          color: ${stop.count > 0 ? "white" : "#9ca3af"};
          transition: transform 0.15s;
        `;
        el.textContent = stop.count > 0 ? String(stop.count) : String(stop.order);
        el.title = stop.name;
        el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.15)"; });
        el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });
        el.addEventListener("click", () => {
          setActiveStop(stop);
        });

        new maplibregl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .addTo(map!);
      });
    }

    if (map.isStyleLoaded()) {
      addMarkers();
    } else {
      map.once("load", addMarkers);
    }
  }, [stops]);

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 220px)" }}>
      <div ref={mapRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
          Corso-route
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
          <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />
          Geen foto&apos;s
        </div>
      </div>

      {/* Bottom sheet */}
      {activeStop && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5 z-10">
          <button
            onClick={() => setActiveStop(null)}
            className="absolute top-4 right-4 p-1 text-gray-400"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-rose-500" />
            <h3 className="font-bold text-gray-800">{activeStop.name}</h3>
            <span className="text-xs text-gray-400 ml-auto">{activeStop.count} foto&apos;s</span>
          </div>

          {activeStop.recentPhotos.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Nog geen foto&apos;s voor deze stop</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {activeStop.recentPhotos.map((photo) => (
                <div key={photo.id} className="flex-shrink-0 w-32 rounded-xl overflow-hidden">
                  <div className="relative w-32 h-24">
                    <Image src={photo.image_url} alt={photo.caption ?? ""} fill className="object-cover" sizes="128px" />
                  </div>
                  {photo.caption && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2 px-1">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
