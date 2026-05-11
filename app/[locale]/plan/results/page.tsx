"use client";

// Toont de gegenereerde dagroute op basis van het plannerprofield.
// Laadt locaties uit Supabase, scoort en ordent ze, bouwt tijdblokken.

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Bike, Car, Footprints, Clock, MapPin, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { scoreLocation } from "@/lib/planner/scoring";
import { buildOptimalRoute } from "@/lib/planner/routeOptimizer";
import { PLANNER_PROFILE_KEY } from "@/lib/planner/types";
import type { PlannerProfile, DayPlan, LocationCandidate } from "@/lib/planner/types";

const ROUTE_KEY = "tulipday_active_route";

function formatTime(minutesAfter9: number): string {
  const total = 9 * 60 + minutesAfter9;
  const h     = Math.floor(total / 60);
  const m     = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function transportLabel(t: string): string {
  if (t === "walking") return "te voet";
  if (t === "cycling") return "op de fiets";
  return "met de auto";
}

function groupLabel(g: string): string {
  switch (g) {
    case "solo":    return "Solo";
    case "couple":  return "Stel";
    case "family":  return "Familie";
    case "friends": return "Vrienden";
    default:        return g;
  }
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

  const [plan,    setPlan]    = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

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
        setError("Kon geen locaties laden. Probeer het opnieuw.");
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
      setError("Er is iets misgegaan. Probeer het opnieuw.");
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
      name:             `Jouw tulpendag — ${groupLabel(plan.profile.group)}`,
      fields:           plan.stops.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng })),
      geometry: {
        type:        "LineString",
        coordinates: plan.stops.map((s) => [s.lng, s.lat] as [number, number]),
      },
      distanceKm,
      estimatedMinutes: plan.totalMin,
    };
    localStorage.setItem(ROUTE_KEY, JSON.stringify({ route, activity }));
    router.push(`/${locale}/navigate?generated=true`);
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <div className="w-10 h-10 rounded-full border-2 border-tulip-500 border-t-transparent animate-spin" />
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-3)" }}>
          Jouw route samenstellen…
        </p>
      </div>
    );
  }

  if (error || !plan || !plan.stops.length) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
          {error ?? "Geen locaties gevonden voor dit profiel."}
        </p>
        <button
          onClick={() => router.replace(`/${locale}/plan`)}
          className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          Opnieuw plannen
        </button>
      </div>
    );
  }

  const lastStop  = plan.stops.at(-1)!;
  const endMin    = lastStop.startMin + lastStop.durationMin;
  const totalH    = Math.floor(endMin / 60);
  const totalM    = endMin % 60;
  const totalHStr = totalM > 0 ? `${totalH} u ${totalM} min` : `${totalH} uur`;

  return (
    <div className="min-h-screen pb-40" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* Header */}
      <div
        className="px-5 pt-14 pb-5"
        style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.replace(`/${locale}/plan`)}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-primary)" }}>
              Jouw dagroute
            </p>
            <h1 className="text-lg font-bold leading-tight" style={{ color: "var(--color-text)" }}>
              {plan.stops.length} plekken geselecteerd
            </h1>
          </div>
        </div>

        {/* Samenvatting-pills */}
        <div className="flex gap-2 flex-wrap">
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
          >
            <TransportPill transport={plan.profile.transport} />
            {transportLabel(plan.profile.transport)}
          </span>
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
          >
            <Clock size={14} />
            {totalHStr}
          </span>
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
          >
            <MapPin size={14} />
            {groupLabel(plan.profile.group)}
          </span>
        </div>
      </div>

      {/* Start-tijd label */}
      <div className="px-5 pt-5 pb-1">
        <p className="text-xs font-bold" style={{ color: "var(--color-text-3)" }}>
          Start om 09:00 · klaar om ~{formatTime(endMin)}
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
                className="flex gap-3 p-4 rounded-2xl"
                style={{
                  backgroundColor: "var(--color-surface-2)",
                  border:          "1px solid var(--color-border)",
                }}
              >
                {/* Tijd-kolom */}
                <div className="flex flex-col items-center flex-shrink-0 pt-0.5" style={{ width: 44 }}>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--color-primary)" }}>
                    {formatTime(stop.startMin)}
                  </span>
                  <span className="text-[10px] mt-0.5" style={{ color: "var(--color-text-3)" }}>
                    {stop.durationMin} min
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
                  <div
                    className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
                    style={{ backgroundColor: "var(--color-surface-3)" }}
                  >
                    🌷
                  </div>
                )}

                {/* Inhoud */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-1.5 mb-1.5">
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                      style={{ backgroundColor: isLast ? "#2D7D46" : "var(--color-primary)" }}
                    >
                      {isLast ? "✓" : idx + 1}
                    </span>
                    <button
                      onClick={() => stop.slug && router.push(`/${locale}/location/${stop.slug}`)}
                      className="text-sm font-bold leading-snug text-left"
                      style={{ color: "var(--color-text)" }}
                    >
                      {stop.name}
                    </button>
                  </div>

                  {/* Redenen */}
                  {stop.reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {stop.reasons.map((r, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: "rgba(232,16,42,0.08)", color: "var(--color-primary)" }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Reisverbinding naar volgende stop */}
              {!isLast && travelMin !== null && (
                <div className="flex items-center gap-2 py-2 pl-[56px]">
                  <div
                    className="w-px h-5 rounded-full"
                    style={{ backgroundColor: "var(--color-border)" }}
                  />
                  <TravelIcon transport={plan.profile.transport} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--color-text-3)" }}>
                    ~{travelMin} min reizen
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA — boven BottomNav (60px hoog) */}
      <div
        className="fixed bottom-[60px] left-0 right-0 px-5 py-3 z-40"
        style={{ backgroundColor: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}
      >
        <div className="flex gap-3 max-w-[430px] mx-auto">
          <button
            onClick={() => router.replace(`/${locale}/plan`)}
            className="px-4 py-3.5 rounded-2xl text-sm font-bold flex-shrink-0 transition-all active:scale-95"
            style={{
              backgroundColor: "var(--color-surface-2)",
              color:           "var(--color-text-2)",
              border:          "1.5px solid var(--color-border)",
            }}
          >
            Aanpassen
          </button>
          <button
            onClick={startRoute}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            <Play size={16} fill="white" />
            Start deze route
          </button>
        </div>
      </div>
    </div>
  );
}
