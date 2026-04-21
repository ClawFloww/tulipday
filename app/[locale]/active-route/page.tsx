"use client";

// Actieve route scherm — stop-per-stop navigatie door bollenvelden
// Data wordt gelezen uit localStorage (opgeslagen door onboarding)

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Navigation, Check, Trophy } from "lucide-react";
import type { GeneratedRoute } from "@/lib/routeGenerator";
import ActiveRouteMap from "@/components/routes/ActiveRouteMap";

const ROUTE_KEY    = "tulipday_active_route";
const PROGRESS_KEY = "tulipday_route_progress";

interface StoredRoute {
  route:    GeneratedRoute;
  activity: string;
}

// ── Voltooid-scherm ───────────────────────────────────────────────────────────

function FinishedScreen({ route, onHome }: { route: GeneratedRoute; onHome: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
         style={{ backgroundColor: "var(--color-surface)" }}>
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
        className="text-7xl mb-5 select-none"
      >
        🌷
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-extrabold mb-2"
        style={{ color: "var(--color-text)" }}
      >
        Route voltooid!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-sm mb-1"
        style={{ color: "var(--color-text-2)" }}
      >
        Je hebt alle {route.fields.length} bollenvelden bezocht.
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-base font-extrabold mb-10"
        style={{ color: "#E8527A" }}
      >
        {route.distanceKm} km · ±{route.estimatedMinutes} min
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="w-full"
      >
        <button
          onClick={onHome}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-base active:scale-[0.97] transition-transform"
          style={{ backgroundColor: "#E8527A" }}
        >
          Terug naar home
        </button>
      </motion.div>
    </div>
  );
}

// ── Hoofd-component ───────────────────────────────────────────────────────────

export default function ActiveRoutePage() {
  const router         = useRouter();
  const { locale }     = useParams<{ locale: string }>();
  const [data, setData] = useState<StoredRoute | null>(null);
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [done, setDone]       = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ROUTE_KEY);
      if (!stored) { router.replace(`/${locale}/home`); return; }
      const parsed: StoredRoute = JSON.parse(stored);
      // Herstel Date-object na JSON serialisatie
      if (parsed.route) parsed.route.generatedAt = new Date(parsed.route.generatedAt);
      setData(parsed);

      const prog = localStorage.getItem(PROGRESS_KEY);
      if (prog) {
        const ids: number[] = JSON.parse(prog);
        setVisited(new Set(ids));
      }
    } catch {
      router.replace(`/${locale}/home`);
    }
  }, [locale, router]);

  if (!data) return null;

  const { route, activity } = data;

  // Eerste niet-bezochte stop
  const activeIdx = route.fields.findIndex((_, i) => !visited.has(i));
  const allDone   = activeIdx === -1;

  function markVisited(idx: number) {
    const next = new Set(Array.from(visited).concat(idx));
    setVisited(next);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(Array.from(next))); } catch {}
    if (next.size >= route.fields.length) setDone(true);
  }

  function navigateTo(idx: number) {
    const f    = route.fields[idx];
    const mode = activity === "walking"  ? "walking"
               : activity === "cycling"  ? "bicycling"
               : "driving";
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}&travelmode=${mode}`,
      "_blank",
    );
  }

  function finishRoute() {
    try {
      localStorage.removeItem(ROUTE_KEY);
      localStorage.removeItem(PROGRESS_KEY);
    } catch {}
    router.push(`/${locale}/home`);
  }

  if (done || allDone) {
    return <FinishedScreen route={route} onHome={finishRoute} />;
  }

  const activeField = route.fields[activeIdx];

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="px-4 pt-12 pb-3 flex items-center gap-3 flex-shrink-0"
        style={{ backgroundColor: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border)" }}
      >
        <button
          onClick={() => router.push(`/${locale}/home`)}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
            {route.name}
          </h1>
          <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
            {visited.size}/{route.fields.length} stops · {route.distanceKm} km
          </p>
        </div>

        {/* Progressiepuntjes */}
        <div className="flex gap-1 flex-shrink-0">
          {route.fields.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-colors"
              style={{
                backgroundColor: visited.has(i) ? "#2D7D46"
                               : i === activeIdx ? "#E8527A"
                               : "var(--color-border)",
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Kaart ──────────────────────────────────────────────────────────── */}
      <ActiveRouteMap
        route={route}
        activeIdx={activeIdx}
        visitedIds={visited}
        className="w-full flex-shrink-0"
        height={230}
      />

      {/* ── Stop-lijst ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ paddingBottom: 160 }}>
        {route.fields.map((field, idx) => {
          const isVisited = visited.has(idx);
          const isActive  = idx === activeIdx;

          return (
            <motion.div
              key={field.id}
              initial={false}
              animate={{ opacity: isVisited ? 0.5 : 1 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
                style={{
                  backgroundColor: isActive ? "var(--color-surface-2)" : "var(--color-surface-3)",
                  border: isActive
                    ? "1.5px solid #E8527A"
                    : "1.5px solid transparent",
                }}
              >
                {/* Nummerbadge / vinkje */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-extrabold"
                  style={{
                    backgroundColor: isVisited ? "#2D7D46"
                                   : isActive  ? "#E8527A"
                                   : "var(--color-border)",
                  }}
                >
                  {isVisited ? <Check size={14} /> : idx + 1}
                </div>

                {/* Veldnaam */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                    {field.name}
                  </p>
                  {isActive && (
                    <p className="text-xs font-semibold" style={{ color: "#E8527A" }}>
                      Volgende stop
                    </p>
                  )}
                  {isVisited && (
                    <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
                      Bezocht ✓
                    </p>
                  )}
                </div>

                {/* Navigeer-knopje naast actieve stop */}
                {isActive && (
                  <button
                    onClick={() => navigateTo(idx)}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white active:scale-90 transition-transform"
                    style={{ backgroundColor: "#E8527A" }}
                  >
                    <Navigation size={15} />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Actie-balk (vastgezet onderaan) ────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-8 space-y-2.5"
        style={{ backgroundColor: "var(--color-surface-2)", borderTop: "1px solid var(--color-border)" }}
      >
        {/* Actieve stop-naam */}
        <p className="text-xs font-semibold text-center truncate px-2" style={{ color: "var(--color-text-3)" }}>
          Stop {activeIdx + 1} · {activeField.name}
        </p>

        <button
          onClick={() => navigateTo(activeIdx)}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          style={{ backgroundColor: "#E8527A" }}
        >
          <Navigation size={18} />
          Navigeer naar stop {activeIdx + 1}
        </button>

        <button
          onClick={() => markVisited(activeIdx)}
          className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
        >
          <Check size={16} />
          Stop {activeIdx + 1} aftekenen
        </button>
      </div>
    </div>
  );
}
