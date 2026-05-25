"use client";

// Batch-haalt partner-statussen op voor een lijst van location_ids zodat de
// LocationCards in één keer hun badges kunnen tonen. Filtert in de frontend
// op recente updates (< 24u) — oudere statussen worden niet meer als 'live'
// gepresenteerd.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PartnerStatusKind = "bloom" | "operational";

export interface LocationPartnerStatus {
  location_id:  string;
  kind:         PartnerStatusKind;
  status:       string;
  crowd:        string | null;
  notes:        string | null;
  updated_at:   string;
  partner_name: string;
}

const FRESH_MS = 24 * 60 * 60 * 1000;

export function useLocationStatuses(locationIds: string[]): Map<string, LocationPartnerStatus> {
  const [map, setMap] = useState<Map<string, LocationPartnerStatus>>(new Map());

  // Stabiel keypje zodat we niet refetchen op identieke arrays met
  // wisselende referenties.
  const cacheKey = locationIds.slice().sort().join(",");

  useEffect(() => {
    if (locationIds.length === 0) {
      setMap(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("location_partner_status")
        .select("*")
        .in("location_id", locationIds);
      if (cancelled) return;

      const now = Date.now();
      const next = new Map<string, LocationPartnerStatus>();
      for (const row of (data ?? []) as LocationPartnerStatus[]) {
        if (now - new Date(row.updated_at).getTime() < FRESH_MS) {
          next.set(row.location_id, row);
        }
      }
      setMap(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return map;
}
