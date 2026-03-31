"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { supabase } from "@/lib/supabase";
import { Location, Category } from "@/lib/types";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { BottomNav } from "@/components/ui/BottomNav";
import { X, ChevronUp, MapPin, Locate } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { NL_CENTER as NL_CENTER_DEFAULT, NEARBY_DISTANCE_KM, EARTH_RADIUS_KM } from "@/lib/constants";
import { getCachedCoords, setCachedCoords } from "@/lib/geolocation";

// ─── Constants ────────────────────────────────────────────────────────────────

const NL_CENTER = NL_CENTER_DEFAULT;

const CATEGORY_COLOR: Record<Category, string> = {
  flower_field: "#f43f5e",
  photo_spot:   "#3b82f6",
  attraction:   "#22c55e",
  food:         "#f97316",
  parking:      "#94a3b8",
};

type FilterId = "peak" | "nearby" | "quiet" | "photo" | "family" | "free";

const FILTER_IDS: { id: FilterId; emoji: string }[] = [
  { id: "peak",   emoji: "🌸" },
  { id: "nearby", emoji: "📍" },
  { id: "quiet",  emoji: "🌿" },
  { id: "photo",  emoji: "📷" },
  { id: "family", emoji: "👨‍👩‍👧" },
  { id: "free",   emoji: "✅" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createPinSvg(color: string, size = 36): string {
  const s = size;
  const cx = s / 2;
  const cy = s * 0.42;
  const r = s * 0.28;
  const tail = s * 0.72;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s + s * 0.3}" viewBox="0 0 ${s} ${s + s * 0.3}">
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000033"/>
    </filter>
    <g filter="url(#shadow)">
      <circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="${color}"/>
      <polygon points="${cx - 6},${tail} ${cx + 6},${tail} ${cx},${s + s * 0.25}" fill="${color}"/>
    </g>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.45}" fill="white"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchesFilter(loc: Location, filter: FilterId, userCoords: { lat: number; lng: number } | null): boolean {
  switch (filter) {
    case "peak":   return loc.bloom_status === "peak";
    case "quiet":  return (loc.crowd_score ?? 99) <= 2;
    case "photo":  return loc.category === "photo_spot";
    case "family": return loc.category === "attraction";
    case "free":   return loc.access_type === "roadside_only";
    case "nearby":
      if (!userCoords || loc.latitude == null || loc.longitude == null) return false;
      return haversineKm(userCoords.lat, userCoords.lng, loc.latitude, loc.longitude) <= NEARBY_DISTANCE_KM;
    default: return true;
  }
}

