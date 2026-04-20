"use client";

// Hook voor periodieke synchronisatie van bloeistatussen (30s polling)

import { useState, useEffect, useCallback, useRef } from "react";
import type { FieldBloomStatus, BloomStatusType } from "@/lib/tulipFields";

const POLL_INTERVAL_MS  = 30_000; // 30 seconden
const CHANGE_PROBABILITY = 0.1;   // 10% kans per veld per poll

// Simuleer een server-update met realistische status-overgangen
function simulateStatusUpdate(statuses: FieldBloomStatus[]): FieldBloomStatus[] {
  const transitions: Record<BloomStatusType, BloomStatusType[]> = {
    in_bloom: ["in_bloom", "in_bloom", "in_bloom", "fading"],
    fading:   ["fading",   "fading",   "finished"],
    finished: ["finished"],
  };

  return statuses.map((s) => {
    if (Math.random() > CHANGE_PROBABILITY) return s;
    const options   = transitions[s.status];
    const newStatus = options[Math.floor(Math.random() * options.length)];
    if (newStatus === s.status) return s;
    return {
      ...s,
      status:           newStatus,
      timestamp:        new Date(),
      reliabilityScore: 0.6,
      confirmedBy:      0,
    };
  });
}

interface UseLiveBloomSyncResult {
  statuses:   FieldBloomStatus[];
  lastSync:   Date | null;
  isSyncing:  boolean;
  forceSync:  () => void;
}

export function useLiveBloomSync(
  initialStatuses: FieldBloomStatus[],
): UseLiveBloomSyncResult {
  const [statuses,  setStatuses]  = useState<FieldBloomStatus[]>(initialStatuses);
  const [lastSync,  setLastSync]  = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useCallback(() => {
    setIsSyncing(true);
    // Productie: fetch("/api/bloom/statuses").then(r => r.json()).then(setStatuses)
    // Demo: simuleer een kleine update na netwerkvertraging
    timerRef.current = setTimeout(() => {
      setStatuses((prev) => simulateStatusUpdate(prev));
      setLastSync(new Date());
      setIsSyncing(false);
    }, 600);
  }, []);

  // Poll elke 30 seconden
  useEffect(() => {
    const id = setInterval(sync, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sync]);

  // Reset statussen als initialStatuses wijzigen (bijv. andere pagina)
  useEffect(() => {
    setStatuses(initialStatuses);
  }, [initialStatuses]);

  return { statuses, lastSync, isSyncing, forceSync: sync };
}
