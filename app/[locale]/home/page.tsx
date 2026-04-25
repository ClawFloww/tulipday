"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Search, MapPin, Loader2, ChevronRight, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Location, Route, OnboardingPrefs, Category, RouteType } from "@/lib/types";
import { LocationCard } from "@/components/ui/LocationCard";
import { RouteCard } from "@/components/ui/RouteCard";
import { useT } from "@/lib/i18n-context";
import { MAX_RECOMMENDED, SKELETON_CARD_COUNT, SKELETON_ROUTE_COUNT, EARTH_RADIUS_KM } from "@/lib/constants";
import { getCachedCoords, setCachedCoords } from "@/lib/geolocation";
import { isPremium, FREE_LOCATION_LIMIT } from "@/lib/premium";
import { useWeather } from "@/hooks/useWeather";
import { useUserLocation } from "@/hooks/useUserLocation";
import WeatherCard from "@/components/weather/WeatherCard";
import WeatherBanner from "@/components/weather/WeatherBanner";
import LocationPermissionCard from "@/components/weather/LocationPermissionCard";
import { CorsoLiveBanner } from "@/components/corso/CorsoLiveBanner";
import { motion, AnimatePresence } from "framer-motion";
import { AppTour } from "@/components/ui/AppTour";

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

// Vervoermiddel uit onboarding → route_type in database
const TRANSPORT_TO_ROUTE_TYPE: Record<string, RouteType> = {
  bike:    "bike",
  car:     "car",
  walking: "walk",
};

// Intent kan ook een route-type suggereren
const INTENT_TO_ROUTE_TYPE: Partial<Record<string, RouteType>> = {
  photo_spots:  "photo",
  family_trip:  "family",
  quiet_route:  "walk",
};

function getRecommendedRoutes(all: Route[], prefs: OnboardingPrefs | null): Route[] {
  if (!prefs) return all.filter((r) => r.is_featured).slice(0, 5);

  // Bepaal gewenste route-types op basis van vervoer én intent
  const byTransport = TRANSPORT_TO_ROUTE_TYPE[prefs.transport];
  const byIntent    = INTENT_TO_ROUTE_TYPE[prefs.intent];
  const wantedTypes = new Set<RouteType>([byTransport, byIntent].filter(Boolean) as RouteType[]);

  let filtered = wantedTypes.size > 0
    ? all.filter((r) => r.route_type && wantedTypes.has(r.route_type as RouteType))
    : [...all];

  // Filter op tijdsduur
  if (prefs.time === "short") {
    filtered = filtered.filter((r) => !r.duration_minutes || r.duration_minutes <= 90);
  } else if (prefs.time === "half_day") {
    filtered = filtered.filter((r) => !r.duration_minutes || r.duration_minutes <= 240);
  }
  // full_day: geen duurfilter

  // Fallback als er niets overblijft
  if (filtered.length === 0) filtered = all.filter((r) => r.is_featured);
  if (filtered.length === 0) filtered = all;

  return filtered.slice(0, 5);
}

// Leesbaar label voor de routes-sectietitel
const TRANSPORT_LABEL: Record<string, string> = {
  bike: "🚴 Fiets", car: "🚗 Auto", walking: "🚶 Wandel",
};
const TIME_LABEL: Record<string, string> = {
  short: "kort", half_day: "halve dag", full_day: "hele dag",
};

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Alles-zien overlay ────────────────────────────────────────────────────────

