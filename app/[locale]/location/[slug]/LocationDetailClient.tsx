"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, MapPin, Star, Heart, Navigation,
  ChevronRight, Camera, Clock, Footprints, ParkingCircle,
  ShieldCheck, Flower2, Users, Plus, Share2, Check, ExternalLink, SearchX,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n-context";
import { publicUrl, resolveParam } from "@/lib/links";
import { isCurrentlyOpen, getWeekSchedule } from "@/lib/openingHours";
import { currentUserId, ensureUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { Badge } from "@/components/ui/Badge";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/Toast";
import PhotoUploadSheet from "@/components/ui/PhotoUploadSheet";
import LocationPhotoGallery, { PendingPhoto } from "@/components/ui/LocationPhotoGallery";
import UnsplashPhotoFeed from "@/components/UnsplashPhotoFeed";
import type { Location, AccessType, Category } from "@/lib/types";
import type { DayKey } from "@/lib/openingHours";

const CATEGORY_TONE: Record<Category, "primary" | "info" | "warning" | "neutral" | "success"> = {
  flower_field: "primary",
  photo_spot:   "info",
  attraction:   "warning",
  food:         "warning",
  parking:      "neutral",
  bike_rental:  "success",
};

const CROWD_KEYS = ["crowd_very_quiet", "crowd_quiet", "crowd_moderate", "crowd_busy", "crowd_very_busy"];
const CROWD_COLORS = ["bg-success", "bg-success", "bg-warning", "bg-warning", "bg-danger"];

// Hoogte van de actiebalk boven de navigatiebalk (+ marge), voor de paginapadding
const ACTION_BAR_HEIGHT        = 88;
const ACTION_BAR_HEIGHT_SITE   = 144;

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-2 rounded-2xl border border-line p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-ink-3">
        {icon}
        <span className="text-caption font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-[15px] font-bold leading-snug text-ink">{value}</p>
      {sub && <p className="text-label font-normal leading-snug text-ink-2">{sub}</p>}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-surface" aria-busy="true">
      <Skeleton className="h-72 w-full !rounded-none" />
      <div className="px-5 py-5 space-y-4">
        <Skeleton className="h-6 w-24 !rounded-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton variant="text" lines={3} />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
}

