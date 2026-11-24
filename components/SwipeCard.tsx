"use client";

// Veegkaart voor veldontdekking: naar rechts = bezoeken, naar links = overslaan.
// Bediening ook met de drie knoppen eronder (toetsenbord en schermlezer).

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Check, Heart, MapPin, Navigation, X } from "lucide-react";
import { useT } from "@/lib/i18n-context";
import { tap } from "@/lib/haptics";
import { Badge } from "@/components/ui/Badge";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { IconButton } from "@/components/ui/IconButton";
import type { Location } from "@/lib/types";

export type SwipeLocation = Location & { distanceKm: number | null };

interface SwipeCardProps {
  location:     SwipeLocation;
  saved:        boolean;
  onSwipeRight: (id: string) => void;
  onSwipeLeft:  (id: string) => void;
  onSave:       (id: string) => void;
  isTop:        boolean;
}

const SWIPE_THRESHOLD = 80;
const OVERLAY_START   = 40;
const MAX_ROTATE_DEG  = 20;
const FLY_DURATION_MS = 380;

export function SwipeCard({ location, saved, onSwipeRight, onSwipeLeft, onSave, isTop }: SwipeCardProps) {
  const { t } = useT();
  const [dx,     setDx]     = useState(0);
  const [dy,     setDy]     = useState(0);
  const [active, setActive] = useState(false);
  const [flyOut, setFlyOut] = useState<"left" | "right" | null>(null);

  const startX = useRef(0);
  const startY = useRef(0);

  const visitOpacity = dx > OVERLAY_START ? Math.min((dx - OVERLAY_START) / (SWIPE_THRESHOLD - OVERLAY_START), 1) : 0;
  const skipOpacity  = dx < -OVERLAY_START ? Math.min((-dx - OVERLAY_START) / (SWIPE_THRESHOLD - OVERLAY_START), 1) : 0;

  const triggerSwipe = useCallback((dir: "left" | "right") => {
    tap();
    setFlyOut(dir);
    setTimeout(() => {
      if (dir === "right") onSwipeRight(location.id);
      else                 onSwipeLeft(location.id);
    }, FLY_DURATION_MS);
  }, [location.id, onSwipeRight, onSwipeLeft]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isTop || flyOut) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    startY.current = e.clientY;
    setActive(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!active || !isTop) return;
    setDx(e.clientX - startX.current);
    setDy(e.clientY - startY.current);
  }

  function onPointerUp() {
    if (!isTop) return;
    setActive(false);
    if (dx > SWIPE_THRESHOLD)       triggerSwipe("right");
    else if (dx < -SWIPE_THRESHOLD) triggerSwipe("left");
    else { setDx(0); setDy(0); }
  }

  const rotation = (dx / 320) * MAX_ROTATE_DEG;
  const transform = flyOut
    ? `translateX(${flyOut === "right" ? "165%" : "-165%"}) rotate(${flyOut === "right" ? 18 : -18}deg)`
    : active
    ? `translateX(${dx}px) translateY(${dy * 0.25}px) rotate(${rotation}deg)`
    : undefined;
  const transition = active
    ? "none"
    : flyOut
    ? `transform ${FLY_DURATION_MS}ms cubic-bezier(.5,.2,.8,.8), opacity ${FLY_DURATION_MS}ms ease`
    : "transform 280ms cubic-bezier(.25,.46,.45,.94)";

  const flowers = location.flower_type?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  const stopDrag = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div
      style={{ transform, transition, opacity: flyOut ? 0 : 1, touchAction: "none", willChange: "transform" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="w-full select-none"
      aria-hidden={!isTop}
    >
      <article className="overflow-hidden rounded-3xl bg-surface-2 shadow-card">
        {/* ── Foto ─────────────────────────────────────────────── */}
        <div className="relative h-56 overflow-hidden bg-primary-subtle">
          {location.image_url ? (
            <Image
              src={location.image_url}
              alt={location.title}
              fill
              sizes="(max-width: 430px) 100vw, 430px"
              className="pointer-events-none object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Image src="/logo.png" alt="" width={72} height={72} className="rounded-2xl opacity-80" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ opacity: visitOpacity }}>
            <span aria-hidden className="absolute inset-0 bg-success opacity-20" />
            <span className="relative inline-flex -rotate-12 items-center gap-1.5 rounded-xl border-[3px] border-success bg-surface-2 px-4 py-2 text-headline text-success">
              <Check size={22} aria-hidden /> {t("discover_page.visit")}
            </span>
          </div>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ opacity: skipOpacity }}>
            <span aria-hidden className="absolute inset-0 bg-danger opacity-20" />
            <span className="relative inline-flex rotate-12 items-center gap-1.5 rounded-xl border-[3px] border-danger bg-surface-2 px-4 py-2 text-headline text-danger">
              <X size={22} aria-hidden /> {t("discover_page.skip")}
            </span>
          </div>

          {location.distanceKm !== null && (
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 font-mono text-caption text-white backdrop-blur-sm">
              <MapPin size={12} aria-hidden /> {location.distanceKm.toLocaleString()} km
            </span>
          )}
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-surface-2 shadow-sm">
            <BloomBadge status={location.bloom_status} />
          </span>
        </div>

        {/* ── Info ─────────────────────────────────────────────── */}
        <div className="space-y-2 px-4 pt-3.5">
          <h2 className="font-display text-title leading-tight text-ink">{location.title}</h2>
          {(location.address || flowers.length > 0) && (
            <p className="text-caption text-ink-2">
              {[location.address, flowers.join(", ")].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {location.access_type && <Badge>{t(`discover_page.access_${location.access_type}`)}</Badge>}
            {location.parking_info && <Badge>{t("discover_page.parking")}</Badge>}
          </div>
        </div>

        {/* ── Knoppen ──────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-5 px-4 py-4">
          <IconButton
            aria-label={t("discover_page.skip")}
            onPointerDown={stopDrag}
            onClick={() => { if (isTop && !flyOut) triggerSwipe("left"); }}
            className="h-14 w-14 border-2 border-danger text-danger"
            tabIndex={isTop ? 0 : -1}
          >
            <X size={24} strokeWidth={2.6} />
          </IconButton>
          <IconButton
            aria-label={t(saved ? "discover_page.unsave" : "discover_page.save")}
            aria-pressed={saved}
            onPointerDown={stopDrag}
            onClick={() => onSave(location.id)}
            className="border-2 border-primary text-primary"
            tabIndex={isTop ? 0 : -1}
          >
            <Heart size={20} fill={saved ? "currentColor" : "none"} />
          </IconButton>
          <IconButton
            variant="primary"
            aria-label={t("discover_page.visit")}
            onPointerDown={stopDrag}
            onClick={() => { if (isTop && !flyOut) triggerSwipe("right"); }}
            className="h-14 w-14"
            tabIndex={isTop ? 0 : -1}
          >
            <Navigation size={22} />
          </IconButton>
        </div>
      </article>
    </div>
  );
}
