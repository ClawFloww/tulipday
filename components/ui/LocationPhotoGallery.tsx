"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, ChevronLeft, ChevronRight, Flower2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { LocationPhoto } from "@/lib/types";
import { getOrCreateSessionId } from "@/lib/session";
import { useT } from "@/lib/i18n-context";

interface Props {
  locationId: string;
  pendingPhotos?: PendingPhoto[];
}

export interface PendingPhoto {
  id: string;
  previewUrl: string;
}

const MAX_PHOTOS = 10;

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function PhotoSkeleton() {
  return (
    <div className="w-full aspect-[4/3] bg-gray-100 rounded-2xl animate-pulse" />
  );
}

export default function LocationPhotoGallery({ locationId, pendingPhotos = [] }: Props) {
  const { t } = useT();
  const [photos, setPhotos] = useState<LocationPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  const sessionId = typeof window !== "undefined" ? getOrCreateSessionId() : "";

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("location_photos")
      .select("*")
      .eq("location_id", locationId)
      .eq("status", "approved")
      .order("uploaded_at", { ascending: false })
      .limit(MAX_PHOTOS);
    setPhotos(data ?? []);
    setLoading(false);
  }, [locationId]);

  useEffect(() => { load(); }, [load]);

  // Voeg optimistische pending foto's samen met goedgekeurde
  const optimisticPhotos: LocationPhoto[] = pendingPhotos.map((p) => ({
    id: p.id,
    location_id: locationId,
    session_id: sessionId,
    storage_path: "",
    public_url: p.previewUrl,
    caption: null,
    status: "pending",
    bloom_confirmed: false,
    rejection_reason: null,
    uploaded_at: new Date().toISOString(),
    approved_at: null,
    approved_by: null,
  }));

  const allPhotos = [...optimisticPhotos, ...photos];

  function prev() { setActiveIdx((i) => Math.max(0, i - 1)); }
  function next() { setActiveIdx((i) => Math.min(allPhotos.length - 1, i + 1)); }

  if (loading) {
    return (
      <div className="space-y-3">
        <SectionTitle t={t} />
        <PhotoSkeleton />
      </div>
    );
  }

  if (allPhotos.length === 0) {
    return (
      <div className="space-y-3">
        <SectionTitle t={t} />
        <div className="flex flex-col items-center justify-center gap-2 py-8 bg-gray-50 rounded-2xl text-center">
          <Camera size={28} className="text-gray-300" />
          <p className="text-sm font-bold text-gray-700">{t("photos.empty_title")}</p>
          <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">{t("photos.empty_body")}</p>
        </div>
      </div>
    );
  }

  const current = allPhotos[activeIdx];
  const imageUrl = current.public_url ?? "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle t={t} />
        <span className="text-xs text-gray-400 font-medium">
          {activeIdx + 1} / {allPhotos.length}
        </span>
      </div>

      {/* Swipe stack */}
      <div className="relative">
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.id}
            src={imageUrl}
            alt={current.caption ?? "Bezoekersfoto"}
            className="w-full h-full object-cover"
          />

          {/* Overlay badges */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
            {current.status === "pending" && (
              <Badge color="amber" label={t("photos.pending_label")} />
            )}
            {current.status === "approved" && isToday(current.uploaded_at) && (
              <Badge color="green" label={`📸 ${t("photos.badge_today")}`} />
            )}
            {current.bloom_confirmed && (
              <Badge color="tulip" label={`🌷 ${t("photos.badge_bloom")}`} />
            )}
          </div>

          {/* Nav buttons */}
          {activeIdx > 0 && (
            <button
              onClick={prev}
              aria-label="Vorige foto"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                         bg-black/30 backdrop-blur-sm text-white flex items-center justify-center
                         hover:bg-black/50 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {activeIdx < allPhotos.length - 1 && (
            <button
              onClick={next}
              aria-label="Volgende foto"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                         bg-black/30 backdrop-blur-sm text-white flex items-center justify-center
                         hover:bg-black/50 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Caption */}
        {current.caption && (
          <p className="mt-2 text-sm text-gray-600 italic leading-relaxed px-1">
            &ldquo;{current.caption}&rdquo;
          </p>
        )}
      </div>

      {/* Thumbnail strip */}
      {allPhotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {allPhotos.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActiveIdx(i)}
              aria-label={`Foto ${i + 1}`}
              className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all
                ${i === activeIdx ? "border-tulip-400 scale-105" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.public_url ?? ""}
                alt={`Thumbnail ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ t }: { t: (k: string) => string }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
      <Flower2 size={16} className="text-tulip-500" />
      {t("photos.gallery_title")}
    </h2>
  );
}

function Badge({ color, label }: { color: "amber" | "green" | "tulip"; label: string }) {
  const cls = {
    amber: "bg-amber-500/80 text-white",
    green: "bg-green-500/80 text-white",
    tulip: "bg-tulip-500/80 text-white",
  }[color];
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${cls}`}>
      {label}
    </span>
  );
}
