"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronRight, Flower2, Layers, Loader2, MapPin, Search, SearchX, X } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { locationPath, routePath } from "@/lib/links";
import { SKELETON_CARD_COUNT, SKELETON_ROUTE_COUNT } from "@/lib/constants";
import { isPremium, refreshPremium, FREE_LOCATION_LIMIT } from "@/lib/premium";
import { useWeather } from "@/hooks/useWeather";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useHomeData } from "@/hooks/useHomeData";
import { useLocationStatuses } from "@/hooks/useLocationStatuses";
import WeatherCard from "@/components/weather/WeatherCard";
import WeatherBanner from "@/components/weather/WeatherBanner";
import LocationPermissionCard from "@/components/weather/LocationPermissionCard";
import { CorsoLiveBanner } from "@/components/corso/CorsoLiveBanner";
import { AppTour } from "@/components/ui/AppTour";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { LocationCard } from "@/components/ui/LocationCard";
import { PremiumPromoBanner } from "@/components/ui/PremiumPromoBanner";
import { RouteCard } from "@/components/ui/RouteCard";
import type { Location } from "@/lib/types";

// Vertaalsleutels voor de titel van de routesectie (planner-voorkeuren)
const TRANSPORT_KEY: Record<string, string> = {
  bike: "home.transport_bike", car: "home.transport_car", walking: "home.transport_walking",
};
const TIME_KEY: Record<string, string> = {
  short: "home.time_short", half_day: "home.time_half_day", full_day: "home.time_full_day",
};

const SEARCH_INPUT_CLASS =
  "w-full min-h-[48px] pl-10 pr-10 rounded-xl text-[15px] text-ink bg-surface-3 border border-transparent " +
  "placeholder:text-ink-3 focus:outline-none focus:border-primary transition-colors duration-fast";

// ── Alles-zien overlay ────────────────────────────────────────────────────────

