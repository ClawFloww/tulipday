"use client";

// Overzichtspagina met meerdere auto-gegenereerde fietsroutes (bloom-aware)

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, MapPin, Flower2 } from "lucide-react";
import { useMultipleRoutes } from "@/hooks/useMultipleRoutes";
import { useLiveBloomSync } from "@/hooks/useLiveBloomSync";
import { toBloomAwareRoute, sortByBloomScore } from "@/lib/bloomRoute";
import type { BloomAwareRoute } from "@/lib/bloomRoute";
import RouteFilters from "./RouteFilters";
import GeneratedRouteCard from "./GeneratedRouteCard";
import RouteMapPreview from "./RouteMapPreview";
import RouteRefreshBanner from "./RouteRefreshBanner";
import BloomRouteComparison from "./BloomRouteComparison";
import RouteAlternativeSuggestion from "./RouteAlternativeSuggestion";
import type { RouteFiltersState, GeneratedRoute } from "@/lib/routeGenerator";
import type { FieldBloomStatus } from "@/lib/tulipFields";

interface Props {
  initialFilters?: Partial<RouteFiltersState>;
  statuses?: FieldBloomStatus[];
}

const DEFAULT_FILTERS: RouteFiltersState = {
  startKey:      "keukenhof",
  maxDistanceKm: 10,
  fieldCount:    "normaal",
  sort:          "dichtstbij",
};

// Skeleton card tijdens laden
function SkeletonRouteCard() {
  return (
    <div className="rounded-2xl bg-white shadow-card animate-pulse overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex gap-2 mb-2">
          <div className="h-4 w-12 bg-gray-200 rounded-full" />
          <div className="h-4 w-16 bg-gray-200 rounded-full" />
        </div>
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="flex gap-4">
          <div className="h-4 w-14 bg-gray-200 rounded" />
          <div className="h-4 w-14 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="h-2 bg-gray-100 mx-4 rounded-full mb-2" />
      <div className="h-12 bg-gray-100 mx-4 mb-4 rounded-xl" />
    </div>
  );
}

export default function RouteListScreen({ initialFilters, statuses: initialStatuses = [] }: Props) {
  const [filters, setFilters] = useState<RouteFiltersState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [selectedRoute, setSelectedRoute] = useState<GeneratedRoute | null>(null);

  const { routes, isLoading, error, regenerate } = useMultipleRoutes(filters);

  // Live sync van bloeistatussen (30s polling)
  const {
    statuses,
    lastSync,
    isSyncing,
    forceSync,
  } = useLiveBloomSync(initialStatuses);

  // Verrijkt elke route met bloomScore, staleness etc.
  const bloomRoutes = useMemo<BloomAwareRoute[]>(() => {
    const enriched = routes.map((r) => toBloomAwareRoute(r, statuses));
    // Sorteer op bloom score als sort = "meeste_bloei", anders behoud volgorde
    return filters.sort === "meeste_bloei" ? sortByBloomScore(enriched) : enriched;
  }, [routes, statuses, filters.sort]);

  // Staleness van de eerst geladen route (als proxy voor alle routes)
  const overallStaleness = bloomRoutes[0]?.staleness ?? 0;

  function patchFilters(patch: Partial<RouteFiltersState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setSelectedRoute(null);
  }

  const selectedBloomRoute = bloomRoutes.find((r) => r.id === selectedRoute?.id) ?? null;

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: "#FAFAF7" }}>

      {/* Filters */}
      <RouteFilters
        filters={filters}
        onChange={patchFilters}
        onGenerate={() => { setSelectedRoute(null); regenerate(); }}
        isLoading={isLoading}
      />

      {/* Verouderde-data banner */}
      {!isLoading && bloomRoutes.length > 0 && (
        <RouteRefreshBanner
          staleness={overallStaleness}
          isSyncing={isSyncing}
          lastSync={lastSync}
          onRefresh={forceSync}
        />
      )}

      <div className="px-4 pt-5 space-y-4">

        {/* Laad-skeletons */}
        {isLoading && (
          <>
            <p className="text-xs text-center text-gray-400 font-semibold animate-pulse">
              🚴 Fietsroutes ophalen langs bollenvelden...
            </p>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonRouteCard key={i} />)}
          </>
        )}

        {/* Foutmelding */}
        {!isLoading && error && (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <span className="text-4xl">🌧️</span>
            <p className="font-bold text-gray-700">Route tijdelijk niet beschikbaar</p>
            <p className="text-sm text-gray-400">Probeer opnieuw</p>
            <button
              onClick={regenerate}
              className="flex items-center gap-2 mt-2 px-5 py-3 rounded-2xl text-white text-sm font-bold"
              style={{ backgroundColor: "#E8527A" }}
            >
              <RefreshCw size={15} /> Opnieuw proberen
            </button>
          </div>
        )}

        {/* Geen velden gevonden */}
        {!isLoading && !error && bloomRoutes.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center gap-3">
            <Flower2 size={40} className="text-gray-300" />
            <p className="font-bold text-gray-500">Geen velden gevonden in dit gebied</p>
            <p className="text-sm text-gray-400">Vergroot de afstand of kies een ander startpunt</p>
          </div>
        )}

        {/* Route kaarten */}
        {!isLoading && bloomRoutes.map((route) => (
          <div key={route.id}>
            <GeneratedRouteCard
              route={route}
              statuses={statuses}
              onClick={() => setSelectedRoute(
                selectedRoute?.id === route.id ? null : route,
              )}
              isSelected={selectedRoute?.id === route.id}
              bloomData={{
                bloomScore:    route.bloomScore,
                fieldsInBloom: route.fieldsInBloom,
              }}
            />

            {/* Uitklapbare kaartpreview + veldenlijst + bloom info */}
            <AnimatePresence>
              {selectedRoute?.id === route.id && selectedBloomRoute && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 rounded-2xl bg-white shadow-card p-4 space-y-4">

                    {/* Kaart */}
                    <RouteMapPreview
                      route={route}
                      statuses={statuses}
                      className="w-full"
                    />

                    {/* Seizoenscurve */}
                    <BloomRouteComparison currentScore={selectedBloomRoute.bloomScore} />

                    {/* Alternatieve betere routes */}
                    {selectedBloomRoute.bloomScore < 0.4 && (
                      <RouteAlternativeSuggestion
                        currentRoute={selectedBloomRoute}
                        alternatives={bloomRoutes}
                        onSelect={(alt) => setSelectedRoute(alt)}
                      />
                    )}

                    {/* Veldenlijst */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                        {route.fields.length} bollenvelden onderweg
                      </p>
                      <div className="space-y-2">
                        {route.fields.map((field, i) => {
                          const status = statuses.find((s) => s.fieldId === field.id);
                          return (
                            <div
                              key={field.id}
                              className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                            >
                              <span
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold flex-shrink-0"
                                style={{ backgroundColor: "#FEF0F3", color: "#E8527A" }}
                              >
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">
                                  {field.name}
                                </p>
                              </div>
                              {status?.status === "in_bloom" && (
                                <span className="text-sm">🌷</span>
                              )}
                              {status?.status === "fading" && (
                                <span className="text-sm">🌼</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Start navigatie */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${route.startLocation.lat},${route.startLocation.lng}&destination=${route.fields[0].lat},${route.fields[0].lng}&travelmode=bicycling`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white text-sm font-bold"
                      style={{ backgroundColor: "#2D7D46" }}
                    >
                      <MapPin size={16} />
                      Start bij {route.startLocation.label} →
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
