"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { SwipeCard }   from "@/components/SwipeCard";
import { FilterChips } from "@/components/FilterChips";
import { supabase }    from "@/lib/supabase";
import { locationToFieldData, filterByStatus, filterByDistance } from "@/lib/bloomStatus";
import type { FieldData } from "@/lib/bloomStatus";
import type { Location }  from "@/lib/types";
import { Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

const BATCH_SIZE  = 20;   // per fetch
const REFILL_AT   = 5;    // laad nieuwe batch als er nog ≤ 5 kaarten zijn

// Bloei-volgorde: peak eerst, dan blooming, early, ending
const BLOOM_ORDER = ["peak", "blooming", "early", "ending"];

const CHIPS = ["Alle", "In bloei", "Bijna", "Voorbij", "Tulpen", "< 20 km", "Vrij toegankelijk"];

export default function DiscoverPage() {
  const { locale }       = useParams<{ locale: string }>();
  const router           = useRouter();

  const [fields,      setFields]      = useState<FieldData[]>([]);
  const [dismissed,   setDismissed]   = useState<Set<string>>(new Set());
  const [savedIds,    setSavedIds]    = useState<Set<string>>(new Set());
  const [visitedIds,  setVisitedIds]  = useState<Set<string>>(new Set());
  const [activeChip,  setActiveChip]  = useState("Alle");
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);

  const userPos    = useRef<{ lat: number; lng: number } | null>(null);
  const offsetRef  = useRef(0);
  const fetchedIds = useRef(new Set<string>());

  // Gebruikerslocatie ophalen
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      userPos.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    });
  }, []);

  const fetchBatch = useCallback(async (reset = false) => {
    if (reset) {
      offsetRef.current = 0;
      fetchedIds.current = new Set();
      setHasMore(true);
    }

    const offset = offsetRef.current;
    if (!reset) setLoadingMore(true);

    // Haal locaties op gesorteerd op bloei-status
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .eq("category", "flower_field")
      .order("bloom_status", { ascending: false }) // peak > blooming > early > ending alfabetisch werkt niet ideaal
      .range(offset, offset + BATCH_SIZE - 1);

    if (error || !data) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    // Sorteer batch op bloei-volgorde
    const sorted = [...data].sort(
      (a, b) =>
        BLOOM_ORDER.indexOf(a.bloom_status ?? "ending") -
        BLOOM_ORDER.indexOf(b.bloom_status ?? "ending"),
    );

    const { lat, lng } = userPos.current ?? {};
    const newFields = sorted
      .filter((loc) => !fetchedIds.current.has(loc.id))
      .map((loc) => {
        fetchedIds.current.add(loc.id);
        return locationToFieldData(loc as Location, lat, lng);
      });

    offsetRef.current = offset + data.length;
    setHasMore(data.length === BATCH_SIZE);

    if (reset) {
      setFields(newFields);
      setLoading(false);
    } else {
      setFields((prev) => [...prev, ...newFields]);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchBatch(true); }, [fetchBatch]);

  // Filter
  const deck = useMemo(() => {
    let base = fields.filter((f) => !dismissed.has(f.id));
    switch (activeChip) {
      case "In bloei":
      case "Bijna":
      case "Voorbij":
        base = filterByStatus(base, activeChip);
        break;
      case "< 20 km":
        base = filterByDistance(base, 20);
        break;
      case "Tulpen":
        base = base.filter((f) => f.flowerTypes.some((t) => t.toLowerCase().includes("tulp")));
        break;
      case "Vrij toegankelijk":
        base = base.filter((f) => f.tags.includes("Vrij toegankelijk"));
        break;
    }
    return base;
  }, [fields, dismissed, activeChip]);

  const visibleFields = deck.slice(0, 3);

  // Laad nieuwe batch wanneer deck klein wordt
  useEffect(() => {
    if (!loadingMore && hasMore && deck.length <= REFILL_AT) {
      fetchBatch(false);
    }
  }, [deck.length, loadingMore, hasMore, fetchBatch]);

  function handleSwipeRight(id: string) {
    const field = fields.find((f) => f.id === id);
    track("swipe_right", { location_id: id, bloom_status: field?.bloomStatus ?? null });
    setVisitedIds((prev) => { const s = new Set(prev); s.add(id); return s; });
    setDismissed((prev)  => { const s = new Set(prev); s.add(id); return s; });
    // Navigeer naar locatiepagina na korte delay
    if (field?.slug) {
      setTimeout(() => router.push(`/${locale}/location/${field.slug}`), 400);
    }
  }

  function handleSwipeLeft(id: string) {
    const field = fields.find((f) => f.id === id);
    track("swipe_left", { location_id: id, bloom_status: field?.bloomStatus ?? null });
    setDismissed((prev) => { const s = new Set(prev); s.add(id); return s; });
  }

  function handleSave(id: string) {
    setSavedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function handleReset() {
    setDismissed(new Set());
    setSavedIds(new Set());
    setVisitedIds(new Set());
    setActiveChip("Alle");
    fetchBatch(true);
  }

  return (
    <div className="min-h-screen bg-warm" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm">
        <h1 className="text-xl font-extrabold text-[#1A1A1A] mb-4">🌷 Ontdek velden</h1>
        <FilterChips chips={CHIPS} active={activeChip} onChange={(chip) => {
          setActiveChip(chip);
          if (chip !== "Alle") track("filter_applied", { filter: chip });
        }} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 px-5 py-3 text-xs font-semibold text-gray-400">
        {loading ? (
          <span>Laden…</span>
        ) : (
          <>
            <span>{deck.length}{hasMore ? "+" : ""} velden</span>
            {visitedIds.size > 0 && <span style={{ color: "#639922" }}>{visitedIds.size} te bezoeken 📍</span>}
            {savedIds.size > 0   && <span style={{ color: "#F472B6" }}>{savedIds.size} opgeslagen ♥</span>}
          </>
        )}
      </div>

      {/* Card deck */}
      <div
        className="relative mx-auto"
        style={{ maxWidth: 430, paddingLeft: 16, paddingRight: 16, minHeight: 520 }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white" style={{ height: 460, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
            <Loader2 size={36} className="text-tulip-400 animate-spin" />
            <p className="text-sm text-gray-400 mt-3">Velden laden…</p>
          </div>
        ) : visibleFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white text-center" style={{ height: 460, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
            <span style={{ fontSize: 56 }}>🌷</span>
            <p className="text-lg font-extrabold text-[#1A1A1A] mt-4 mb-2">Alle velden bekeken!</p>
            <p className="text-sm text-gray-400 mb-6 px-8">Probeer een ander filter of begin opnieuw.</p>
            <button onClick={handleReset} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: "#639922" }}>
              Opnieuw beginnen
            </button>
          </div>
        ) : (
          visibleFields.map((field, index) => {
            const stackTransforms = [
              "scale(1)     translateY(0px)",
              "scale(0.955) translateY(11px)",
              "scale(0.91)  translateY(22px)",
            ];
            return (
              <div
                key={field.id}
                style={{
                  position:        index === 0 ? "relative" : "absolute",
                  top:             index === 0 ? undefined : 0,
                  left:            index === 0 ? undefined : 16,
                  right:           index === 0 ? undefined : 16,
                  transform:       index === 0 ? undefined : stackTransforms[index],
                  transformOrigin: "top center",
                  transition:      "transform 300ms cubic-bezier(.25,.46,.45,.94)",
                  zIndex:          visibleFields.length - index,
                  pointerEvents:   index === 0 ? "auto" : "none",
                }}
              >
                <SwipeCard
                  field={field}
                  onSwipeRight={handleSwipeRight}
                  onSwipeLeft={handleSwipeLeft}
                  onSave={handleSave}
                  isTop={index === 0}
                />
              </div>
            );
          })
        )}

        {/* Meer laden indicator */}
        {loadingMore && !loading && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <span className="text-xs text-gray-300 flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> meer velden laden…
            </span>
          </div>
        )}
      </div>

      {visibleFields.length > 0 && !loading && (
        <p className="text-center text-xs text-gray-300 mt-4 pb-2">sleep of gebruik de knoppen</p>
      )}
    </div>
  );
}