function SeeAllSheet({
  open,
  title,
  locations,
  onClose,
  onNavigate,
}: {
  open:       boolean;
  title:      string;
  locations:  Location[];
  onClose:    () => void;
  onNavigate: (slug: string) => void;
}) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q
    ? locations.filter((l) => l.title.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q))
    : locations;

  return (
    <BottomSheet open={open} onClose={onClose} size="full" showClose
                 title={<>{title} <span className="text-label font-normal text-ink-3">· {t("home.locations_count", { count: locations.length })}</span></>}>
      <div className="sticky top-0 z-10 -mx-5 px-5 pb-3 bg-surface-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                 placeholder={t("common.search_short")} aria-label={t("common.search_short")}
                 className={SEARCH_INPUT_CLASS} />
        </div>
      </div>

      {filtered.length === 0 ? (
        q
          ? <EmptyState icon={<SearchX size={28} />} title={t("home.no_results", { query })} description={t("home.no_results_hint")} />
          : <EmptyState icon={<Flower2 size={28} />} title={t("home.nothing_found")} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((loc) => (
            <li key={loc.id}>
              <button onClick={() => onNavigate(loc.slug)}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left bg-surface border border-line
                           active:scale-[0.98] transition-transform duration-fast
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {loc.image_url ? (
                  <Image src={loc.image_url} alt="" width={56} height={56} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-subtle text-primary">
                    <Flower2 size={22} aria-hidden />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold truncate text-ink">{loc.title}</p>
                  {loc.address && <p className="text-caption truncate mt-0.5 text-ink-3">{loc.address}</p>}
                  {loc.bloom_status && <div className="mt-1"><BloomBadge status={loc.bloom_status} /></div>}
                </div>
                <ChevronRight size={18} className="text-ink-3 flex-shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, children, onSeeAll }: { title: string; children: React.ReactNode; onSeeAll?: () => void }) {
  const { t } = useT();
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between px-5 mb-2">
        <h2 className="text-headline text-ink">{title}</h2>
        {onSeeAll && (
          <button onClick={onSeeAll}
                  className="flex items-center gap-0.5 min-h-touch -mr-2 px-2 text-label text-primary rounded-lg
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {t("common.see_all")} <ChevronRight size={15} aria-hidden />
          </button>
        )}
      </div>
      {/* Horizontaal scrollen met snap, zoals native carrousels */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-2 snap-x snap-mandatory scroll-px-5 [&>*]:snap-start">{children}</div>
    </section>
  );
}

function SkeletonCard({ wide = false }: { wide?: boolean }) {
  return (
    <div className={`flex-shrink-0 ${wide ? "w-56" : "w-48"} rounded-2xl overflow-hidden shadow-card bg-surface-2`} aria-hidden>
      <div className="h-[200px] skeleton-shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 skeleton-shimmer rounded w-1/2" />
        <div className="h-4 skeleton-shimmer rounded w-3/4" />
        <div className="h-2.5 skeleton-shimmer rounded w-2/3" />
      </div>
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-body text-ink-3 py-6">{children}</p>;
}

export default function HomePage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "nl";
  const { t }  = useT();

  const [search,           setSearch]           = useState("");
  const [debouncedSearch,  setDebouncedSearch]  = useState("");
  const [premium,          setPremium]          = useState(true);
  const [showLocationCard, setShowLocationCard] = useState(false);
  const [seeAll,           setSeeAllData]       = useState<{ title: string; locations: Location[] } | null>(null);
  const [seeAllOpen,       setSeeAllOpen]       = useState(false);
  const [showTour,         setShowTour]         = useState(false);

  // Locatiebepaling met GPS-fallback naar Lisse
  const location = useUserLocation();
  // Weerdata op basis van gebruikerslocatie
  const weather  = useWeather(location.coords);

  // Data-fetching, filtering en near-me logica
  const {
    bestBlooms, recommended, recommendedRoutes, photoSpots,
    prefs, loading, error, searchResults, nearMeLoading, userCoords, handleNearMe,
  } = useHomeData({ searchQuery: debouncedSearch });

  // Partner-statussen voor alle locaties die op deze pagina worden getoond.
  // Eén batch-fetch i.p.v. N+1 per card.
  const allLocationIds = [
    ...(searchResults ?? []).map((l) => l.id),
    ...bestBlooms.map((l) => l.id),
    ...recommended.map((l) => l.id),
    ...photoSpots.map((l) => l.id),
  ];
  const partnerStatuses = useLocationStatuses(allLocationIds);

  useEffect(() => { setPremium(isPremium()); refreshPremium().then(setPremium); }, []);

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

  function openSeeAll(data: { title: string; locations: Location[] }) {
    setSeeAllData(data);
    setSeeAllOpen(true);
  }

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "greeting_morning" : hour < 18 ? "greeting_afternoon" : "greeting_evening";

  return (
    <div className="min-h-screen bg-surface pb-safe-nav">
      {showTour && <AppTour onDone={() => setShowTour(false)} />}

      {/* Header */}
      <header className="bg-surface-2 px-5 pt-safe pb-5 border-b border-line">
        <div className="flex items-center justify-between pt-6 mb-1">
          <div>
            <p className="text-caption text-ink-3">{t(`home.${greetingKey}`)}</p>
            <Image src="/logo.png" alt="TulipDay" width={240} height={160} className="object-contain" priority />
          </div>
          {userCoords && <span className="text-caption font-bold text-primary bg-primary-subtle px-2.5 py-1 rounded-full">{t("home.near_me_active")}</span>}
        </div>

        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("home.search_placeholder")}
              aria-label={t("home.search_placeholder")}
              enterKeyHint="search"
              className={SEARCH_INPUT_CLASS}
            />
            {search && (
              <button onClick={() => setSearch("")} aria-label={t("common.close")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full text-ink-3">
                <X size={16} />
              </button>
            )}
          </div>
          <IconButton variant="primary" aria-label={t("home.near_me")} onClick={handleNearMe}
                      className="!h-12 !w-12 !rounded-xl">
            {nearMeLoading ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
          </IconButton>
        </div>
      </header>

      {/* Foutmelding */}
      {error && (
        <div role="alert" className="mx-5 mt-4 px-4 py-3 rounded-xl flex items-start gap-2.5 bg-surface-2 border border-line text-label text-ink-2">
          <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" aria-hidden />
          {t("common.load_error")}
        </div>
      )}

      {/* Search results */}
      {searchResults && (
        <div className="px-5 pt-6">
          <p className="text-caption font-bold text-ink-3 uppercase tracking-widest mb-3">
            {t(searchResults.length === 1 ? "home.search_count" : "home.search_count_plural", {
              count: searchResults.length,
              query: debouncedSearch,
            })}
          </p>
          <div className="flex gap-3 flex-wrap">
            {searchResults.length === 0 ? (
              <EmptyState icon={<SearchX size={28} />} title={t("home.no_results", { query: debouncedSearch })}
                          description={t("home.no_results_hint")} className="w-full" />
            ) : (
              searchResults.map((loc) => (
                <LocationCard key={loc.id} location={loc} status={partnerStatuses.get(loc.id)} onClick={() => router.push(locationPath(locale, loc.slug))} />
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

          {/* Veldontdekking (swipe) */}
          <div className="px-5 mb-6">
            <button
              type="button"
              onClick={() => router.push(`/${locale}/discover`)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl text-left bg-primary text-on-primary shadow-md
                         active:scale-[0.98] transition-transform duration-fast
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Layers size={22} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-headline">{t("home.discover_title")}</span>
                <span className="block text-caption opacity-85">{t("home.discover_body")}</span>
              </span>
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>

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

          {/* Premium promo — alleen zichtbaar voor niet-premium gebruikers */}
          <PremiumPromoBanner locale={locale} />

          <Section
            title={t("home.best_blooms")}
            onSeeAll={() => openSeeAll({ title: t("home.best_blooms"), locations: bestBlooms })}
          >
            {loading
              ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : bestBlooms.length === 0
              ? <EmptyRow>{t("home.no_peak_blooms")}</EmptyRow>
              : (premium ? bestBlooms : bestBlooms.slice(0, FREE_LOCATION_LIMIT)).map((loc) => (
                  <LocationCard key={loc.id} location={loc} status={partnerStatuses.get(loc.id)} onClick={() => router.push(locationPath(locale, loc.slug))} />
                ))}
          </Section>

          <Section
            title={t(prefs ? "home.recommended" : "home.explore")}
            onSeeAll={() => openSeeAll({ title: t(prefs ? "home.recommended" : "home.explore"), locations: recommended })}
          >
            {loading
              ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : recommended.length === 0
              ? <EmptyRow>{t("home.nothing_found")}</EmptyRow>
              : (premium ? recommended : recommended.slice(0, FREE_LOCATION_LIMIT)).map((loc) => (
                  <LocationCard key={loc.id} location={loc} status={partnerStatuses.get(loc.id)} onClick={() => router.push(locationPath(locale, loc.slug))} />
                ))}
          </Section>

          <Section
            title={prefs && TRANSPORT_KEY[prefs.transport]
              ? [t(TRANSPORT_KEY[prefs.transport]), TIME_KEY[prefs.time] ? t(TIME_KEY[prefs.time]) : null].filter(Boolean).join(" · ")
              : t("home.popular_routes")}
            onSeeAll={() => router.push(`/${locale}/routes`)}
          >
            {loading
              ? Array.from({ length: SKELETON_ROUTE_COUNT }).map((_, i) => <SkeletonCard key={i} wide />)
              : recommendedRoutes.length === 0
              ? <EmptyRow>{t("home.no_routes")}</EmptyRow>
              : recommendedRoutes.map((route) => (
                  <RouteCard key={route.id} route={route} onClick={() => router.push(routePath(locale, route.slug))} />
                ))}
          </Section>

          <Section
            title={t("home.photo_spots_section")}
            onSeeAll={() => openSeeAll({ title: t("home.photo_spots_section"), locations: photoSpots })}
          >
            {loading
              ? Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => <SkeletonCard key={i} />)
              : photoSpots.length === 0
              ? <EmptyRow>{t("home.no_photo_spots")}</EmptyRow>
              : (premium ? photoSpots : photoSpots.slice(0, FREE_LOCATION_LIMIT)).map((loc) => (
                  <LocationCard key={loc.id} location={loc} status={partnerStatuses.get(loc.id)} onClick={() => router.push(locationPath(locale, loc.slug))} />
                ))}
          </Section>

        </div>
      )}

      {/* Alles-zien sheet — blijft gemount zodat de sluitanimatie kan afspelen */}
      <SeeAllSheet
        open={seeAllOpen}
        title={seeAll?.title ?? ""}
        locations={seeAll?.locations ?? []}
        onClose={() => setSeeAllOpen(false)}
        onNavigate={(slug) => {
          setSeeAllOpen(false);
          router.push(locationPath(locale, slug));
        }}
      />

    </div>
  );
}