// ─── Map styles (clean minimal) ───────────────────────────────────────────────

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e0e0e0" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e8f5" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f8f8f3" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d9d9d9" }] },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChips({
  filters,
  activeFilter,
  locating,
  onFilter,
}: {
  filters: { id: FilterId; emoji: string; label: string }[];
  activeFilter: FilterId | null;
  locating: boolean;
  onFilter: (id: FilterId) => void;
}) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 pt-12 pb-3 px-4
                    bg-gradient-to-b from-white/95 via-white/80 to-transparent">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {filters.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onFilter(f.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold
                border transition-all duration-200 active:scale-95
                ${isActive
                  ? "bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-200"
                  : "bg-white border-gray-200 text-gray-700 hover:border-rose-300"
                }
                ${f.id === "nearby" && locating ? "opacity-60" : ""}
              `}
            >
              <span>{f.id === "nearby" && locating ? "⏳" : f.emoji}</span>
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MapControls({
  mapRef,
  userCoords,
  onLocate,
}: {
  mapRef: React.RefObject<google.maps.Map | null>;
  userCoords: { lat: number; lng: number } | null;
  onLocate: () => void;
}) {
  function handleLocate() {
    if (userCoords) {
      mapRef.current?.panTo(userCoords);
      mapRef.current?.setZoom(12);
    } else {
      onLocate();
    }
  }

  function handleZoom(delta: 1 | -1) {
    if (!mapRef.current) return;
    const z = mapRef.current.getZoom() ?? 9;
    mapRef.current.setZoom(z + delta);
  }

  return (
    <>
      <button
        onClick={handleLocate}
        className="absolute right-4 bottom-44 z-20 w-11 h-11 bg-white rounded-full
                   shadow-lg flex items-center justify-center text-rose-600
                   hover:bg-rose-50 active:scale-95 transition-all border border-gray-100"
      >
        <Locate size={20} />
      </button>

      <div className="absolute right-4 bottom-60 z-20 flex flex-col gap-1">
        {([1, -1] as const).map((delta) => (
          <button
            key={delta}
            onClick={() => handleZoom(delta)}
            className="w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center
                       text-gray-700 font-bold text-lg hover:bg-gray-50 active:scale-95
                       transition-all border border-gray-100"
          >
            {delta === 1 ? "+" : "−"}
          </button>
        ))}
      </div>
    </>
  );
}

function PreviewCard({
  location,
  onClose,
  onNavigate,
  t,
}: {
  location: Location;
  onClose: () => void;
  onNavigate: () => void;
  t: (key: string) => string;
}) {
  const startY = useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (startY.current !== null) {
      const dy = e.clientY - startY.current;
      if (dy < -50) onNavigate(); // swipe up
      startY.current = null;
    }
  }

  const fallback = "https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=600";
  const dot = CATEGORY_COLOR[location.category] ?? "#94a3b8";

  return (
    <div
      className="absolute bottom-20 left-3 right-3 z-30 rounded-3xl bg-white shadow-2xl shadow-black/20 overflow-hidden animate-slide-up"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div className="flex justify-center pt-2.5 pb-1">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>

      <div className="flex gap-3 px-4 pb-4">
        <div className="relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden">
          <Image src={location.image_url ?? fallback} alt={location.title} fill className="object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-extrabold text-gray-900 text-base leading-tight line-clamp-2 flex-1">
              {location.title}
            </h3>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {location.bloom_status && (
            <div className="mb-2">
              <BloomBadge status={location.bloom_status} />
            </div>
          )}

          {location.address && (
            <p className="flex items-center gap-1 text-[11px] text-gray-400 mb-2.5 truncate">
              <MapPin size={10} className="flex-shrink-0" />
              {location.address}
            </p>
          )}

          <button
            onClick={onNavigate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
            style={{ backgroundColor: dot }}
          >
            {t("map.view_details")}
            <ChevronUp size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapView() {
  const router = useRouter();
  const { t }  = useT();
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const mapRef     = useRef<google.maps.Map | null>(null);
  const googleRef  = useRef<typeof google | null>(null);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});

  const [locations, setLocations]       = useState<Location[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterId | null>(null);
  const [selected, setSelected]         = useState<Location | null>(null);
  const [userCoords, setUserCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating]         = useState(false);

  // ── Fetch locations ──
  useEffect(() => {
    supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => { if (data) setLocations(data); });
  }, []);

  // ── Init map ──
  useEffect(() => {
    if (!mapDivRef.current) return;

    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!, v: "weekly" });

    importLibrary("maps").then(() => {
      const g = (window as Window & typeof globalThis).google;
      googleRef.current = g;
      const map = new g.maps.Map(mapDivRef.current!, {
        center: NL_CENTER,
        zoom: 9,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: "greedy",
        styles: MAP_STYLES,
      });
      mapRef.current = map;
    });
  }, []);

  // ── Update markers when locations / filter / userCoords change ──
  useEffect(() => {
    if (!mapRef.current || !googleRef.current || locations.length === 0) return;
    const g: typeof google = googleRef.current;

    Object.values(markersRef.current).forEach((m: google.maps.Marker) => m.setMap(null));
    markersRef.current = {};

    locations.forEach((loc) => {
      if (loc.latitude == null || loc.longitude == null) return;

      const visible = !activeFilter || matchesFilter(loc, activeFilter, userCoords);
      if (!visible) return;

      const color = CATEGORY_COLOR[loc.category] ?? "#94a3b8";
      const marker = new g.maps.Marker({
        position: { lat: loc.latitude, lng: loc.longitude },
        map: mapRef.current,
        title: loc.title,
        icon: {
          url: createPinSvg(color),
          scaledSize: new g.maps.Size(30, 40),
          anchor: new g.maps.Point(15, 40),
        },
        optimized: false,
      });

      marker.addListener("click", () => setSelected(loc));
      markersRef.current[loc.id] = marker;
    });
  }, [locations, activeFilter, userCoords]);

  // ── Handle filter click ──
  const handleFilter = useCallback((id: FilterId) => {
    const next = activeFilter === id ? null : id;
    setActiveFilter(next);
    setSelected(null);

    if (next === "nearby") {
      const cached = getCachedCoords();
      if (cached) {
        setUserCoords(cached);
        mapRef.current?.panTo(cached);
        mapRef.current?.setZoom(12);
        return;
      }
      if (!navigator.geolocation) return;
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCachedCoords(coords.lat, coords.lng);
          setUserCoords(coords);
          mapRef.current?.panTo(coords);
          mapRef.current?.setZoom(12);
          setLocating(false);
        },
        () => setLocating(false)
      );
    }
  }, [activeFilter]);

  const filters = FILTER_IDS.map((f) => ({ ...f, label: t(`map.filter_${f.id}`) }));

  return (
    <div className="fixed inset-0 flex flex-col">

      <FilterChips
        filters={filters}
        activeFilter={activeFilter}
        locating={locating}
        onFilter={handleFilter}
      />

      <div ref={mapDivRef} className="flex-1 w-full" />

      <MapControls
        mapRef={mapRef}
        userCoords={userCoords}
        onLocate={() => handleFilter("nearby")}
      />

      {selected && (
        <PreviewCard
          location={selected}
          onClose={() => setSelected(null)}
          onNavigate={() => router.push(`/location/${selected.slug}`)}
          t={t}
        />
      )}

      <BottomNav active="map" />

      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}