export default function LocationDetailPage() {
  const params       = useParams<{ slug: string; locale: string }>();
  const searchParams = useSearchParams();
  const slug         = resolveParam(params.slug, searchParams, "slug");
  const router       = useRouter();
  const { t }        = useT();

  const [location, setLocation] = useState<Location | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadKey, setUploadKey]   = useState(0);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [copied, setCopied] = useState(false);
  const [showStreetView, setShowStreetView] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase.from("locations").select("*").eq("slug", slug).eq("is_active", true).single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else {
          setLocation(data);
          track("location_detail", { location_id: data.id, slug, bloom_status: data.bloom_status ?? null, category: data.category });
        }
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!location) return;
    currentUserId().then(async (userId) => {
      if (!userId) return;
      const { data } = await supabase.from("saved_items").select("id")
        .eq("user_id", userId).eq("item_type", "location").eq("item_id", location.id)
        .maybeSingle();
      setSaved(!!data);
    });
  }, [location]);

  async function handleSave() {
    if (!location || saving) return;
    setSaving(true);
    const userId = await ensureUser();
    if (!userId) { setSaving(false); toast.error(t("location.save_failed")); return; }
    if (saved) {
      const { error } = await supabase.from("saved_items").delete()
        .eq("user_id", userId).eq("item_type", "location").eq("item_id", location.id);
      if (error) toast.error(t("location.save_failed"));
      else {
        setSaved(false);
        toast.info(t("saved_page.removed"));
        track("save", { location_id: location.id, action: "unsave" });
      }
    } else {
      const { error } = await supabase.from("saved_items").insert({ item_type: "location", item_id: location.id });
      if (error) toast.error(t("location.save_failed"));
      else {
        setSaved(true);
        toast.success(t("common.saved"));
        track("save", { location_id: location.id, action: "save" });
      }
    }
    setSaving(false);
  }

  function handleNavigate() {
    if (!location?.latitude || !location?.longitude) return;
    track("navigate", { location_id: location.id });
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`, "_blank");
  }

  async function handleShare() {
    if (!location) return;
    const url = publicUrl(`/${params.locale}/location/${location.slug}`);
    const shareData = {
      title: location.title,
      text: location.short_description ?? t("location.share_text", { title: location.title }),
      url,
    };
    track("share", { location_id: location.id });
    if (typeof navigator.share === "function") {
      try { await navigator.share(shareData); return; } catch { /* cancelled */ }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("common.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch { /* no clipboard access */ }
  }

  if (loading) return <DetailSkeleton />;

  if (notFound || !location) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center pb-safe-nav">
        <EmptyState icon={<SearchX size={28} />} title={t("location.not_found_title")}
                    description={t("location.not_found_desc")}
                    actionLabel={t("common.go_back")} onAction={() => router.back()} />
      </div>
    );
  }

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  // Embed API (gratis, interactief) ipv Static API (betaald)
  const streetViewEmbedUrl = location.latitude && location.longitude && mapsKey
    ? `https://www.google.com/maps/embed/v1/streetview?key=${mapsKey}&location=${location.latitude},${location.longitude}&fov=90&pitch=10`
    : null;

  const fallback = "https://images.unsplash.com/photo-1490750967868-88df5691cc8c?w=1200";
  const mainPhoto = location.image_url ?? fallback;
  const displayImage = imgError ? fallback : mainPhoto;

  const catTone = CATEGORY_TONE[location.category] ?? "neutral";
  const crowdIdx = Math.min((location.crowd_score ?? 1) - 1, 4);

  const accessMap: Record<AccessType, { label: string; desc: string }> = {
    roadside_only:     { label: t("access.roadside"), desc: t("access.roadside_desc") },
    public_access:     { label: t("access.public"),   desc: t("access.public_desc")   },
    private_view_only: { label: t("access.private"),  desc: t("access.private_desc")  },
  };
  const access = location.access_type ? accessMap[location.access_type] : null;

  const etiquetteRules = [
    { emoji: "🌷", rule: t("location.etiquette_rule1") },
    { emoji: "🚷", rule: t("location.etiquette_rule2") },
    { emoji: "🚗", rule: t("location.etiquette_rule3") },
    { emoji: "📸", rule: t("location.etiquette_rule4") },
    { emoji: "🔇", rule: t("location.etiquette_rule5") },
    { emoji: "🗑️", rule: t("location.etiquette_rule6") },
  ];

  return (
    <div className="min-h-screen bg-surface"
         style={{ paddingBottom: `calc(var(--nav-height) + env(safe-area-inset-bottom) + ${location.website_url ? ACTION_BAR_HEIGHT_SITE : ACTION_BAR_HEIGHT}px)` }}>

      <div className="relative h-72 sm:h-96 overflow-hidden bg-surface-3">
        {showStreetView && streetViewEmbedUrl ? (
          <iframe
            src={streetViewEmbedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <>
            <Image
              src={displayImage}
              alt={location.title}
              fill
              className="object-cover transition-opacity duration-300"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />
          </>
        )}

        {/* Bovenbalk: terug + Street View, onder de notch */}
        <div className="absolute inset-x-4 z-10 flex items-center justify-between top-[calc(env(safe-area-inset-top)+12px)]">
          <IconButton variant="overlay" aria-label={t("location.back")} onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </IconButton>
          {streetViewEmbedUrl && (
            <button
              onClick={() => setShowStreetView((v) => !v)}
              aria-pressed={showStreetView}
              className={`flex items-center gap-1.5 min-h-touch px-4 rounded-full backdrop-blur-md text-label transition-colors duration-fast active:scale-95
                          ${showStreetView ? "bg-surface-2 text-ink shadow-md" : "bg-black/40 text-white"}`}
            >
              <MapPin size={14} aria-hidden />
              {showStreetView ? t("location.photo_view") : "Street View"}
            </button>
          )}
        </div>

        {location.bloom_status && (
          // Vaste achtergrond zodat de badge leesbaar blijft op elke foto
          <div className="absolute bottom-4 left-4 rounded-full bg-surface-2 shadow-md">
            <BloomBadge status={location.bloom_status} />
          </div>
        )}
        {location.photo_score != null && (
          <div className="absolute bottom-4 right-4 flex items-center gap-0.5 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-full"
               aria-label={`${t("location.photo_score")}: ${location.photo_score}/5`}>
            {Array.from({ length: location.photo_score }).map((_, i) => (
              <Star key={i} size={12} className="text-warning fill-current" aria-hidden />
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-6">

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge tone={catTone} icon={<Flower2 size={11} />}>{t(`category.${location.category}`)}</Badge>
          </div>
          <h1 className="text-display text-ink mb-1">{location.title}</h1>
          {location.address && (
            <p className="flex items-center gap-1.5 text-body text-ink-2">
              <MapPin size={14} className="text-primary flex-shrink-0" aria-hidden /> {location.address}
            </p>
          )}
          {location.photo_score != null && (
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} aria-hidden
                      className={i < location.photo_score! ? "text-warning fill-current" : "text-line-strong fill-current"} />
              ))}
              <span className="text-caption ml-1 text-ink-3">{t("location.photo_score")}</span>
            </div>
          )}
        </div>

        {location.short_description && (
          <p className="text-body leading-relaxed text-ink-2">{location.short_description}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {location.best_visit_time && (
            <InfoCard icon={<Clock size={15} />} label={t("location.best_time")} value={location.best_visit_time} />
          )}
          {location.parking_info && (
            <InfoCard
              icon={<ParkingCircle size={15} />}
              label={t("location.parking")}
              value={location.parking_info.split(".")[0]}
              sub={location.parking_info.includes(".") ? location.parking_info.slice(location.parking_info.indexOf(".") + 1).trim() : undefined}
            />
          )}
          {access && (
            <InfoCard icon={<Footprints size={15} />} label={t("location.access")} value={access.label} sub={access.desc} />
          )}
          {location.flower_type && (
            <InfoCard
              icon={<Flower2 size={15} />}
              label={t("location.flower_type")}
              value={location.flower_type.split(",").map((s) => s.trim().charAt(0).toUpperCase() + s.trim().slice(1)).join(", ")}
            />
          )}
        </div>

        {location.category === "food" && (
          <OpeningHoursCard hours={location.opening_hours} t={t} />
        )}

        {location.crowd_score != null && (
          <div className="bg-surface-2 rounded-2xl border border-line p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-ink-3">
              <Users size={15} />
              <span className="text-caption font-semibold uppercase tracking-wide">{t("location.crowd_level")}</span>
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full ${i < location.crowd_score! ? CROWD_COLORS[crowdIdx] : "bg-surface-3"}`} />
              ))}
            </div>
            <p className="text-[15px] font-bold text-ink">{t(`location.${CROWD_KEYS[crowdIdx]}`)}</p>
          </div>
        )}

        {(location.category === "photo_spot" || (location.photo_score ?? 0) >= 4) && (
          <div className="bg-surface-2 rounded-2xl border border-line p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera size={16} className="text-info" />
              <h3 className="text-headline text-ink">{t("location.photography_tips")}</h3>
            </div>
            <ul className="space-y-2">
              {(["tip_golden_hour", "tip_wide_angle", "tip_overcast", "tip_low_angle"] as const).map((key) => (
                <li key={key} className="flex items-start gap-2 text-label font-normal text-ink-2">
                  <ChevronRight size={14} className="mt-0.5 flex-shrink-0 text-info" aria-hidden /> {t(`location.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <UnsplashPhotoFeed locationName={`${location.title} bloemen`} />

        {location.full_description && (
          <div>
            <h2 className="text-headline text-ink mb-2">{t("location.about")}</h2>
            <p className="text-body leading-relaxed whitespace-pre-line text-ink-2">{location.full_description}</p>
          </div>
        )}

        {/* ── Foto galerij ── */}
        <div>
          <LocationPhotoGallery locationId={location.id} pendingPhotos={pendingPhotos} />
          <button
            onClick={() => { setUploadKey((k) => k + 1); setShowUpload(true); }}
            className="mt-3 w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl
                       border-2 border-dashed border-line-strong text-primary font-bold text-[15px]
                       hover:border-primary hover:bg-primary-subtle transition-colors duration-fast
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus size={16} /> {t("photos.upload_button")}
          </button>
        </div>

        {(location.category === "flower_field" || location.category === "attraction" || location.category === "photo_spot") && (
          <div className="rounded-2xl p-4 bg-primary-subtle">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-primary" />
              <h3 className="text-headline text-primary">{t("location.etiquette_title")}</h3>
            </div>
            <ul className="space-y-3">
              {etiquetteRules.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-base leading-none mt-0.5 flex-shrink-0" aria-hidden>{item.emoji}</span>
                  <p className="text-label font-normal leading-snug text-ink-2">{item.rule}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Blijft gemount voor de sluitanimatie; nieuwe key per opening = lege stappen */}
      <PhotoUploadSheet
        key={uploadKey}
        open={showUpload}
        locationId={location.id}
        onClose={() => setShowUpload(false)}
        onUploaded={(id, url) => {
          setPendingPhotos((prev) => [{ id, previewUrl: url }, ...prev]);
        }}
      />

      {/* Actiebalk — boven de navigatiebalk, niet erachter */}
      <div className="fixed left-0 right-0 bottom-nav z-40 px-4 pt-3 pb-3 nav-glass border-t border-line">
        {location.website_url && (
          <a
            href={location.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="max-w-lg mx-auto mb-2 w-full flex items-center justify-center gap-2 min-h-touch rounded-xl text-label
                       bg-surface-3 text-ink-2 active:scale-[0.98] transition-transform duration-fast
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ExternalLink size={15} aria-hidden />
            {t("location.visit_website")}
          </a>
        )}
        <div className="flex gap-2 max-w-lg mx-auto">
          <Button size="lg" className="flex-1" icon={<Navigation size={18} />}
                  onClick={handleNavigate} disabled={!location.latitude}>
            {t("common.navigate")}
          </Button>
          <Button size="lg" variant={saved ? "primary" : "secondary"} loading={saving} onClick={handleSave}
                  aria-label={saved ? t("common.saved") : t("common.save")} aria-pressed={saved} className="!px-4">
            {!saving && <Heart size={18} className={saved ? "fill-current" : "text-primary"} />}
          </Button>
          <Button size="lg" variant="secondary" onClick={handleShare} aria-label={t("common.share")} className="!px-4">
            {copied ? <Check size={18} className="text-success" /> : <Share2 size={18} />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function OpeningHoursCard({
  hours,
  t,
}: {
  hours: import("@/lib/openingHours").OpeningHours | null;
  t: (k: string) => string;
}) {
  const isOpen = isCurrentlyOpen(hours);
  const today  = (["sun","mon","tue","wed","thu","fri","sat"] as DayKey[])[new Date().getDay()];

  return (
    <div className="bg-surface-2 rounded-2xl border border-line p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-ink-3">
          <Clock size={15} />
          <span className="text-caption font-semibold uppercase tracking-wide">{t("location.opening_hours")}</span>
        </div>
        {isOpen === true && (
          <Badge tone="success" icon={<span className="block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}>
            {t("location.open_now")}
          </Badge>
        )}
        {isOpen === false && (
          <Badge tone="danger" icon={<span className="block w-1.5 h-1.5 rounded-full bg-danger" />}>
            {t("location.closed_now")}
          </Badge>
        )}
      </div>

      {/* Schedule */}
      {hours ? (
        <div className="grid grid-cols-7 gap-1 text-center">
          {getWeekSchedule(hours).map(({ key, schedule }) => {
            const isToday = key === today;
            return (
              <div key={key} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 px-0.5
                ${isToday ? "bg-primary-subtle" : ""}`}>
                <span className={`text-[10px] font-bold uppercase ${isToday ? "text-primary" : "text-ink-3"}`}>
                  {t(`location.day_${key}`)}
                </span>
                {schedule ? (
                  <>
                    <span className="text-[10px] font-semibold leading-tight" style={{ color: "var(--color-text)" }}>
                      {schedule[0]}
                    </span>
                    <span className="text-[10px] leading-tight" style={{ color: "var(--color-text-3)" }}>
                      {schedule[1]}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-medium" style={{ color: "var(--color-text-3)" }}>—</span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-3)" }}>{t("location.hours_unknown")}</p>
      )}
    </div>
  );
}
