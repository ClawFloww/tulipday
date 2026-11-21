"use client";

// Routedetail op de kaart: afstand, geschatte fiets- en wandeltijd, bollenvelden
// en horeca langs de route, en de startknop. Niet-modaal en half hoog, zodat de
// route boven de sheet zichtbaar blijft.

import { useMemo, useState } from "react";
import Image from "next/image";
import { Bike, ChevronRight, Footprints, MapPin, Play, Ruler } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { isCurrentlyOpen } from "@/lib/openingHours";
import { TRAVEL_MIN_PER_KM } from "@/lib/planner/routeOptimizer";
import { Badge } from "@/components/ui/Badge";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { SheetLocation } from "@/components/map/LocationSheet";

export type SheetRoute = {
  id:              string;
  title:           string;
  slug:            string;
  activity:        string | null;
  distance_km:     number | null;
  difficulty:      string | null;
  cover_image_url: string | null;
  geometry_points: [number, number][] | null;
};

export type RouteSheetDetail = {
  description:      string | null;
  duration_minutes: number | null;
};

// Locaties binnen deze afstand van de lijn tellen als "langs de route"
const ALONG_ROUTE_METERS = 250;
const M_PER_DEG_LAT = 111_320;

function fmtMinutes(min: number): string {
  const rounded = Math.round(min);
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60), m = rounded % 60;
  return m === 0 ? `${h} u` : `${h} u ${m} min`;
}

function lengthKm(coords: [number, number][]): number {
  let m = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1], [lng2, lat2] = coords[i];
    const x = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
    m += Math.hypot(x, lat2 - lat1) * M_PER_DEG_LAT;
  }
  return m / 1000;
}

/**
 * Locaties binnen ALONG_ROUTE_METERS van de lijn, op volgorde van waar ze langs
 * de route liggen. Rekent in een lokaal plat vlak; nauwkeurig genoeg op deze schaal.
 */
function alongRoute(coords: [number, number][], locations: SheetLocation[]): SheetLocation[] {
  if (coords.length < 2) return [];
  const kx = Math.cos(coords[0][1] * (Math.PI / 180)) * M_PER_DEG_LAT;
  const pts = coords.map(([lng, lat]) => [lng * kx, lat * M_PER_DEG_LAT] as const);

  const hits: { loc: SheetLocation; segment: number }[] = [];
  for (const loc of locations) {
    if (loc.latitude == null || loc.longitude == null) continue;
    const px = loc.longitude * kx, py = loc.latitude * M_PER_DEG_LAT;
    let best = Infinity, bestSeg = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d < best) { best = d; bestSeg = i; }
    }
    if (best <= ALONG_ROUTE_METERS) hits.push({ loc, segment: bestSeg });
  }
  return hits.sort((a, b) => a.segment - b.segment).map((h) => h.loc);
}

function LocationRow({ location, onSelect }: { location: SheetLocation; onSelect: () => void }) {
  const { t } = useT();
  const isOpen = location.category === "food" ? isCurrentlyOpen(location.opening_hours) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 py-2 min-h-touch text-left rounded-xl
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-surface-3">
        {location.image_url ? (
          <Image src={location.image_url} alt="" fill sizes="48px" className="object-cover" />
        ) : (
          <MapPin size={18} className="absolute inset-0 m-auto text-ink-3" aria-hidden />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label text-ink truncate">{location.title}</p>
        <div className="mt-1">
          {isOpen !== null
            ? <Badge tone={isOpen ? "success" : "danger"}>{t(isOpen ? "map.open_now" : "map.closed_now")}</Badge>
            : <BloomBadge status={location.bloom_status} />}
        </div>
      </div>
      <ChevronRight size={16} className="text-ink-3 flex-shrink-0" aria-hidden />
    </button>
  );
}

export function RouteSheet({
  route,
  coords,
  detail,
  loading,
  locations,
  isOnMap,
  onToggleMap,
  onClose,
  onDetails,
  onStart,
  onLocationSelect,
}: {
  route:            SheetRoute | null;
  /** Routegeometrie in [lng, lat]. */
  coords:           [number, number][];
  detail:           RouteSheetDetail | null;
  loading:          boolean;
  locations:        SheetLocation[];
  isOnMap:          boolean;
  onToggleMap:      () => void;
  onClose:          () => void;
  onDetails:        () => void;
  onStart:          () => void;
  onLocationSelect: (location: SheetLocation) => void;
}) {
  const { t } = useT();
  const [descExpanded, setDescExpanded] = useState(false);

  const along = useMemo(() => alongRoute(coords, locations), [coords, locations]);
  const fields = along.filter((l) => l.category === "flower_field");
  const food   = along.filter((l) => l.category === "food");

  const km = route?.distance_km ?? (coords.length > 1 ? lengthKm(coords) : null);

  return (
    <BottomSheet open={route !== null} onClose={onClose} modal={false} size="half" showClose title={route?.title}>
      {route && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {route.activity && <Badge tone="primary">{route.activity}</Badge>}
            {route.difficulty && <Badge>{route.difficulty}</Badge>}
          </div>

          {km !== null && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { Icon: Ruler,      label: t("route_detail.distance"), value: `${km.toFixed(1)} km` },
                { Icon: Bike,       label: t("map.by_bike"),     value: fmtMinutes(km * TRAVEL_MIN_PER_KM.cycling) },
                { Icon: Footprints, label: t("map.on_foot"),     value: fmtMinutes(km * TRAVEL_MIN_PER_KM.walking) },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-surface-3 px-3 py-2.5">
                  <p className="flex items-center gap-1 text-caption text-ink-2">
                    <Icon size={13} aria-hidden /> {label}
                  </p>
                  <p className="font-mono text-label text-ink mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="md" fullWidth icon={<Play size={16} aria-hidden />} onClick={onStart}>
              {t("map.start_route")}
            </Button>
            <Button size="md" variant="secondary" onClick={onToggleMap} className="flex-shrink-0">
              {t(isOnMap ? "map.route_off_map" : "map.route_on_map")}
            </Button>
            <Button size="md" variant="ghost" onClick={onDetails} className="flex-shrink-0">
              {t("map.details")}
            </Button>
          </div>

          {loading ? (
            <Skeleton variant="text" lines={3} />
          ) : detail?.description ? (
            <div>
              <p className={`text-body text-ink-2 ${descExpanded ? "" : "line-clamp-3"}`}>{detail.description}</p>
              {detail.description.length > 150 && (
                <button
                  type="button"
                  onClick={() => setDescExpanded((p) => !p)}
                  className="mt-1 text-label text-primary min-h-touch focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  {t(descExpanded ? "map.read_less" : "map.read_more")}
                </button>
              )}
            </div>
          ) : null}

          {fields.length > 0 && (
            <section>
              <h3 className="text-label text-ink mb-1">{t("map.along_fields")} · {fields.length}</h3>
              {fields.map((l) => <LocationRow key={l.id} location={l} onSelect={() => onLocationSelect(l)} />)}
            </section>
          )}

          {food.length > 0 && (
            <section>
              <h3 className="text-label text-ink mb-1">{t("map.along_food")} · {food.length}</h3>
              {food.map((l) => <LocationRow key={l.id} location={l} onSelect={() => onLocationSelect(l)} />)}
            </section>
          )}

          <p className="text-caption text-ink-3">© OpenStreetMap contributors</p>
        </div>
      )}
    </BottomSheet>
  );
}
