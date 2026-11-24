"use client";

// Veldontdekking: bollenvelden als veegkaarten, mooiste bloei eerst.
// Rechts = naar de locatiepagina, links = overslaan, hartje = opslaan.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Flower2, MoveHorizontal } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { currentUserId, ensureUser } from "@/lib/auth";
import { BLOOM_RANK } from "@/lib/bloomStatus";
import { useT } from "@/lib/i18n-context";
import { locationPath } from "@/lib/links";
import { haversineDistance } from "@/lib/tulipFields";
import { SwipeCard, type SwipeLocation } from "@/components/SwipeCard";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import type { Location } from "@/lib/types";

const BATCH_SIZE = 20;
const REFILL_AT  = 5;   // nieuwe batch als er nog ≤ 5 kaarten zijn

const FILTERS = ["all", "in_bloom", "early", "nearby", "public"] as const;
type Filter = typeof FILTERS[number];

const STACK = ["scale(1) translateY(0px)", "scale(0.955) translateY(11px)", "scale(0.91) translateY(22px)"];

export default function DiscoverPage() {
  const { locale } = useParams<{ locale: string }>();
  const router     = useRouter();
  const { t }      = useT();

  const [cards,       setCards]       = useState<SwipeLocation[]>([]);
  const [dismissed,   setDismissed]   = useState<Set<string>>(new Set());
  const [savedIds,    setSavedIds]    = useState<Set<string>>(new Set());
  const [filter,      setFilter]      = useState<Filter>("all");
  const [loading,     setLoading]     = useState(true);
  const [failed,      setFailed]      = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);

  const userPos    = useRef<{ lat: number; lng: number } | null>(null);
  const offsetRef  = useRef(0);
  const fetchedIds = useRef(new Set<string>());

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      userPos.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    });
    // Al opgeslagen velden
    currentUserId().then(async (userId) => {
      if (!userId) return;
      const { data } = await supabase.from("saved_items").select("item_id")
        .eq("user_id", userId).eq("item_type", "location");
      if (data) setSavedIds(new Set(data.map((r: { item_id: string }) => r.item_id)));
    });
  }, []);

  const fetchBatch = useCallback(async (reset = false) => {
    if (reset) {
      offsetRef.current = 0;
      fetchedIds.current = new Set();
      setHasMore(true);
      setFailed(false);
    } else {
      setLoadingMore(true);
    }
    const offset = offsetRef.current;

    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .eq("category", "flower_field")
      .order("is_featured", { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    setLoading(false);
    setLoadingMore(false);
    if (error || !data) { if (reset) setFailed(true); return; }

    const pos = userPos.current;
    const batch = (data as Location[])
      .filter((loc) => !fetchedIds.current.has(loc.id))
      .map((loc): SwipeLocation => {
        fetchedIds.current.add(loc.id);
        const distanceKm = pos && loc.latitude != null && loc.longitude != null
          ? Math.round(haversineDistance(pos.lat, pos.lng, loc.latitude, loc.longitude) / 100) / 10
          : null;
        return { ...loc, distanceKm };
      })
      .sort((a, b) => BLOOM_RANK[a.bloom_status ?? "ending"] - BLOOM_RANK[b.bloom_status ?? "ending"]);

    offsetRef.current = offset + data.length;
    setHasMore(data.length === BATCH_SIZE);
    setCards((prev) => (reset ? batch : [...prev, ...batch]));
  }, []);

  useEffect(() => { fetchBatch(true); }, [fetchBatch]);

  const deck = useMemo(() => cards.filter((c) => {
    if (dismissed.has(c.id)) return false;
    switch (filter) {
      case "in_bloom": return c.bloom_status === "peak" || c.bloom_status === "blooming";
      case "early":    return c.bloom_status === "early";
      case "nearby":   return c.distanceKm !== null && c.distanceKm <= 20;
      case "public":   return c.access_type === "public_access";
      default:         return true;
    }
  }), [cards, dismissed, filter]);

  useEffect(() => {
    if (!loading && !loadingMore && hasMore && deck.length <= REFILL_AT) fetchBatch(false);
  }, [deck.length, loading, loadingMore, hasMore, fetchBatch]);

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));

  function handleSwipeRight(id: string) {
    const card = cards.find((c) => c.id === id);
    track("swipe_right", { location_id: id, bloom_status: card?.bloom_status ?? null });
    dismiss(id);
    if (card?.slug) router.push(locationPath(locale, card.slug));
  }

  function handleSwipeLeft(id: string) {
    const card = cards.find((c) => c.id === id);
    track("swipe_left", { location_id: id, bloom_status: card?.bloom_status ?? null });
    dismiss(id);
  }

  async function handleSave(id: string) {
    const userId = await ensureUser();
    if (!userId) { toast.error(t("location.save_failed")); return; }
    const isSaved = savedIds.has(id);
    const { error } = isSaved
      ? await supabase.from("saved_items").delete().eq("user_id", userId).eq("item_type", "location").eq("item_id", id)
      : await supabase.from("saved_items").insert({ item_type: "location", item_id: id });
    if (error) { toast.error(t("location.save_failed")); return; }
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(id); else next.add(id);
      return next;
    });
    if (isSaved) toast.info(t("saved_page.removed"));
    else toast.success(t("common.saved"));
    track("save", { location_id: id, action: isSaved ? "unsave" : "save" });
  }

  function handleReset() {
    setDismissed(new Set());
    setFilter("all");
    setLoading(true);
    fetchBatch(true);
  }

  const visible = deck.slice(0, 3);

  return (
    <div className="min-h-screen bg-surface pb-safe-nav">
      <header className="sticky top-0 z-10 border-b border-line bg-surface-2 pt-safe shadow-sm">
        <div className="flex items-center gap-2 px-3 pt-2">
          <IconButton variant="ghost" aria-label={t("common.back")} onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </IconButton>
          <h1 className="font-display text-title text-ink">{t("discover_page.title")}</h1>
        </div>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-3 pt-2">
          {FILTERS.map((f) => (
            <Chip key={f} selected={filter === f} onClick={() => {
              setFilter(f);
              if (f !== "all") track("filter_applied", { filter: f });
            }}>
              {t(`discover_page.filter_${f}`)}
            </Chip>
          ))}
        </div>
      </header>

      <p className="px-5 py-3 text-caption text-ink-3" aria-live="polite">
        {!loading && !failed && t("discover_page.count", { count: `${deck.length}${hasMore ? "+" : ""}` })}
      </p>

      <div className="relative mx-auto max-w-[430px] px-4" style={{ minHeight: 520 }}>
        {loading ? (
          <Skeleton variant="card" className="h-[460px]" />
        ) : failed ? (
          <EmptyState tone="error" icon={<Flower2 size={28} />} title={t("common.load_error")}
                      actionLabel={t("common.retry")} onAction={handleReset} />
        ) : visible.length === 0 ? (
          <EmptyState icon={<Flower2 size={28} />} title={t("discover_page.all_seen_title")}
                      description={t("discover_page.all_seen_desc")}
                      actionLabel={t("discover_page.start_over")} onAction={handleReset} />
        ) : (
          visible.map((card, index) => (
            <div
              key={card.id}
              className={index === 0 ? "relative" : "absolute inset-x-4 top-0"}
              style={{
                transform:       index === 0 ? undefined : STACK[index],
                transformOrigin: "top center",
                transition:      "transform 300ms cubic-bezier(.25,.46,.45,.94)",
                zIndex:          visible.length - index,
                pointerEvents:   index === 0 ? "auto" : "none",
              }}
            >
              <SwipeCard
                location={card}
                saved={savedIds.has(card.id)}
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                onSave={handleSave}
                isTop={index === 0}
              />
            </div>
          ))
        )}
      </div>

      {visible.length > 0 && !loading && (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-caption text-ink-3">
          {loadingMore ? t("discover_page.load_more") : <><MoveHorizontal size={14} aria-hidden /> {t("discover_page.swipe_hint")}</>}
        </p>
      )}
    </div>
  );
}
