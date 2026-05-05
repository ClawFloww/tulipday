"use client";

// Data-hook voor de homepagina: Supabase fetch, filtering op onboarding-prefs,
// near-me sortering en zoekresultaten.
// Scheidt alle dataverzameling van de UI-staat in home/page.tsx.

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Location, Route, OnboardingPrefs, Category, RouteType } from "@/lib/types";
import { MAX_RECOMMENDED, EARTH_RADIUS_KM } from "@/lib/constants";
import { getCachedCoords, setCachedCoords } from "@/lib/geolocation";

// ── Interne helpers ───────────────────────────────────────────────────────────

const INTENT_TO_CATEGORY: Record<string, Category> = {
  blooming_fields: "flower_field",
  photo_spots:     "photo_spot",
  quiet_route:     "flower_field",
  family_trip:     "attraction",
  flowers_lunch:   "food",
  flowers_beach:   "flower_field",
};

const TRANSPORT_TO_ROUTE_TYPE: Record<string, RouteType> = {
  bike:    "bike",
  car:     "car",
  walking: "walk",
};

const INTENT_TO_ROUTE_TYPE: Partial<Record<string, RouteType>> = {
  photo_spots: "photo",
  family_trip: "family",
  quiet_route: "walk",
};

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRecommended(all: Location[], prefs: OnboardingPrefs | null): Location[] {
  if (!prefs) return all.slice(0, MAX_RECOMMENDED);
  const targetCategory = INTENT_TO_CATEGORY[prefs.intent];
  const matches = targetCategory ? all.filter((l) => l.category === targetCategory) : all;
  if (prefs.transport === "walking" || prefs.transport === "bike") {
    const accessible = matches.filter((l) => l.access_type === "public_access");
    if (accessible.length > 0) return accessible.slice(0, MAX_RECOMMENDED);
  }
  return matches.slice(0, MAX_RECOMMENDED);
}