function SeeAllSheet({
  title,
  locations,
  onClose,
  onNavigate,
}: {
  title:      string;
  locations:  Location[];
  onClose:    () => void;
  onNavigate: (slug: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? locations.filter(
        (l) =>
          l.title.toLowerCase().includes(query.toLowerCase()) ||
          l.address?.toLowerCase().includes(query.toLowerCase()),
      )
    : locations;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 300 }}
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 pt-14 pb-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface-2)" }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
        >
          <X size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold truncate" style={{ color: "var(--color-text)" }}>
            {title}
          </h2>
          <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
            {locations.length} locaties
          </p>
        </div>
      </div>

      {/* Zoekbalk */}
      <div className="px-5 py-3 flex-shrink-0" style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-3)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoeken…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-tulip-500/40"
            style={{
              backgroundColor: "var(--color-surface-3)",
              color:            "var(--color-text)",
              border:           "1px solid var(--color-border)",
            }}
          />
        </div>
      </div>

      {/* Lijst */}
      <div className="flex-1 overflow-y-auto pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-3)" }}>
              Geen resultaten voor &ldquo;{query}&rdquo;
            </p>
          </div>
        ) : (
          <div className="px-5 pt-3 space-y-2">
            {filtered.map((loc) => (
              <button
                key={loc.id}
                onClick={() => onNavigate(loc.slug)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left active:scale-[0.98] transition-transform"
                style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
              >
                {/* Thumbnail */}
                {loc.image_url ? (
                  <Image
                    src={loc.image_url}
                    alt={loc.title}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                       style={{ backgroundColor: "var(--color-surface-3)" }}>
                    🌷
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                    {loc.title}
                  </p>
                  {loc.address && (
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-3)" }}>
                      {loc.address}
                    </p>
                  )}
                  {loc.bloom_status && (
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: loc.bloom_status === "peak" ? "#F0FDF4" : "var(--color-surface-3)",
                            color:           loc.bloom_status === "peak" ? "#2D7D46" : "var(--color-text-3)",
                          }}>
                      {loc.bloom_status === "peak"     ? "🌸 Top bloei"
                       : loc.bloom_status === "blooming" ? "🌷 In bloei"
                       : loc.bloom_status === "early"    ? "🌱 Vroeg"
                       : "🍂 Voorbij"}
                    </span>
                  )}
                </div>

                <ChevronRight size={16} style={{ color: "var(--color-text-3)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, children, onSeeAll }: { title: string; children: React.ReactNode; onSeeAll?: () => void }) {
  const { t } = useT();
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between px-5 mb-3">
        <h2 className="font-display text-base font-bold text-[var(--color-text)]">{title}</h2>
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
    <div className={`flex-shrink-0 ${wide ? "w-56" : "w-48"} rounded-2xl overflow-hidden shadow-card`} style={{ backgroundColor: "var(--color-surface-2)" }}>
      {/* Afbeelding-placeholder met shimmer */}
      <div className="h-[200px] skeleton-shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 skeleton-shimmer rounded w-1/2" />
        <div className="h-4 skeleton-shimmer rounded w-3/4" />
        <div className="h-2.5 skeleton-shimmer rounded w-2/3" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "nl";
  const { t }  = useT();

  const [prefs, setPrefs]               = useState<OnboardingPrefs | null>(null);
  const [search, setSearch]             = useState("");
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [userCoords, setUserCoords]     = useState<{ lat: number; lon: number } | null>(null);
  const [bestBlooms, setBestBlooms]     = useState<Location[]>([]);
  const [recommended, setRecommended]   = useState<Location[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [photoSpots, setPhotoSpots]     = useState<Location[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [premium, setPremium]           = useState(true);
  const [showLocationCard, setShowLocationCard] = useState(false);
  const [seeAll, setSeeAll] = useState<{ title: string; locations: Location[] } | null>(null);
  const [showTour, setShowTour] = useState(false);

  // Locatiebepaling met GPS-fallback naar Lisse
  const location = useUserLocation();
  // Weerdata op basis van gebruikerslocatie
  const weather  = useWeather(location.coords);

  useEffect(() => { setPremium(isPremium()); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reset_tour") === "1") {
      localStorage.removeItem("tulipday_feature_tour_v1");
    }
    if (!localStorage.getItem("tulipday_feature_tour_v1")) setShowTour(true);
  }, []);

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
          supabase.from("routes").select("*").eq("is_active", true).order("is_featured", { ascending: false }),
        ]);

      if (locsError || routesError) {
        console.error("Fout bij ophalen data:", locsError ?? routesError);
        setError(true);
        setLoading(false);
        return;
      }

      const locs = allLocs ?? [];
      // Toon featured peak/blooming velden; als geen featured beschikbaar, val terug op alle peak/blooming
      const blooming = locs.filter((l) => l.bloom_status === "peak" || l.bloom_status === "blooming");
      const featured = blooming.filter((l) => l.is_featured);
      setBestBlooms((featured.length > 0 ? featured : blooming).slice(0, 12));
      setAllLocations(locs);
      setAllRoutes(routes ?? []);
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
    <div className="min-h-screen bg-surface pb-24">
      {showTour && <AppTour onDone={() => setShowTour(false)} />}

      {/* Header */}
      <div className="bg-surface-2 px-5 pt-12 pb-5 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--color-text-3)" }}>{t(`home.${greetingKey}`)} 👋</p>
            <Image src="/logo.png" alt="TulipDay" width={240} height={160} className="object-contain" priority />
          </div>
          {userCoords && (
            <span className="text-[10px] text-tulip-500 bg-tulip-50 px-2.5 py-1 rounded-full font-bold">
              {t("home.near_me_active")}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-3)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("home.search_placeholder")}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-3 text-sm outline-none focus:ring-2 focus:ring-tulip-400 transition"
              style={{ color: "var(--color-text)" }}
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
          <p className="text-xs font-bold text-[var(--color-text-3)] uppercase tracking-widest mb-3">
            {t(searchResults.length === 1 ? "home.search_count" : "home.search_count_plural", {
              count: searchResults.length,
              query: debouncedSearch,
            })}
          </p>
          <div className="flex gap-3 flex-wrap">
            {searchResults.length === 0 ? (
              <p className="text-sm text-[var(--color-text-3)]">{t("home.no_locations_found")}</p>
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

          {/* Locatietoestemming-kaart (eenmalig of bij herinstellen) */}
          <AnimatePresence>
            {(location.permissionStatus === "prompt" || showLocationCard) && (
              <LocationPermissionCard
                onGrant={() => { location.requestGPS(); setShowLocationCard(false); }}
                onDecline={() => { location.useLisse(); setShowLocationCard(false); }}
              />
            )}
          </AnimatePresence>

          {/* Weerkaart */}
          <div className="mb-6">
            <div onClick={() => router.push(`/${locale}/weather`)} className="cursor-pointer">
              <WeatherCard
                current={weather.current}
                isLoading={weather.isLoading}
                error={weather.error}
                lastUpdated={weather.lastUpdated}
                onRefresh={weather.refresh}
                locationLabel={location.locationLabel}
                isUsingGPS={location.isUsingGPS}
                onLocationClick={() => setShowLocationCard(true)}
              />
            </div>
            <WeatherBanner current={weather.current} />
          </div>

          {/* Bloemencorso live banner */}
          <CorsoLiveBanner />

          <Section
            title={t("home.best_blooms")}
            onSeeAll={() => setSeeAll({ title: t("home.best_blooms"), locations: bestBlooms })}
          >
            {loading
              ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : bestBlooms.length === 0
              ? <p className="text-sm text-[var(--color-text-3)] pl-1">{t("home.no_peak_blooms")}</p>
              : (premium ? bestBlooms : bestBlooms.slice(0, FREE_LOCATION_LIMIT)).map((loc) => (
                  <LocationCard key={loc.id} location={loc} onClick={() => router.push(`/location/${loc.slug}`)} />
                ))}
          </Section>

          <Section
            title={t(prefs ? "home.recommended" : "home.explore")}
            onSeeAll={() => setSeeAll({ title: t(prefs ? "home.recommended" : "home.explore"), locations: recommended })}
          >
            {loading
              ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : recommended.length === 0
              ? <p className="text-sm text-[var(--color-text-3)] pl-1">{t("home.nothing_found")}</p>
              : (premium ? recommended : recommended.slice(0, FREE_LOCATION_LIMIT)).map((loc) => (
                  <LocationCard key={loc.id} location={loc} onClick={() => router.push(`/location/${loc.slug}`)} />
                ))}
          </Section>

          <Section
            title={prefs
              ? `${TRANSPORT_LABEL[prefs.transport] ?? "🗺"}-routes · ${TIME_LABEL[prefs.time] ?? ""}`
              : t("home.popular_routes")}
            onSeeAll={() => router.push("/routes")}
          >
            {loading
              ? Array.from({ length: SKELETON_ROUTE_COUNT }).map((_, i) => <SkeletonCard key={i} wide />)
              : getRecommendedRoutes(allRoutes, prefs).length === 0
              ? <p className="text-sm text-[var(--color-text-3)] pl-1">{t("home.no_routes")}</p>
              : getRecommendedRoutes(allRoutes, prefs).map((route) => (
                  <RouteCard key={route.id} route={route} onClick={() => router.push(`/routes/${route.slug}`)} />
                ))}
          </Section>

          <Section
            title={t("home.photo_spots_section")}
            onSeeAll={() => setSeeAll({ title: t("home.photo_spots_section"), locations: photoSpots })}
          >
            {loading
              ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : photoSpots.length === 0
              ? <p className="text-sm text-[var(--color-text-3)] pl-1">{t("home.no_photo_spots")}</p>
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

      {/* Alles-zien overlay */}
      <AnimatePresence>
        {seeAll && (
          <SeeAllSheet
            key="see-all"
            title={seeAll.title}
            locations={seeAll.locations}
            onClose={() => setSeeAll(null)}
            onNavigate={(slug) => {
              setSeeAll(null);
              router.push(`/location/${slug}`);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
