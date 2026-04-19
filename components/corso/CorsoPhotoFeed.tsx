"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { MapPin, Clock, RefreshCw } from "lucide-react";

interface CorsoPhoto {
  id: string;
  created_at: string;
  caption: string | null;
  image_url: string;
  stop_id: string;
  stop_naam: string;
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s geleden`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m geleden`;
  return `${Math.floor(secs / 3600)}u geleden`;
}

function SkeletonCard() {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white shadow-sm animate-pulse">
      <div className="h-56 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

export function CorsoPhotoFeed({ stopId }: { stopId?: string }) {
  const [photos, setPhotos] = useState<CorsoPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchPhotos = useCallback(async () => {
    try {
      const url = stopId
        ? `/api/corso/photos?stop_id=${encodeURIComponent(stopId)}`
        : "/api/corso/photos";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(data);
    } finally {
      setLoading(false);
      setLastRefresh(Date.now());
    }
  }, [stopId]);

  useEffect(() => {
    fetchPhotos();
    const interval = setInterval(fetchPhotos, 30_000);
    return () => clearInterval(interval);
  }, [fetchPhotos]);

  if (loading) {
    return (
      <div className="space-y-4 px-4">
        {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <p className="text-4xl mb-3">📷</p>
        <p className="text-base font-bold text-gray-700">Nog geen foto&apos;s</p>
        <p className="text-sm text-gray-400 mt-1">Wees de eerste die een foto deelt!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium">{photos.length} foto&apos;s · live</p>
        <button
          onClick={fetchPhotos}
          className="flex items-center gap-1 text-xs text-tulip-500 font-semibold"
        >
          <RefreshCw size={12} /> vernieuwen
        </button>
      </div>

      {photos.map((photo) => (
        <div key={photo.id} className="w-full rounded-2xl overflow-hidden bg-white shadow-sm">
          <div className="relative h-56 w-full">
            <Image
              src={photo.image_url}
              alt={photo.caption ?? "Corso foto"}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 600px"
            />
          </div>
          <div className="p-3">
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-1.5">
              <span className="flex items-center gap-1">
                <MapPin size={11} /> {photo.stop_naam}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} /> {timeAgo(photo.created_at)}
              </span>
            </div>
            {photo.caption && (
              <p className="text-sm text-gray-700 font-medium">{photo.caption}</p>
            )}
          </div>
        </div>
      ))}

      <p className="text-center text-xs text-gray-300 pb-2">
        Automatisch bijgewerkt · {new Date(lastRefresh).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
    </div>
  );
}
