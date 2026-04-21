"use client";

// Volledig scherm foto-weergave met swipe-navigatie

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Heart, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import type { CorsoPhoto } from "@/hooks/useCorsoPhotos";

interface Props {
  photos:       CorsoPhoto[];
  initialIndex: number;
  onClose:      () => void;
  onLike:       (id: string) => void;
  onReport:     (id: string) => void;
  likedIds:     Set<string>;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)   return `${secs}s geleden`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m geleden`;
  return `${Math.floor(secs / 3600)}u geleden`;
}

export function CorsoPhotoModal({
  photos, initialIndex, onClose, onLike, onReport, likedIds,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const photo   = photos[index];
  const canPrev = index > 0;
  const canNext = index < photos.length - 1;

  // Sluit bij Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Swipe links/rechts = volgende/vorige, swipe omlaag = sluiten
  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.velocity.y > 500 || info.offset.y > 160) { onClose(); return; }
    if ((info.velocity.x < -300 || info.offset.x < -80) && canNext) setIndex((i) => i + 1);
    if ((info.velocity.x > 300  || info.offset.x > 80)  && canPrev) setIndex((i) => i - 1);
  }

  if (!photo) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black/96"
      >
        {/* Header: caption + sluiten */}
        <div className="flex items-start justify-between px-4 pt-12 pb-3 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            {photo.caption && (
              <p className="text-white text-sm font-semibold leading-snug line-clamp-2">
                {photo.caption}
              </p>
            )}
            <p className="text-white/50 text-xs mt-0.5">
              {photo.stop_naam && `${photo.stop_naam} · `}{timeAgo(photo.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Foto met swipe-detectie */}
        <motion.div
          drag
          dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          className="flex-1 flex items-center justify-center px-4 select-none cursor-grab active:cursor-grabbing"
        >
          <Image
            src={photo.image_url}
            alt={photo.caption ?? "Corso foto"}
            width={800}
            height={1000}
            className="w-full h-auto max-h-[70vh] object-contain rounded-xl"
            priority
            draggable={false}
          />
        </motion.div>

        {/* Pijl-navigatie (desktop / grote schermen) */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-3 pointer-events-none">
          {canPrev ? (
            <button
              onClick={() => setIndex((i) => i - 1)}
              className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white pointer-events-auto active:scale-90 transition-transform"
            >
              <ChevronLeft size={20} />
            </button>
          ) : <div />}
          {canNext ? (
            <button
              onClick={() => setIndex((i) => i + 1)}
              className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white pointer-events-auto active:scale-90 transition-transform"
            >
              <ChevronRight size={20} />
            </button>
          ) : <div />}
        </div>

        {/* Acties onderaan */}
        <div className="flex items-center justify-between px-7 pb-12 pt-5 flex-shrink-0">
          <button
            onClick={() => { if (!likedIds.has(photo.id)) onLike(photo.id); }}
            className={`flex items-center gap-2 text-sm font-bold transition-colors active:scale-90 ${
              likedIds.has(photo.id) ? "text-red-400" : "text-white/60 hover:text-white"
            }`}
          >
            <Heart size={22} className={likedIds.has(photo.id) ? "fill-red-400" : ""} />
            {photo.likes > 0 ? photo.likes : "Like"}
          </button>

          <span className="text-white/30 text-xs tabular-nums">
            {index + 1} / {photos.length}
          </span>

          <button
            onClick={() => { onReport(photo.id); onClose(); }}
            className="flex items-center gap-2 text-sm font-bold text-white/40 hover:text-red-400 transition-colors active:scale-90"
          >
            <Flag size={18} /> Melden
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
