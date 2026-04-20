"use client";

import Image from "next/image";
import { Location } from "@/lib/types";
import { BloomBadge } from "./BloomBadge";
import { MapPin, Star } from "lucide-react";
import { useT } from "@/lib/i18n-context";

export function LocationCard({ location, onClick }: { location: Location; onClick?: () => void }) {
  const { t } = useT();
  const fallback = "https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=600";

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-48 rounded-2xl overflow-hidden bg-surface-2 shadow-card
                 border border-[var(--color-border)] text-left
                 hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
    >
      <div className="relative h-[200px] overflow-hidden">
        <Image src={location.image_url ?? fallback} alt={location.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        {location.bloom_status && (
          <div className="absolute bottom-2 left-2">
            <BloomBadge status={location.bloom_status} />
          </div>
        )}
      </div>

      <div className="px-3 pt-2.5 pb-3 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide"
           style={{ color: "var(--color-primary)" }}>
          {t(`category.${location.category}`)}
        </p>
        <h3 className="text-sm font-bold leading-tight line-clamp-2"
            style={{ color: "var(--color-text)" }}>
          {location.title}
        </h3>

        {location.address && (
          <p className="flex items-center gap-1 text-[11px] truncate"
             style={{ color: "var(--color-text-3)" }}>
            <MapPin size={10} className="flex-shrink-0" />
            <span className="truncate">{location.address}</span>
          </p>
        )}

        {location.photo_score != null && (
          <div className="flex items-center gap-0.5 pt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={10}
                style={{
                  color: i < location.photo_score! ? "#F59E0B" : "var(--color-surface-3)",
                  fill:  i < location.photo_score! ? "#F59E0B" : "var(--color-surface-3)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
