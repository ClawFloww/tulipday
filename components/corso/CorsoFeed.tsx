"use client";

// Masonry foto-feed met realtime updates, likes en meldingen

import { useState, useCallback } from "react";
import Image from "next/image";
import { Heart, Flag, MoreHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCorsoPhotos, type CorsoPhoto } from "@/hooks/useCorsoPhotos";
import { CorsoPhotoModal } from "./CorsoPhotoModal";
import { supabase } from "@/lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)   return `${secs}s geleden`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m geleden`;
  return `${Math.floor(secs / 3600)}u geleden`;
}

// ── Foto-kaart ────────────────────────────────────────────────────────────────

function PhotoCard({
  photo, onLike, onReport, onOpen, liked,
}: {
  photo:    CorsoPhoto;
  onLike:   (id: string) => void;
  onReport: (id: string) => void;
  onOpen:   (photo: CorsoPhoto) => void;
  liked:    boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl overflow-hidden shadow-card mb-2"
      style={{ backgroundColor: "var(--color-surface-2)" }}
    >
      {/* Foto */}
      <button className="relative w-full block" onClick={() => onOpen(photo)}>
        <Image
          src={photo.image_url}
          alt={photo.caption ?? "Corso foto"}
          width={400}
          height={600}
          className="w-full h-auto object-cover"
          sizes="50vw"
        />
      </button>

      {/* Meta */}
      <div className="px-2.5 pt-1.5 pb-2">
        {photo.caption && (
          <p className="text-xs font-medium leading-snug mb-1.5 line-clamp-2"
             style={{ color: "var(--color-text)" }}>
            {photo.caption}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Like */}
            <button
              onClick={() => { if (!liked) onLike(photo.id); }}
              className={`flex items-center gap-1 text-xs font-semibold transition-all active:scale-90 ${
                liked ? "text-[#F0306A]" : "hover:text-[#F0306A]"
              }`}
              style={{ color: liked ? "#F0306A" : "var(--color-text-3)" }}
            >
              <Heart size={13} className={liked ? "fill-[#F0306A]" : ""} />
              {photo.likes > 0 && <span>{photo.likes}</span>}
            </button>

            <span className="text-[10px]" style={{ color: "var(--color-text-3)" }}>
              {timeAgo(photo.created_at)}
            </span>
          </div>

          {/* Drie stippen menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-surface-3"
              style={{ color: "var(--color-text-3)" }}
            >
              <MoreHorizontal size={14} />
            </button>

            {showMenu && (
              <div
                className="absolute bottom-7 right-0 z-10 rounded-xl overflow-hidden shadow-lg border border-[var(--color-border)] min-w-[130px]"
                style={{ backgroundColor: "var(--color-surface-2)" }}
              >
                <button
                  onClick={() => { onReport(photo.id); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold text-[#F0306A] hover:bg-[#FFF0F5] dark:hover:bg-[#F0306A]/10 transition-colors"
                >
                  <Flag size={12} /> Foto melden
                </button>
                <button
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold hover:bg-surface-3 transition-colors"
                  style={{ color: "var(--color-text-2)" }}
                >
                  <X size={12} /> Annuleren
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  const heights = [192, 144, 240, 160, 200, 112];
  return (
    <div className="px-4 flex gap-2">
      {[0, 1].map((col) => (
        <div key={col} className="flex-1">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className="rounded-2xl skeleton-shimmer mb-2"
              style={{ height: heights[col * 3 + row] }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Testfoto's aanmaken (alleen development) ──────────────────────────────────

async function generateTestPhotos() {
  const stops = ["Noordwijk", "Sassenheim", "Lisse", "Hillegom", "Haarlem"];
  const captions = [
    "Prachtige wagens! 🌷",
    "De stoet is hier zojuist voorbijgekomen",
    "Wat een kleurenpracht!",
    "Geweldig sfeer op de boulevard",
    null,
  ];

  await Promise.all(
    Array.from({ length: 10 }).map((_, i) =>
      supabase.from("corso_photos").insert({
        image_url: `https://picsum.photos/seed/corso${i}/400/600`,
        caption:   captions[i % captions.length],
        stop_naam: stops[i % stops.length],
        stop_id:   stops[i % stops.length],
        status:    "approved",
        likes:     Math.floor(Math.random() * 20),
      }),
    ),
  );
}

// ── Hoofd-component ───────────────────────────────────────────────────────────

export function CorsoFeed() {
  const {
    photos, totalCount, isLoading, hasMore,
    newPhotoCount, loadMore, refreshWithNew,
    likePhoto, reportPhoto,
  } = useCorsoPhotos();

  // Bijgehouden likes in localStorage (geen account nodig)
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("corso_liked");
      return new Set(stored ? (JSON.parse(stored) as string[]) : []);
    } catch { return new Set(); }
  });

  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const handleLike = useCallback((id: string) => {
    if (likedIds.has(id)) return;
    const next = new Set(Array.from(likedIds).concat(id));
    setLikedIds(next);
    localStorage.setItem("corso_liked", JSON.stringify(Array.from(next)));
    likePhoto(id);
  }, [likedIds, likePhoto]);

  const handleReport = useCallback((id: string) => {
    reportPhoto(id);
  }, [reportPhoto]);

  const openModal = (photo: CorsoPhoto) => {
    const idx = photos.findIndex((p) => p.id === photo.id);
    if (idx >= 0) setModalIndex(idx);
  };

  // Verdeel foto's over 2 kolommen voor masonry-effect
  const col1 = photos.filter((_, i) => i % 2 === 0);
  const col2 = photos.filter((_, i) => i % 2 !== 0);

  return (
    <div className="pb-8">

      {/* Live teller banner */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-70"
                style={{ backgroundColor: "#F0306A" }} />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5"
                style={{ backgroundColor: "#F0306A" }} />
        </span>
        <span className={`text-xs font-bold transition-all ${totalCount > 0 ? "scale-105" : ""}`}
              style={{ color: "var(--color-text-2)" }}>
          🌸 {totalCount} foto{totalCount !== 1 ? "'s" : ""} gedeeld vandaag · LIVE
        </span>
      </div>

      {/* Nieuwe foto's banner */}
      <AnimatePresence>
        {newPhotoCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mb-3"
          >
            <button
              onClick={refreshWithNew}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-all"
              style={{ backgroundColor: "#F0306A" }}
            >
              ↑ {newPhotoCount} nieuwe foto{newPhotoCount !== 1 ? "'s" : ""} · Tik om te vernieuwen
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lege state */}
      {!isLoading && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-5xl mb-4">📷</p>
          <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
            Wees de eerste die een foto deelt!
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-3)" }}>
            Deel je beleving van het Bloemencorso
          </p>
        </div>
      )}

      {/* Skeleton */}
      {isLoading && <SkeletonGrid />}

      {/* Masonry grid */}
      {!isLoading && photos.length > 0 && (
        <div className="px-4 flex gap-2">
          <div className="flex-1">
            {col1.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onLike={handleLike}
                onReport={handleReport}
                onOpen={openModal}
                liked={likedIds.has(photo.id)}
              />
            ))}
          </div>
          <div className="flex-1">
            {col2.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onLike={handleLike}
                onReport={handleReport}
                onOpen={openModal}
                liked={likedIds.has(photo.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Meer laden */}
      {!isLoading && hasMore && (
        <div className="px-4 pt-4">
          <button
            onClick={loadMore}
            className="w-full py-3 rounded-xl border text-sm font-bold transition-colors hover:bg-surface-2 active:scale-95"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-2)" }}
          >
            Meer laden
          </button>
        </div>
      )}

      {/* Testknop — alleen in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="px-4 pt-6">
          <button
            onClick={generateTestPhotos}
            className="w-full py-2.5 rounded-xl border border-dashed text-xs font-semibold transition-colors hover:bg-surface-2"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-3)" }}
          >
            🧪 Genereer 10 testfoto&apos;s (dev only)
          </button>
        </div>
      )}

      {/* Volledig scherm modal */}
      {modalIndex !== null && (
        <CorsoPhotoModal
          photos={photos}
          initialIndex={modalIndex}
          onClose={() => setModalIndex(null)}
          onLike={handleLike}
          onReport={handleReport}
          likedIds={likedIds}
        />
      )}
    </div>
  );
}