function getRecommendedRoutes(all: Route[], prefs: OnboardingPrefs | null): Route[] {
  if (!prefs) return all.filter((r) => r.is_featured).slice(0, 5);

  const byTransport = TRANSPORT_TO_ROUTE_TYPE[prefs.transport];
  const byIntent    = INTENT_TO_ROUTE_TYPE[prefs.intent];
  const wantedTypes = new Set<RouteType>(
    [byTransport, byIntent].filter(Boolean) as RouteType[],
  );

  let filtered = wantedTypes.size > 0
    ? all.filter((r) => r.route_type && wantedTypes.has(r.route_type as RouteType))
    : [...all];

  if (prefs.time === "short") {
    filtered = filtered.filter((r) => !r.duration_minutes || r.duration_minutes <= 90);
  } else if (prefs.time === "half_day") {
    filtered = filtered.filter((r) => !r.duration_minutes || r.duration_minutes <= 240);
  }

  if (filtered.length === 0) filtered = all.filter((r) => r.is_featured);
  if (filtered.length === 0) filtered = all;
  return filtered.slice(0, 5);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseHomeDataResult {
  bestBlooms:        Location[];
  recommended:       Location[];
  recommendedRoutes: Route[];
  photoSpots:        Location[];
  prefs:             OnboardingPrefs | null;
  loading:           boolean;
  error:             boolean;
  searchResults:     Location[] | null;
  nearMeLoading:     boolean;
  userCoords:        { lat: number; lon: number } | null;
  handleNearMe:      () => void;
}

export function useHomeData({ searchQuery }: { searchQuery: string }): UseHomeDataResult {
  const [prefs,          setPrefs]          = useState<OnboardingPrefs | null>(null);
  const [allLocations,   setAllLocations]   = useState<Location[]>([]);
  const [allRoutes,      setAllRoutes]      = useState<Route[]>([]);
  const [bestBlooms,     setBestBlooms]     = useState<Location[]>([]);
  const [recommended,    setRecommended]    = useState<Location[]>([]);
  const [photoSpots,     setPhotoSpots]     = useState<Location[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(false);
  const [userCoords,     setUserCoords]     = useState<{ lat: number; lon: number } | null>(null);
  const [nearMeLoading,  setNearMeLoading]  = useState(false);
  const [picksBySection, setPicksBySection] = useState<Record<string, string[]>>({});

  // Laad onboarding-voorkeur uit localStorage
  useEffect(() => {
    const raw = localStorage.getItem("tulipday_onboarding");
    if (raw) { try { setPrefs(JSON.parse(raw)); } catch {} }
  }, []);

  // Haal locaties, routes en homepage-picks op uit Supabase
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [
        { data: allLocs,  error: locsError },
        { data: routes,   error: routesError },
        { data: rawPicks, error: picksError },
      ] = await Promise.all([
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("routes").select("*").eq("is_active", true).order("is_featured", { ascending: false }),
        supabase.from("homepage_picks").select("section_key, location_id").order("sort_order"),
      ]);

      if (locsError || routesError) {
        console.error("Fout bij ophalen data:", locsError ?? routesError);
        setError(true);
        setLoading(false);
        return;
      }

      const locs = allLocs ?? [];

      // Bouw picks-map op per sectie
      const picksMap: Record<string, string[]> = {};
      if (!picksError) {
        for (const p of rawPicks ?? []) {
          if (!picksMap[p.section_key]) picksMap[p.section_key] = [];
          picksMap[p.section_key].push(p.location_id);
        }
      }
      setPicksBySection(picksMap);

      // Beste bloei: picks hebben voorrang, anders automatisch op bloeistatus
      const bloomPickIds = picksMap["best_blooms"];
      if (bloomPickIds?.length) {
        setBestBlooms(bloomPickIds.map((id) => locs.find((l) => l.id === id)!).filter(Boolean));
      } else {
        const blooming = locs.filter((l) => l.bloom_status === "peak" || l.bloom_status === "blooming");
        const featured = blooming.filter((l) => l.is_featured);
        setBestBlooms((featured.length > 0 ? featured : blooming).slice(0, 12));
      }

      // Fotoplekken: picks hebben voorrang, anders automatisch op categorie
      const photoPickIds = picksMap["photo_spots"];
      setPhotoSpots(
        photoPickIds?.length
          ? photoPickIds.map((id) => locs.find((l) => l.id === id)!).filter(Boolean)
          : locs.filter((l) => l.category === "photo_spot"),
      );

      setAllLocations(locs);
      setAllRoutes(routes ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Herbereken aanbevolen locaties als data, prefs of picks wijzigt
  useEffect(() => {
    if (allLocations.length === 0) return;
    const recPickIds = picksBySection["recommended"];
    if (recPickIds?.length) {
      setRecommended(recPickIds.map((id) => allLocations.find((l) => l.id === id)!).filter(Boolean));
    } else {
      setRecommended(getRecommended(allLocations, prefs));
    }
  }, [allLocations, prefs, picksBySection]);

  // Sorteer locaties op afstand en sla coördinaten op
  const applyNearMe = useCallback(
    (coords: { lat: number; lon: number }) => {
      setUserCoords(coords);
      setNearMeLoading(false);
      setRecommended(
        [...allLocations]
          .filter((l) => l.latitude != null && l.longitude != null)
          .sort(
            (a, b) =>
              distanceKm(coords.lat, coords.lon, a.latitude!, a.longitude!) -
              distanceKm(coords.lat, coords.lon, b.latitude!, b.longitude!),
          )
          .slice(0, MAX_RECOMMENDED),
      );
    },
    [allLocations],
  );

  const handleNearMe = useCallback(() => {
    const cached = getCachedCoords();
    if (cached) {
      applyNearMe({ lat: cached.lat, lon: cached.lng });
      return;
    }
    if (!navigator.geolocation) return;
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCachedCoords(coords.lat, coords.lon);
        applyNearMe(coords);
      },
      () => setNearMeLoading(false),
    );
  }, [applyNearMe]);

  // Zoekresultaten op basis van debounced query
  const searchResults = useMemo<Location[] | null>(() => {
    if (!searchQuery) return null;
    const q = searchQuery.toLowerCase();
    return allLocations.filter(
      (l) => l.title.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q),
    );
  }, [searchQuery, allLocations]);

  return {
    bestBlooms,
    recommended,
    recommendedRoutes: getRecommendedRoutes(allRoutes, prefs),
    photoSpots,
    prefs,
    loading,
    error,
    searchResults,
    nearMeLoading,
    userCoords,
    handleNearMe,
  };
}
