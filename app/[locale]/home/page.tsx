"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, MapPin, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Location, Route, OnboardingPrefs, Category } from "@/lib/types";
import { LocationCard } from "@/components/ui/LocationCard";
import { RouteCard } from "@/components/ui/RouteCard";
import { useT } from "@/lib/i18n-context";
import { MAX_RECOMMENDED, SKELETON_CARD_COUNT, SKELETON_ROUTE_COUNT, EARTH_RADIUS_KM } from "@/lib/constants";
import { getCachedCoords, setCachedCoords } from "@/lib/geolocation";
import { isPremium, FREE_LOCATION_LIMIT } from "@/lib/premium";

const INTENT_TO_CATEGORY: Record<string, Category> = {
  blooming_fields: "flower_field",
  photo_spots:     "photo_spot",
  quiet_route:     "flower_field",
  family_trip:     "attraction",
  flowers_lunch:   "food",
  flowers_beach:   "flower_field",
};

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

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function Section({ title, children, onSeeAll }: { title: string; children: React.ReactNode; onSeeAll?: () => void }) {
  const { t } = useT();
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between px-5 mb-3">
        <h2 className="text-base font-extrabold text-[#1A1A1A]">{title}</h2>
        {onSeeAll && (
          <button onClick={onSeeAll} className="flex items-center gap-0.5 text-xs font-semibold text-tulip-500 hover:text-tulip-600 transition-colors">
            {t("common.see_all")} <ChevronRight size={13} />
          </button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-2">{children}</div>
    </div>
  );
}

function SkeletonCard({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`flex-shrink-0 ${wide ? "w-56" : "w-48"} rounded-2xl overflow-hidden bg-white shadow-card animate-pulse`}>
      <div className="h-[200px] bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-2.5 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { t }  = useT();

  const [prefs, setPrefs]               = useState<OnboardingPrefs | null>(null);
  const [search, setSearch]             = useState("");
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [userCoords, setUserCoords]     = useState<{ lat: number; lon: number } | null>(null);
  const [bestBlooms, setBestBlooms]     = useState<Location[]>([]);
  const [recommended, setRecommended]   = useState<Location[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [featuredRoutes, setFeaturedRoutes] = useState<Route[]>([]);
  const [photoSpots, setPhotoSpots]     = useState<Location[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [premium, setPremium]           = useState(true);

  useEffect(() => { setPremium(isPremium()); }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const raw = localStorage.getItem("tulipday_onboarding");
    if (raw) { try { setPrefs(JSON.parse(raw)); } catch {} }
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [{ data: allLocs, error: locsError }, { data: routes, error: routesError }] =
        await Promise.all([
          supabase.from("locations").select("*").eq("is_active", true),
          supabase.from("routes").select("*").eq("is_featured", true).eq("is_active", true),
        ]);

      if (locsError || routesError) {
        console.error("Fout bij ophalen data:", locsError ?? routesError);
        setError(true);
        setLoading(false);
        return;
      }

      const locs = allLocs ?? [];
      setBestBlooms(locs.filter((l) => l.bloom_status === "peak" && l.is_featured));
      setAllLocations(locs);
      setFeaturedRoutes(routes ?? []);
      setPhotoSpots(locs.filter((l) => l.category === "photo_spot"));
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (allLocations.length > 0) setRecommended(getRecommended(allLocations, prefs));
  }, [allLocations, prefs]);

  const applyNearMe = useCallback((coords: { lat: number; lon: number }) => {
    setUserCoords(coords);
    setNearMeLoading(false);
    setRecommended(
      [...allLocations]
        .filter((l) => l.latitude != null && l.longitude != null)
        .sort((a, b) =>
          distanceKm(coords.lat, coords.lon, a.latitude!, a.longitude!) -
          distanceKm(coords.lat, coords.lon, b.latitude!, b.longitude!)
        )
        .slice(0, MAX_RECOMMENDED)
    );
  }, [allLocations]);

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
      () => setNearMeLoading(false)
    );
  }, [applyNearMe]);

  const searchResults = useMemo(() => {
    if (!debouncedSearch) return null;
    const q = debouncedSearch.toLowerCase();
    return allLocations.filter(
      (l) => l.title.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q)
    );
  }, [debouncedSearch, allLocations]);

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "greeting_morning" : hour < 18 ? "greeting_afternoon" : "greeting_evening";

  return (
    <div className="min-h-screen bg-warm pb-24">

      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs text-gray-400 font-medium">{t(`home.${greetingKey}`)} 👋</p>
            <Image src="/logo.png" alt="TulipDay" width={180} height={120} className="object-contain" priority />
          </div>
          {userCoords && (
            <span className="text-[10px] text-tulip-500 bg-tulip-50 px-2.5 py-1 rounded-full font-bold">
              {t("home.near_me_active")}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("home.search_placeholder")}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 text-sm text-[#1A1A1A] placeholder-gray-400 outline-none focus:ring-2 focus:ring-tulip-300 transition"
            />
          </div>
          <button
            onClick={handleNearMe}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-tulip-500 text-white text-sm font-bold shadow-sm hover:bg-tulip-600 active:scale-95 transition-all"
          >
            {nearMeLoading ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
            <span className="hidden sm:inline">{t("home.near_me")}</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
          {t("common.load_error")}
        </div>
      )}

      {/* Search results */}
      {searchResults && (
        <div className="px-5 pt-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            {t(searchResults.length === 1 ? "home.search_count" : "home.search_count_plural", {
              count: searchResults.length,
              query: debouncedSearch,
            })}
          </p>
          <div className="flex gap-3 flex-wrap">
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-400">{t("home.no_locations_found")}</p>
            ) : (
              searchResults.map((loc) => (
                <LocationCard key={loc.id} location={loc} onClick={() => router.push(`/location/${loc.slug}`)} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Sections */}
      {!searchResults && (
        <div className="pt-7">

          {/* Bloemencorso live banner */}
          <div className="mx-4 mb-6">
            <button
              onClick={() => router.push("/corso")}
              className="w-full px-5 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-between gap-3 shadow-md active:scale-95 transition-all"
            >
              <div className="text-left">
                <p className="text-xs font-semibold opacity-80 uppercase tracking-widest">Live · 19 april 2026</p>
                <p className="text-base font-extrabold leading-tight">🌸 Bloemencorso Live</p>
                <p className="text-xs opacity-80 mt-0.5">Deel je foto&apos;s van de stoet</p>
              </div>
              <ChevronRight size={20} className="flex-shrink-0 opacity-80" />
            </button>
          </div>

          <Section title={t("home.best_blooms")} onSeeAll={() => {}}>
            {loading
              ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : bestBlooms.length === 0
              ? <p className="text-sm text-gray-400 pl-1">{t("home.no_peak_blooms")}</p>
              : (premium ? bestBlooms : bestBlooms.slice(0, FREE_LOCATION_LIMIT)).map((loc) => (
                  <LocationCard key={loc.id} location={loc} onClick={() => router.push(`/location/${loc.slug}`)} />
                ))}
          </Section>

          <Section title={t(prefs ? "home.recommended" : "home.explore")} onSeeAll={() => {}}>
            {loading
              ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : recommended.length === 0
              ? <p className="text-sm text-gray-400 pl-1">{t("home.nothing_found")}</p>
              : (premium ? recommended : recommended.slice(0, FREE_LOCATION_LIMIT)).map((loc) => (
                  <LocationCard key={loc.id} location={loc} onClick={() => router.push(`/location/${loc.slug}`)} />
                ))}
          </Section>

          <Section title={t("home.popular_routes")} onSeeAll={() => router.push("/routes")}>
            {loading
              ? Array.from({ length: SKELETON_ROUTE_COUNT }).map((_, i) => <SkeletonCard key={i} wide />)
              : featuredRoutes.length === 0
              ? <p className="text-sm text-gray-400 pl-1">{t("home.no_routes")}</p>
              : featuredRoutes.map((route) => (
                  <RouteCard key={route.id} route={route} onClick={() => router.push(`/routes/${route.slug}`)} />
                ))}
          </Section>

          <Section title={t("home.photo_spots_section")} onSeeAll={() => {}}>
            {loading
              ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : photoSpots.length === 0
              ? <p className="text-sm text-gray-400 pl-1">{t("home.no_photo_spots")}</p>
              : (premium ? photoSpots : photoSpots.slice(0, FREE_LOCATION_LIMIT)).map((loc) => (
                  <LocationCard key={loc.id} location={loc} onClick={() => router.push(`/location/${loc.slug}`)} />
                ))}
          </Section>

          {!premium && !loading && (
            <div className="mx-4 mb-6 px-5 py-4 rounded-2xl bg-tulip-50 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-tulip-700 flex-1">🌷 Unlock all locations, routes &amp; bloom alerts</p>
              <a
                href="/premium"
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-tulip-500 text-white text-xs font-bold hover:bg-tulip-600 active:scale-95 transition-all"
              >
                Go Premium
              </a>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
