"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, MapPin, Star, Heart, Navigation, Loader2,
  ChevronRight, Camera, Clock, Footprints, ParkingCircle,
  ShieldCheck, Flower2, Users, Plus, Share2, Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Location, AccessType, Category } from "@/lib/types";
import { useT } from "@/lib/i18n-context";
import { isCurrentlyOpen, getWeekSchedule } from "@/lib/openingHours";
import type { DayKey } from "@/lib/openingHours";
import { getOrCreateSessionId } from "@/lib/session";
import { BloomBadge } from "@/components/ui/BloomBadge";
import { track } from "@/lib/analytics";
import PhotoUploadSheet from "@/components/ui/PhotoUploadSheet";
import LocationPhotoGallery, { PendingPhoto } from "@/components/ui/LocationPhotoGallery";
import UnsplashPhotoFeed from "@/components/UnsplashPhotoFeed";

const CATEGORY_STYLE: Record<Category, { bg: string; color: string }> = {
  flower_field: { bg: "bg-tulip-50 dark:bg-tulip-900/25",     color: "text-tulip-600 dark:text-tulip-400"     },
  photo_spot:   { bg: "bg-blue-50 dark:bg-blue-900/25",       color: "text-blue-600 dark:text-blue-400"       },
  attraction:   { bg: "bg-amber-50 dark:bg-amber-900/25",     color: "text-amber-700 dark:text-amber-400"     },
  food:         { bg: "bg-orange-50 dark:bg-orange-900/25",   color: "text-orange-700 dark:text-orange-400"   },
  parking:      { bg: "bg-gray-100 dark:bg-gray-800",         color: "text-gray-600 dark:text-gray-400"       },
  bike_rental:  { bg: "bg-violet-50 dark:bg-violet-900/25",   color: "text-violet-700 dark:text-violet-400"   },
};

const CROWD_KEYS = ["crowd_very_quiet", "crowd_quiet", "crowd_moderate", "crowd_busy", "crowd_very_busy"];
const CROWD_COLORS = ["bg-forest-500", "bg-forest-400", "bg-yellow-400", "bg-orange-400", "bg-tulip-500"];

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-2 rounded-2xl p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-2" style={{ color: "var(--color-text-3)" }}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-bold leading-snug" style={{ color: "var(--color-text)" }}>{value}</p>
      {sub && <p className="text-xs leading-snug" style={{ color: "var(--color-text-2)" }}>{sub}</p>}
    </div>
  );
}

