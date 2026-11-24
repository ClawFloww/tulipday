"use client";

// Toont de gegenereerde dagroute op basis van het plannerprofield.
// Laadt locaties uit Supabase, scoort en ordent ze, bouwt tijdblokken.

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Bike, Car, Check, Clock, Flower2, Footprints, MapPin, MapPinOff, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n-context";
import { locationPath } from "@/lib/links";
import { scoreLocation } from "@/lib/planner/scoring";
import { buildOptimalRoute } from "@/lib/planner/routeOptimizer";
import { PLANNER_PROFILE_KEY } from "@/lib/planner/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PlannerProfile, DayPlan, LocationCandidate } from "@/lib/planner/types";

const ROUTE_KEY = "tulipday_active_route";

function formatTime(minutesAfter9: number): string {
  const total = 9 * 60 + minutesAfter9;
  const h     = Math.floor(total / 60);
  const m     = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function TravelIcon({ transport }: { transport: string }) {
  if (transport === "cycling") return <Bike    size={12} />;
  if (transport === "car")     return <Car     size={12} />;
  return                              <Footprints size={12} />;
}

function TransportPill({ transport }: { transport: string }) {
  if (transport === "cycling") return <Bike    size={14} />;
  if (transport === "car")     return <Car     size={14} />;
  return                              <Footprints size={14} />;
}

export default function PlanResultsPage() {
  const router          = useRouter();
  const { locale }      = useParams<{ locale: string }>();
  const { t }           = useT();

  const [plan,    setPlan]    = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    async function compute() {
      const raw = localStorage.getItem(PLANNER_PROFILE_KEY);
      if (!raw) { router.replace(`/${locale}/plan`); return; }
      const profile: PlannerProfile = JSON.parse(raw);

      const { data: locations, error: dbError } = await supabase
        .from("locations")
        .select("id, title, slug, latitude, longitude, category, bloom_status, access_type, photo_score, image_url")
        .eq("is_active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (dbError || !locations?.length) {
        setError(true);
        setLoading(false);
        return;
      }

      const candidates = (locations as LocationCandidate[]).filter(
        (l) => l.category !== "parking" && l.category !== "bike_rental",
      );
      const scored  = candidates.map((loc) => scoreLocation(loc, profile));
      const dayPlan = buildOptimalRoute(scored, profile);

      setPlan(dayPlan);
      setLoading(false);
    }

    compute().catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [locale, router]);

  function startRoute() {
    if (!plan) return;

    const activityMap: Record<string, string> = {
      walking: "walking",
      cycling: "cycling",
      car:     "car",
    };
    const activity = activityMap[plan.profile.transport] ?? "cycling";

    const speedKmH =
      plan.profile.transport === "cycling" ? 15
      : plan.profile.transport === "car"   ? 30
      : 5;
    const distanceKm = Math.round((plan.totalMin / 60) * speedKmH * 10) / 10;

    const route = {
      name:             t("plan_results.route_name", { group: t(`planner.group.${plan.profile.group}`) }),
      fields:           plan.stops.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng })),
      geometry: {
        type:        "LineString",
        // Sluit de lus door het startpunt aan het einde te herhalen
        coordinates: [
          ...plan.stops.map((s) => [s.lng, s.lat] as [number, number]),
          [plan.stops[0].lng, plan.stops[0].lat] as [number, number],
        ],
      },
      distanceKm,
      estimatedMinutes: plan.totalMin,
    };
    localStorage.setItem(ROUTE_KEY, JSON.stringify({ route, activity }));
    router.push(`/${locale}/navigate?generated=true`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface px-5 pt-safe" role="status" aria-label={t("plan_results.building")}>
        <div className="space-y-3 pt-6">
          <Skeleton variant="text" lines={2} className="mb-4" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error || !plan || !plan.stops.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-6">
        <EmptyState
          tone={error ? "error" : "neutral"}
          icon={<MapPinOff size={28} />}
          title={error ? t("common.load_error") : t("plan_results.no_stops")}
          actionLabel={t("plan_results.replan")}
          onAction={() => router.replace(`/${locale}/plan`)}
        />
      </div>
    );
  }

  const lastStop  = plan.stops.at(-1)!;
  const endMin    = lastStop.startMin + lastStop.durationMin;
  const totalH    = Math.floor(endMin / 60);
  const totalM    = endMin % 60;
  const totalHStr = t("navigation.duration_hm", { h: totalH, m: totalM });

  return (
    <div className="min-h-screen pb-40 bg-surface" >

      {/* Header */}
      <div className="border-b border-line bg-surface-2 px-5 pb-5 pt-safe">
        <div className="mb-4 flex items-center gap-3 pt-4">
          <IconButton variant="ghost" aria-label={t("plan_results.back_to_plan")} onClick={() => router.replace(`/${locale}/plan`)}>
            <ArrowLeft size={18} />
          </IconButton>
          <div>
            <p className="text-caption font-bold uppercase tracking-widest text-primary">
              {t("plan_results.eyebrow")}
            </p>
            <h1 className="text-title leading-tight text-ink">
              {t("plan_results.stops_selected", { count: plan.stops.length })}
            </h1>
          </div>
        </div>

        {/* Samenvatting-pills */}
        <div className="flex gap-2 flex-wrap">
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-3 text-ink-2"
            
          >
            <TransportPill transport={plan.profile.transport} />
            {t(`planner.transport.${plan.profile.transport}`)}
          </span>
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-3 text-ink-2"
            
          >
            <Clock size={14} />
            {totalHStr}
          </span>
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-3 text-ink-2"
            
          >
            <MapPin size={14} />
            {t(`planner.group.${plan.profile.group}`)}
          </span>
        </div>
      </div>

      {/* Start-tijd label */}
      <div className="px-5 pt-5 pb-1">
        <p className="text-xs font-bold text-ink-3" >
          {t("plan_results.timing", { start: formatTime(0), end: formatTime(endMin) })}
        </p>
      </div>

      {/* Stops-tijdlijn */}
      <div className="px-5 pt-2 space-y-0">
        {plan.stops.map((stop, idx) => {
          const next     = plan.stops[idx + 1] ?? null;
          const travelMin = next ? next.startMin - (stop.startMin + stop.durationMin) : null;
          const isLast   = idx === plan.stops.length - 1;

          return (
            <div key={stop.id}>
              <div
                className="flex gap-3 p-4 rounded-2xl bg-surface-2 border border-line"
                
              >
                {/* Tijd-kolom */}
                <div className="flex flex-col items-center flex-shrink-0 pt-0.5" style={{ width: 44 }}>
                  <span className="text-[11px] font-bold tabular-nums text-primary" >
                    {formatTime(stop.startMin)}
                  </span>
                  <span className="text-[10px] mt-0.5 text-ink-3" >
                    {stop.durationMin} {t("navigation.minute_short")}
                  </span>
                </div>

                {/* Thumbnail */}
                {stop.image_url ? (
                  <Image
                    src={stop.image_url}
                    alt={stop.name}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary">
                    <Flower2 size={24} aria-hidden />
                  </div>
                )}

                {/* Inhoud */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1.5 mb-1.5">
                    <span
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${isLast ? "bg-success" : "bg-primary"}`}
                    >
                      {isLast ? <Check size={12} strokeWidth={3} aria-hidden /> : idx + 1}
                    </span>
                    <button
                      onClick={() => stop.slug && router.push(locationPath(locale, stop.slug))}
                      className="text-left text-label leading-snug text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      {stop.name}
                    </button>
                  </div>

                  {/* Redenen */}
                  {stop.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {stop.reasons.map((r, i) => (
                        <Badge key={i} tone="primary">{t(`plan_results.${r}`)}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reisverbinding naar volgende stop */}
              {!isLast && travelMin !== null && (
                <div className="flex items-center gap-2 py-2 pl-[56px]">
                  <div
                    className="w-px h-5 rounded-full bg-line"
                    
                  />
                  <TravelIcon transport={plan.profile.transport} />
                  <span className="text-[11px] font-medium text-ink-3" >
                    {t("plan_results.travel", { min: travelMin })}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Knoppen boven de navigatiebalk */}
      <div className="fixed inset-x-0 bottom-nav z-40 border-t border-line bg-surface px-5 py-3">
        <div className="mx-auto flex max-w-[430px] gap-3">
          <Button variant="secondary" size="lg" onClick={() => router.replace(`/${locale}/plan`)}>
            {t("plan_results.adjust")}
          </Button>
          <Button size="lg" fullWidth onClick={startRoute} icon={<Play size={16} className="fill-current" aria-hidden />}>
            {t("plan_results.start")}
          </Button>
        </div>
      </div>
    </div>
  );
}
