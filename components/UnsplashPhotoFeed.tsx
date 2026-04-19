"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchUnsplashPhotos, UnsplashPhoto } from "@/lib/unsplash";

// Module-level cache to avoid repeat fetches
const cache = new Map<string, UnsplashPhoto[]>();

interface Props {
  locationName: string;
  maxPhotos?: number;
}

export default function UnsplashPhotoFeed({ locationName, maxPhotos = 8 }: Props) {
  const [photos, setPhotos] = useState<UnsplashPhoto[] | null>(null);

  useEffect(() => {
    const query = `${locationName} tulips`;

    if (cache.has(query)) {
      setPhotos(cache.get(query)!);
      return;
    }

    fetchUnsplashPhotos(query, maxPhotos).then((results) => {
      cache.set(query, results);
      setPhotos(results);
    });
  }, [locationName, maxPhotos]);

  // Loading state
  if (photos === null) {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-40 h-[120px] rounded-xl bg-gray-200 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Empty / error state
  if (photos.length === 0) return null;

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {photos.map((photo) => (
          <a
            key={photo.id}
            href={`${photo.photoLink}?utm_source=tulipday&utm_medium=referral`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 relative w-40 h-[120px] rounded-xl overflow-hidden block"
          >
            <Image
              src={photo.thumbUrl}
              alt={photo.altDescription || locationName}
              fill
              className="object-cover"
              sizes="160px"
            />
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/40">
              <p className="text-[11px] text-white truncate leading-tight">
                {photo.photographerName}
              </p>
            </div>
          </a>
        ))}

        {/* Unsplash attribution */}
        <div className="flex-shrink-0 flex items-end pb-1">
          <a
            href="https://unsplash.com?utm_source=tulipday&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-gray-400 hover:underline whitespace-nowrap"
          >
            Photos from Unsplash
          </a>
        </div>
      </div>
    </div>
  );
}