export default function LocationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router   = useRouter();
  const { t }    = useT();

  const [location, setLocation] = useState<Location | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
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
    const sessionId = getOrCreateSessionId();
    supabase.from("saved_items").select("id")
      .eq("session_id", sessionId).eq("item_type", "location").eq("item_id", location.id)
      .maybeSingle().then(({ data }) => setSaved(!!data));
  }, [location]);

  async function handleSave() {
    if (!location || saving) return;
    setSaving(true);
    const sessionId = getOrCreateSessionId();
    if (saved) {
      await supabase.from("saved_items").delete()
        .eq("session_id", sessionId).eq("item_type", "location").eq("item_id", location.id);
      setSaved(false);
      track("save", { location_id: location.id, action: "unsave" });
    } else {
      await supabase.from("saved_items").insert({ session_id: sessionId, item_type: "location", item_id: location.id });
      setSaved(true);
      track("save", { location_id: location.id, action: "save" });
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
    const url = window.location.href;
    const shareData = {
      title: location.title,
      text: location.short_description ?? `Bekijk ${location.title} op TulipDay`,
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
      setTimeout(() => setCopied(false), 2000);
    } catch { /* no clipboard access */ }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-tulip-400 animate-spin" />
          <p className="text-sm" style={{ color: "var(--color-text-3)" }}>{t("location.loading")}</p>
        </div>
      </div>
    );
  }

  if (notFound || !location) {
    return (
      <div className="fixed inset-0 bg-surface flex flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="text-5xl">🌷</span>
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{t("location.not_found_title")}</h2>
        <p className="text-sm" style={{ color: "var(--color-text-3)" }}>{t("location.not_found_desc")}</p>
        <button onClick={() => router.back()} className="px-5 py-2.5 bg-tulip-500 text-white rounded-xl text-sm font-bold">
          {t("common.go_back")}
        </button>
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

  const catStyle = CATEGORY_STYLE[location.category];
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
    <div className="min-h-screen bg-surface pb-32">

      <div className="relative h-72 sm:h-96 overflow-hidden bg-gray-200">
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

        {/* Terug knop */}
        <button onClick={() => router.back()}
          className="absolute top-12 left-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors">
          <ArrowLeft size={20} />
        </button>

        {/* Street View toggle */}
        {streetViewEmbedUrl && (
          <button
            onClick={() => setShowStreetView((v) => !v)}
            className="absolute top-12 right-4 z-10 flex items-center gap-1.5 px-3 py-2 rounded-full backdrop-blur-sm text-xs font-bold transition-all active:scale-95"
            style={{
              backgroundColor: showStreetView ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.35)",
              color: showStreetView ? "#1A1A1A" : "#ffffff",
            }}
          >
            <MapPin size={12} />
            {showStreetView ? "Foto" : "Street View"}
          </button>
        )}

        {location.bloom_status && (
          <div className="absolute bottom-4 left-4"><BloomBadge status={location.bloom_status} /></div>
        )}
        {location.photo_score != null && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {Array.from({ length: location.photo_score }).map((_, i) => (
              <Star key={i} size={11} className="text-amber-400 fill-amber-400" />
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-6">

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${catStyle.bg} ${catStyle.color}`}>
              <Flower2 size={11} /> {t(`category.${location.category}`)}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold leading-tight mb-1" style={{ color: "var(--color-text)" }}>{location.title}</h1>
          {location.address && (
            <p className="flex items-center gap-1.5 text-sm" style={{ color: "var(--color-text-2)" }}>
              <MapPin size={13} className="text-tulip-400 flex-shrink-0" /> {location.address}
            </p>
          )}
          {location.photo_score != null && (
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className={i < location.photo_score! ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200 dark:text-gray-700 dark:fill-gray-700"} />
              ))}
              <span className="text-xs ml-1 font-medium" style={{ color: "var(--color-text-3)" }}>{t("location.photo_score")}</span>
            </div>
          )}
        </div>

        {location.short_description && (
          <p className="text-[15px] leading-relaxed" style={{ color: "var(--color-text-2)" }}>{location.short_description}</p>
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
          <div className="bg-surface-2 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2" style={{ color: "var(--color-text-3)" }}>
              <Users size={15} />
              <span className="text-xs font-semibold uppercase tracking-wide">{t("location.crowd_level")}</span>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full ${i < location.crowd_score! ? CROWD_COLORS[crowdIdx] : "bg-gray-200 dark:bg-gray-700"}`} />
              ))}
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{t(`location.${CROWD_KEYS[crowdIdx]}`)}</p>
          </div>
        )}

        {(location.category === "photo_spot" || (location.photo_score ?? 0) >= 4) && (
          <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera size={16} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-extrabold text-blue-900 dark:text-blue-200">{t("location.photography_tips")}</h3>
            </div>
            <ul className="space-y-2">
              {(["tip_golden_hour", "tip_wide_angle", "tip_overcast", "tip_low_angle"] as const).map((key) => (
                <li key={key} className="flex items-start gap-2 text-xs text-blue-800 dark:text-blue-300">
                  <ChevronRight size={12} className="mt-0.5 flex-shrink-0 text-blue-400 dark:text-blue-500" /> {t(`location.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <UnsplashPhotoFeed locationName={`${location.title} bloemen`} />

        {location.full_description && (
          <div>
            <h2 className="text-base font-extrabold mb-2" style={{ color: "var(--color-text)" }}>{t("location.about")}</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: "var(--color-text-2)" }}>{location.full_description}</p>
          </div>
        )}

        {/* ── Foto galerij ── */}
        <div>
          <LocationPhotoGallery locationId={location.id} pendingPhotos={pendingPhotos} />
          <button
            onClick={() => setShowUpload(true)}
            aria-label={t("photos.upload_button")}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl
                       border-2 border-dashed border-tulip-200 dark:border-tulip-800 text-tulip-500 font-bold text-sm
                       hover:border-tulip-400 hover:bg-tulip-50 dark:hover:bg-tulip-900/20 transition-all"
          >
            <Plus size={16} /> {t("photos.upload_button")}
          </button>
        </div>

        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--color-primary-subtle)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={16} className="text-tulip-500" />
            <h3 className="text-sm font-extrabold text-tulip-600">{t("location.etiquette_title")}</h3>
          </div>
          <ul className="space-y-3">
            {etiquetteRules.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-base leading-none mt-0.5 flex-shrink-0">{item.emoji}</span>
                <p className="text-xs leading-snug" style={{ color: "var(--color-text-2)" }}>{item.rule}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {showUpload && (
        <PhotoUploadSheet
          locationId={location.id}
          onClose={() => setShowUpload(false)}
          onUploaded={(id, url) => {
            setPendingPhotos((prev) => [{ id, previewUrl: url }, ...prev]);
            setShowUpload(false);
          }}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 pb-safe border-t"
           style={{ backgroundColor: "var(--color-surface-2)", borderColor: "var(--color-border)" }}>
        <div className="flex gap-2 max-w-lg mx-auto">
          <button
            onClick={handleNavigate}
            disabled={!location.latitude}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl
                       bg-tulip-500 text-white font-bold text-sm shadow-md shadow-tulip-200
                       hover:bg-tulip-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Navigation size={17} /> {t("common.navigate")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-[0.98]
                        ${saved ? "bg-tulip-500 border-tulip-500 text-white shadow-md shadow-tulip-200" : "border-tulip-200 dark:border-tulip-800 text-tulip-500 hover:border-tulip-400"}`}
            style={saved ? {} : { backgroundColor: "var(--color-surface-2)" }}
            aria-label={saved ? t("common.saved") : t("common.save")}
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Heart size={17} className={saved ? "fill-white" : ""} />}
          </button>
          <button
            onClick={handleShare}
            className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm border-2 transition-all active:scale-[0.98]
                        ${copied ? "bg-forest-500 border-forest-500 text-white" : "border-[var(--color-border)] hover:border-gray-400"}`}
            style={copied ? {} : { backgroundColor: "var(--color-surface-2)", color: "var(--color-text-2)" }}
            aria-label={t("common.share")}
          >
            {copied ? <Check size={17} /> : <Share2 size={17} />}
          </button>
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
    <div className="bg-surface-2 rounded-2xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2" style={{ color: "var(--color-text-3)" }}>
          <Clock size={15} />
          <span className="text-xs font-semibold uppercase tracking-wide">{t("location.opening_hours")}</span>
        </div>
        {isOpen === true && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {t("location.open_now")}
          </span>
        )}
        {isOpen === false && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-500">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {t("location.closed_now")}
          </span>
        )}
      </div>

      {/* Schedule */}
      {hours ? (
        <div className="grid grid-cols-7 gap-1 text-center">
          {getWeekSchedule(hours).map(({ key, schedule }) => {
            const isToday = key === today;
            return (
              <div key={key} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 px-0.5
                ${isToday ? "bg-tulip-500/10" : ""}`}>
                <span className={`text-[10px] font-bold uppercase ${isToday ? "text-tulip-600" : ""}`}
                      style={isToday ? {} : { color: "var(--color-text-3)" }}>
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
