// useCorsoPhotos — haalt foto's op en beheert realtime updates via Supabase

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

export interface CorsoPhoto {
  id:          string;
  image_url:   string;
  caption:     string | null;
  stop_naam:   string | null;
  likes:       number;
  is_reported: boolean;
  created_at:  string;
  user_id:     string | null;
}

const PAGE_SIZE = 20;

export function useCorsoPhotos() {
  const [photos,        setPhotos]        = useState<CorsoPhoto[]>([]);
  const [totalCount,    setTotalCount]    = useState(0);
  const [isLoading,     setIsLoading]     = useState(true);
  const [hasMore,       setHasMore]       = useState(false);
  const [newPhotoCount, setNewPhotoCount] = useState(0);
  const offsetRef = useRef(0);

  // ── Totaal aantal foto's ophalen ──
  const fetchCount = useCallback(async () => {
    const { count } = await supabase
      .from("corso_photos")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("is_reported", false);
    if (count !== null) setTotalCount(count);
  }, []);

  // ── Pagina foto's ophalen ──
  const fetchPhotos = useCallback(async (reset = false) => {
    if (reset) {
      setIsLoading(true);
      offsetRef.current = 0;
    }

    const offset = reset ? 0 : offsetRef.current;

    const { data, error } = await supabase
      .from("corso_photos")
      .select("id, image_url, caption, stop_naam, likes, is_reported, created_at, user_id")
      .eq("status", "approved")
      .eq("is_reported", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (!error && data) {
      if (reset) {
        setPhotos(data as CorsoPhoto[]);
      } else {
        setPhotos((prev) => [...prev, ...(data as CorsoPhoto[])]);
      }
      offsetRef.current = offset + data.length;
      setHasMore(data.length === PAGE_SIZE);
    }

    if (reset) setIsLoading(false);
  }, []);

  // ── Ververs inclusief nieuwe foto's ──
  const refreshWithNew = useCallback(async () => {
    setNewPhotoCount(0);
    await fetchPhotos(true);
    await fetchCount();
  }, [fetchPhotos, fetchCount]);

  // ── Meer laden (paginering) ──
  const loadMore = useCallback(async () => {
    await fetchPhotos(false);
  }, [fetchPhotos]);

  // ── Like toevoegen ──
  const likePhoto = useCallback(async (id: string) => {
    // Optimistisch updaten in UI
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)),
    );
    // DB: haal huidige waarde op en verhoog
    const { data } = await supabase
      .from("corso_photos")
      .select("likes")
      .eq("id", id)
      .single();
    if (data) {
      await supabase
        .from("corso_photos")
        .update({ likes: (data as { likes: number }).likes + 1 })
        .eq("id", id);
    }
  }, []);

  // ── Foto melden ──
  const reportPhoto = useCallback(async (id: string) => {
    // Meteen verbergen uit feed
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setTotalCount((c) => Math.max(0, c - 1));
    await supabase
      .from("corso_photos")
      .update({ is_reported: true })
      .eq("id", id);
  }, []);

  // ── Init: fetch + realtime ──
  useEffect(() => {
    fetchPhotos(true);
    fetchCount();

    // Realtime: luister naar nieuwe inserts
    const channel = supabase
      .channel("corso_photos_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "corso_photos" },
        (payload) => {
          const photo = payload.new as CorsoPhoto;
          if ((photo as { status?: string }).status !== "approved") return;
          if (photo.is_reported) return;
          setNewPhotoCount((n) => n + 1);
          setTotalCount((c) => c + 1);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPhotos, fetchCount]);

  return {
    photos,
    totalCount,
    isLoading,
    hasMore,
    newPhotoCount,
    loadMore,
    refreshWithNew,
    likePhoto,
    reportPhoto,
  };
}
