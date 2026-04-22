"use client";

// Hook voor periodieke synchronisatie van bloeistatussen uit Supabase (30s polling)

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { FieldBloomStatus, BloomStatusType } from "@/lib/tulipFields";

const POLL_INTERVAL_MS = 30_000; // 30 seconden

function mapBloomStatus(raw: string | null): BloomStatusType {
  if (raw === "peak" || raw === "blooming") return "in_bloom";
  if (raw === "ending" || raw === "early")  return "fading";
  return "finished";
}

async function fetchFromSupabase(): Promise<FieldBloomStatus[]> {
  const { data } = await supabase
    .from("locations")
    .select("id, bloom_status, updated_at")
    .eq("is_active", true)
    .eq("category", "flower_field")
    .not("bloom_status", "is", null);

  if (!data) return [];

  return data.map((l) => ({
    id:               l.id,
    fieldId:          l.id,
    userId:           "system",
    status:           mapBloomStatus(l.bloom_status),
    timestamp:        new Date(l.updated_at),
    confirmedBy:      0,
    reliabilityScore: 0.8,
  }));
}

interface UseLiveBloomSyncResult {
  statuses:  FieldBloomStatus[];
  lastSync:  Date | null;
  isSyncing: boolean;
  forceSync: () => void;
}

export function useLiveBloomSync(
  initialStatuses: FieldBloomStatus[] = [],
): UseLiveBloomSyncResult {
  const [statuses,  setStatuses]  = useState<FieldBloomStatus[]>(initialStatuses);
  const [lastSync,  setLastSync]  = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const fresh = await fetchFromSupabase();
      // Als Supabase leeg teruggeeft (nog geen bloom_status ingevuld), gebruik initialStatuses
      setStatuses(fresh.length > 0 ? fresh : initialStatuses);
      setLastSync(new Date());
    } catch {
      // Bij netwerk-fout: stille fallback, geen UI-crash
    } finally {
      setIsSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Eerste fetch bij mount
  useEffect(() => {
    sync();
  }, [sync]);

  // Poll elke 30 seconden
  useEffect(() => {
    const id = setInterval(sync, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sync]);

  return { statuses, lastSync, isSyncing, forceSync: sync };
}
