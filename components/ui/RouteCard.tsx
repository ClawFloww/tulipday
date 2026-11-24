"use client";

import Image from "next/image";
import { Route } from "@/lib/types";
import { Clock, Bike, Car, Footprints, Camera, Users } from "lucide-react";
import { useT } from "@/lib/i18n-context";

const ROUTE_ICON: Record<string, React.ReactNode> = {
  bike:   <Bike       size={11} />,
  car:    <Car        size={11} />,
  walk:   <Footprints size={11} />,
  photo:  <Camera     size={11} />,
  family: <Users      size={11} />,
};

function formatDuration(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? (m > 0 ? `${h} u ${m} min` : `${h} u`) : `${m} min`;
}

export function RouteCard({ route, onClick }: { route: Route; onClick?: () => void }) {
  const { t } = useT();
  const fallback = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600";
  const type = route.route_type;

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-56 rounded-2xl overflow-hidden bg-surface-2 shadow-card
                 border border-line text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                 hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
    >
      <div className="relative h-[200px] overflow-hidden">
        <Image src={route.cover_image_url ?? fallback} alt={route.title ?? "Route"} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {type && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-caption font-bold text-ink shadow-sm">
              {ROUTE_ICON[type]} {t(`route_type.${type}`)}
            </span>
          </div>
        )}
      </div>

      <div className="px-3 pt-2.5 pb-3 space-y-1.5">
        <h3 className="text-sm font-bold leading-tight line-clamp-2 text-ink"
            >
          {route.title}
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-ink-3"
             >
          {route.distance_km != null && <span className="font-medium">{route.distance_km} km</span>}
          {route.duration_minutes != null && (
            <span className="flex items-center gap-0.5">
              <Clock size={10} /> {formatDuration(route.duration_minutes)}
            </span>
          )}
        </div>
        {route.attribution && (
          <p className="text-[9px] truncate" style={{ color: "var(--color-text-3)", opacity: 0.7 }}>
            {route.attribution}
          </p>
        )}
      </div>
    </button>
  );
}
