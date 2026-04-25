"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2, MapPin, Share2, BookmarkPlus, Check, ArrowLeft } from "lucide-react";
import { getSharedRoute, type SharedRoute } from "@/lib/sharedRoutes";
import { saveCustomRoute, getCustomRoutes } from "@/lib/customRoutes";

const MAP_STYLE = "https://api.maptiler.com/maps/streets-v2/style.json?key=SeaEiJkthxx3KNUCV0aI";

function fmtDur(sec: number) {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}u` : `${h}u ${m}m`;
}
function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export default function SharedRoutePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const router      = useRouter();

  const [route,    setRoute]   = useState<SharedRoute | null>(null);
  const [loading,  setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved,    setSaved]   = useState(false);
  const [copied,   setCopied]  = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<maplibregl.Map | null>(null);

  // Fetch shared route
  useEffect(() => {
    if (!shareId) return;
    getSharedRoute(shareId).then((data) => {
      if (!data) setNotFound(true);
      else setRoute(data);
      setLoading(false);
    });
  }, [shareId]);

  // Check of al opgeslagen
  useEffect(() => {
    if (!route) return;
    const existing = getCustomRoutes().find((r) => r.shareId === route.share_id);
    if (existing) setSaved(true);
  }, [route]);

  // Initialiseer kaart
  useEffect(() => {
    if (!route || !mapContainerRef.current || mapRef.current) return;
    const waypoints = route.waypoints as [number, number][];
    if (waypoints.length === 0) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style:     MAP_STYLE,
      center:    waypoints[0],
      zoom:      12,
      interactive: true,
    });

    map.on("load", () => {
      // Waypoint markers
      waypoints.forEach(([lng, lat], i) => {
        const el = document.createElement("div");
        el.style.cssText = [
          "width:28px", "height:28px", "border-radius:50%",
          "background:#E8102A", "color:white", "font-size:12px", "font-weight:800",
          "display:flex", "align-items:center", "justify-content:center",
          "border:2.5px solid white", "box-shadow:0 2px 8px rgba(0,0,0,.3)",
          "font-family:system-ui,sans-serif",
        ].join(";");
        el.textContent = String(i + 1);
        new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      });

      // Lijn tussen punten
      if (waypoints.length > 1) {
        map.addSource("route-line", {
          type: "geojson",
          data: { type: "Feature", geometry: { type: "LineString", coordinates: waypoints }, properties: {} },
        });
        map.addLayer({ id: "route-casing", type: "line", source: "route-line",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.8 } });
        map.addLayer({ id: "route-line", type: "line", source: "route-line",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#E8102A", "line-width": 4, "line-opacity": 0.9 } });
      }

      // Fit bounds
      const bounds = waypoints.reduce(
        (b, p) => b.extend(p as [number, number]),
        new maplibregl.LngLatBounds(waypoints[0], waypoints[0])
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [route]);

  async function handleShare() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: route?.name ?? "TulipDay Route", url }); return; } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSave() {
    if (!route || saved) return;
    saveCustomRoute({
      name:      route.name,
      waypoints: route.waypoints as [number, number][],
      cycling:   route.cycling,
      walking:   route.walking,
      driving:   route.driving,
      shareId:   route.share_id,
    });
    setSaved(true);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <Loader2 size={32} className="text-tulip-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !route) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="text-5xl">🗺️</span>
        <h1 className="text-xl font-extrabold text-gray-900">Route niet gevonden</h1>
        <p className="text-sm text-gray-500">Deze link is verlopen of ongeldig.</p>
        <button onClick={() => router.push("/")} className="px-5 py-2.5 bg-tulip-500 text-white rounded-xl text-sm font-bold">
          Naar TulipDay
        </button>
      </div>
    );
  }

  const waypoints = route.waypoints as [number, number][];
  const date = new Date(route.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-gray-900 truncate">{route.name}</p>
            <p className="text-[11px] text-gray-400">{waypoints.length} punt{waypoints.length !== 1 ? "en" : ""} · {date}</p>
          </div>
          <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            {copied ? <Check size={13} className="text-green-600" /> : <Share2 size={13} />}
            {copied ? "Gekopieerd" : "Deel"}
          </button>
        </div>
      </div>

      {/* Kaart */}
      <div ref={mapContainerRef} className="w-full" style={{ height: "55vmax", maxHeight: "420px" }} />

      {/* Info */}
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Reisinformatie */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Reisinformatie</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {([
              { emoji: "🚶", label: "Wandelen", data: route.walking },
              { emoji: "🚴", label: "Fietsen",  data: route.cycling },
              { emoji: "🚗", label: "Rijden",   data: route.driving },
            ] as const).map(({ emoji, label, data }) => (
              <div key={label} className="px-3 py-4 text-center">
                <p className="text-xl mb-1">{emoji}</p>
                <p className="text-[11px] text-gray-400 font-medium">{label}</p>
                {data ? (
                  <>
                    <p className="text-sm font-extrabold text-gray-900 mt-0.5">{fmtDur(data.duration)}</p>
                    <p className="text-[11px] text-gray-400">{fmtDist(data.distance)}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-300 mt-0.5">—</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Waypoints */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Punten</p>
          </div>
          <div className="divide-y divide-gray-50">
            {waypoints.map(([lng, lat], i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="w-6 h-6 rounded-full bg-tulip-500 text-white text-xs font-extrabold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-xs text-gray-500 font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Acties */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-sm transition-all
                       disabled:opacity-60"
            style={saved
              ? { backgroundColor: "#d1fae5", color: "#065f46" }
              : { backgroundColor: "#E8102A", color: "white" }}
          >
            {saved ? <Check size={15} /> : <BookmarkPlus size={15} />}
            {saved ? "Opgeslagen!" : "Sla op op mijn apparaat"}
          </button>
          <button
            onClick={() => router.push("/map")}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
          >
            <MapPin size={15} />
            Kaart
          </button>
        </div>

        {/* TulipDay branding */}
        <p className="text-center text-xs text-gray-300 pb-4">
          Gedeeld via <span className="font-bold text-tulip-400">TulipDay</span> 🌷
        </p>
      </div>
    </div>
  );
}
