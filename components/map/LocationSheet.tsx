"use client";

// Sheet bij het aantikken van een locatie op de kaart: foto, bloeistatus en
// "Navigeer hierheen". Niet-modaal, zodat de kaart erboven bedienbaar blijft.

import Image from "next/image";
import { Capacitor } from "@capacitor/core";
import { ChevronRight, MapPin, Navigation } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { isCurrentlyOpen } from "@/lib/openingHours";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { Badge } from "@/components/ui/Badge";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import type { Location } from "@/lib/types";

export type SheetLocation = Pick<Location,
  "id" | "title" | "slug" | "latitude" | "longitude" | "category" |
  "bloom_status" | "address" | "image_url" | "opening_hours"
>;

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=800";

/** Opent de route ernaartoe in Apple Maps (iOS) of Google Maps, op de fiets. */
function openDirections(lat: number, lng: number) {
  const url = Capacitor.getPlatform() === "ios"
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=bicycling`;
  // _system opent in Capacitor de externe app i.p.v. de WebView
  const win = window.open(url, "_system");
  if (!win) window.location.href = url;
}

export function LocationSheet({
  location,
  onClose,
  onDetails,
}: {
  location: SheetLocation | null;
  onClose:  () => void;
  onDetails: () => void;
}) {
  const { t } = useT();
  const isOpen = location?.category === "food" ? isCurrentlyOpen(location.opening_hours) : null;

  return (
    <BottomSheet open={location !== null} onClose={onClose} modal={false} showClose title={location?.title}>
      {location && (
        <div className="flex flex-col gap-4">
          <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-surface-3">
            <Image
              src={location.image_url ?? FALLBACK_IMAGE}
              alt={location.title}
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-cover"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t(`category.${location.category}`)}</Badge>
            <BloomBadge status={location.bloom_status} />
            {isOpen !== null && (
              <Badge tone={isOpen ? "success" : "danger"}>{t(isOpen ? "map.open_now" : "map.closed_now")}</Badge>
            )}
          </div>

          {location.address && (
            <p className="flex items-center gap-1.5 text-caption text-ink-2">
              <MapPin size={14} className="flex-shrink-0" aria-hidden />
              <span className="truncate">{location.address}</span>
            </p>
          )}

          <div className="flex gap-2">
            {location.latitude != null && location.longitude != null && (
              <Button
                fullWidth
                icon={<Navigation size={16} aria-hidden />}
                onClick={() => openDirections(location.latitude as number, location.longitude as number)}
              >
                {t("map.navigate_here")}
              </Button>
            )}
            <Button variant="secondary" onClick={onDetails} className="flex-shrink-0">
              {t("map.details")}
              <ChevronRight size={16} aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
