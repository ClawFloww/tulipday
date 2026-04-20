"use client";

// Hook die meerdere fietsroutes genereert via OSRM voor de RouteListScreen

import { useState, useCallback, useEffect } from "react";
import {
  GeneratedRoute,
  RouteFiltersState,
  START_LOCATIONS,
  FIELD_COUNT_RANGE,
  buildGeneratedRoute,
  RouteDirection,
} from "@/lib/routeGenerator";

const DIRECTIONS: RouteDirection[] = ["all", "north", "east", "south"];

interface UseMultipleRoutesResult {
  routes: GeneratedRoute[];
  isLoading: boolean;
  error: string | null;
  regenerate: () => void;
}

export function useMultipleRoutes(filters: RouteFiltersState): UseMultipleRoutesResult {
  const [routes, setRoutes]     = useState<GeneratedRoute[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setRoutes([]);
    setError(null);

    const start = {
      ...START_LOCATIONS[filters.startKey],
      label: START_LOCATIONS[filters.startKey].name,
    };
    const { max: maxFields } = FIELD_COUNT_RANGE[filters.fieldCount];

    // Genereer 4 routes parallel (elk in een andere richting voor variatie)
    const settled = await Promise.allSettled(
      DIRECTIONS.map((dir) =>
        buildGeneratedRoute(start, filters.maxDistanceKm, maxFields, dir),
      ),
    );

    const generated: GeneratedRoute[] = settled
      .filter((r): r is PromiseFulfilledResult<GeneratedRoute> => r.status === "fulfilled")
      .map((r) => r.value)
      // Verwijder routes die identiek zijn (zelfde naam, zelfde afstand)
      .filter((r, i, arr) => arr.findIndex((x) => x.name === r.name) === i);

    setRoutes(generated);
    setLoading(false);

    if (generated.length === 0) {
      setError("Route tijdelijk niet beschikbaar, probeer opnieuw");
    }
  }, [filters.startKey, filters.maxDistanceKm, filters.fieldCount]);

  // Genereer automatisch bij mount en bij filterwijziging
  useEffect(() => {
    generate();
  }, [generate]);

  return { routes, isLoading, error, regenerate: generate };
}
