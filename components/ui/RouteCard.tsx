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

const ROUTE_COLOR: Record<string, string> = {
  bike:   "bg-sky-100 text-sky-700",
  car:    "bg-orange-100 text-orange-700",
  walk:   "bg-forest-100 text-forest-600",
  photo:  "bg-tulip-100 text-tulip-600",
  family: "bg-petal/40 text-tulip-600",
};

function formatDuration(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function RouteCard({ route, onClick }: { route: Route; onClick?: () => void }) {
  const { t } = useT();
  const fallback = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600";
  const type = route.route_type;

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-56 rounded-2xl overflow-hidden bg-surface-2 shadow-card
                 border border-[var(--color-border)] text-left
                 hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
    >
      <div className="relative h-[200px] overflow-hidden">
        <Image src={route.cover_image_url ?? fallback} alt={route.title ?? "Route"} fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {type && (
          <div className="absolute bottom-2 left-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROUTE_COLOR[type] ?? "bg-gray-100 text-gray-600"}`}>
              {ROUTE_ICON[type]} {t(`route_type.${type}`)}
            </span>
          </div>
        )}
      </div>

      <div className="px-3 pt-2.5 pb-3 space-y-1.5">
        <h3 className="text-sm font-bold leading-tight line-clamp-2"
            style={{ color: "var(--color-text)" }}>
          {route.title}
        </h3>
        <div className="flex items-center gap-3 text-[11px]"
             style={{ color: "var(--color-text-3)" }}>
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
