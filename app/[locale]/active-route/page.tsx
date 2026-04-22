"use client";

// Actieve route scherm — stop-per-stop navigatie door bollenvelden
// GPS-detectie: binnen 100 m van actieve stop → arrival banner
// Arrival banner: foto maken (→ corso feed) of direct aftekenen

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Navigation, Check, Camera, Loader2 } from "lucide-react";
import type { GeneratedRoute } from "@/lib/routeGenerator";
import { haversineDistance } from "@/lib/tulipFields";
import { useCorsoUpload } from "@/hooks/useCorsoUpload";
import ActiveRouteMap from "@/components/routes/ActiveRouteMap";

const ROUTE_KEY       = "tulipday_active_route";
const PROGRESS_KEY    = "tulipday_route_progress";
const ARRIVAL_RADIUS  = 100; // meter
const GPS_INTERVAL_MS = 15_000;

interface StoredRoute {
  route:    GeneratedRoute;
  activity: string;
}

// ── Arrival-banner ────────────────────────────────────────────────────────────

function ArrivalBanner({
  stopName, stopIdx, onPhoto, onSkip, onDismiss,
  isUploading, uploadProgress,
}: {
  stopName:       string;
  stopIdx:        number;
  onPhoto:        () => void;
  onSkip:         () => void;
  onDismiss:      () => void;
  isUploading:    boolean;
  uploadProgress: number;
}) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/40"
        onClick={!isUploading ? onDismiss : undefined}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed inset-x-0 bottom-0 z-[160] rounded-t-3xl px-5 pt-4 pb-10"
        style={{ backgroundColor: "var(--color-surface-2)" }}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5"
             style={{ backgroundColor: "var(--color-border)" }} />

        {/* Inhoud */}
        <div className="text-center mb-6">
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 16 }}
            className="text-5xl mb-3 select-none"
          >
            🌷
          </motion.p>
          <h3 className="text-xl font-extrabold" style={{ color: "var(--color-text)" }}>
            Je bent er!
          </h3>
          <p className="text-sm mt-1 font-semibold" style={{ color: "var(--color-text-2)" }}>
            Stop {stopIdx + 1} · {stopName}
          </p>
        </div>

        {isUploading ? (
          /* Upload voortgang */
          <div className="space-y-3 py-2">
            <div className="w-full h-2 rounded-full overflow-hidden"
                 style={{ backgroundColor: "var(--color-surface-3)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: "#E8527A" }}
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-center flex items-center justify-center gap-2"
               style={{ color: "var(--color-text-3)" }}>
              <Loader2 size={12} className="animate-spin" />
              Foto uploaden… {uploadProgress}%
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={onPhoto}
              className="w-full py-4 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              style={{ backgroundColor: "#E8527A" }}
            >
              <Camera size={18} /> Foto maken &amp; aftekenen
            </button>
            <button
              onClick={onSkip}
              className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
            >
              <Check size={16} /> Aftekenen zonder foto
            </button>
            <button
              onClick={onDismiss}
              className="w-full py-2 text-xs font-medium"
              style={{ color: "var(--color-text-3)" }}
            >
              Straks
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
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
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-extrabold mb-2" style={{ color: "var(--color-text)" }}
      >
        Route voltooid!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        className="text-sm mb-1" style={{ color: "var(--color-text-2)" }}
      >
        Je hebt alle {route.fields.length} bollenvelden bezocht.
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
        className="text-base font-extrabold mb-10" style={{ color: "#E8527A" }}
      >
        {route.distanceKm} km · ±{route.estimatedMinutes} min
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }} className="w-full"
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
  const router     = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const [data,    setData]    = useState<StoredRoute | null>(null);
  const [visited, setVisited] = useState<Set<number>>(new Set());
  const [done,    setDone]    = useState(false);

  // Arrival state
  const [arrivedIdx,    setArrivedIdx]    = useState<number | null>(null); // toont banner
  const [dismissedIdx,  setDismissedIdx]  = useState<number | null>(null); // "straks" gedismisst

  // Foto upload
  const { upload, isUploading, progress: uploadProgress } = useCorsoUpload();
  const cameraRef = useRef<HTMLInputElement>(null);

  // ── Data laden ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ROUTE_KEY);
      if (!stored) { router.replace(`/${locale}/home`); return; }
      const parsed: StoredRoute = JSON.parse(stored);
      if (parsed.route) parsed.route.generatedAt = new Date(parsed.route.generatedAt);
      setData(parsed);
      const prog = localStorage.getItem(PROGRESS_KEY);
      if (prog) setVisited(new Set(JSON.parse(prog) as number[]));
    } catch {
      router.replace(`/${locale}/home`);
    }
  }, [locale, router]);

  const activeIdx   = data ? data.route.fields.findIndex((_, i) => !visited.has(i)) : -1;
  const activeField = data && activeIdx >= 0 ? data.route.fields[activeIdx] : null;

  // ── GPS-polling elke 15 s ──────────────────────────────────────────────────
  const checkArrival = useCallback(() => {
    if (!activeField || arrivedIdx === activeIdx || dismissedIdx === activeIdx) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineDistance(
          pos.coords.latitude, pos.coords.longitude,
          activeField.lat, activeField.lng,
        );
        if (dist <= ARRIVAL_RADIUS) setArrivedIdx(activeIdx);
      },
      () => {}, // stilzwijgend falen (geen toestemming)
      { timeout: 8000, maximumAge: 30_000 },
    );
  }, [activeField, activeIdx, arrivedIdx, dismissedIdx]);

  useEffect(() => {
    checkArrival(); // directe check bij eerste render / stopwissel
    const id = setInterval(checkArrival, GPS_INTERVAL_MS);
    return () => clearInterval(id);
  }, [checkArrival]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function markVisited(idx: number) {
    const next = new Set(Array.from(visited).concat(idx));
    setVisited(next);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(Array.from(next))); } catch {}
    setArrivedIdx(null);
    setDismissedIdx(null);
    if (next.size >= (data?.route.fields.length ?? 0)) setDone(true);
  }

  function navigateTo(idx: number) {
    if (!data) return;
    const f    = data.route.fields[idx];
    const mode = data.activity === "walking"  ? "walking"
               : data.activity === "cycling"  ? "bicycling"
               : "driving";
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}&travelmode=${mode}`,
      "_blank",
    );
  }

  async function handlePhoto(file: File) {
    if (!activeField) return;
    const ok = await upload({
      file,
      caption:  `Stop ${activeIdx + 1} · ${activeField.name}`,
      location: activeField.name,
    });
    if (ok) markVisited(activeIdx);
  }

  function finishRoute() {
    try {
      localStorage.removeItem(ROUTE_KEY);
      localStorage.removeItem(PROGRESS_KEY);
    } catch {}
    router.push(`/${locale}/home`);
  }

  if (!data) return null;

  const { route } = data;
  const allDone = activeIdx === -1;

  if (done || allDone) return <FinishedScreen route={route} onHome={finishRoute} />;

  const showBanner = arrivedIdx === activeIdx && activeField !== null;

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: "var(--color-surface)" }}>

      {/* ── Verborgen camera-input ──────────────────────────────────────────── */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePhoto(file);
          e.target.value = "";
        }}
      />

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
        <div className="flex gap-1 flex-shrink-0">
          {route.fields.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-colors"
                 style={{
                   backgroundColor: visited.has(i) ? "#2D7D46"
                                  : i === activeIdx ? "#E8527A"
                                  : "var(--color-border)",
                 }} />
          ))}
        </div>
      </div>

      {/* ── Kaart ──────────────────────────────────────────────────────────── */}
      <ActiveRouteMap
        route={route} activeIdx={activeIdx} visitedIds={visited}
        className="w-full flex-shrink-0" height={230}
      />

      {/* ── Stop-lijst ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ paddingBottom: 160 }}>
        {route.fields.map((field, idx) => {
          const isVisited = visited.has(idx);
          const isActive  = idx === activeIdx;
          return (
            <motion.div key={field.id} initial={false}
                        animate={{ opacity: isVisited ? 0.5 : 1 }} transition={{ duration: 0.25 }}>
              <div
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all"
                style={{
                  backgroundColor: isActive ? "var(--color-surface-2)" : "var(--color-surface-3)",
                  border: isActive ? "1.5px solid #E8527A" : "1.5px solid transparent",
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-extrabold"
                  style={{
                    backgroundColor: isVisited ? "#2D7D46" : isActive ? "#E8527A" : "var(--color-border)",
                  }}
                >
                  {isVisited ? <Check size={14} /> : idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                    {field.name}
                  </p>
                  {isActive  && <p className="text-xs font-semibold" style={{ color: "#E8527A" }}>Volgende stop</p>}
                  {isVisited && <p className="text-xs" style={{ color: "var(--color-text-3)" }}>Bezocht ✓</p>}
                </div>
                {isActive && (
                  <button onClick={() => navigateTo(idx)}
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white active:scale-90 transition-transform"
                          style={{ backgroundColor: "#E8527A" }}>
                    <Navigation size={15} />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Actie-balk ─────────────────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-8 space-y-2.5"
        style={{ backgroundColor: "var(--color-surface-2)", borderTop: "1px solid var(--color-border)" }}
      >
        <p className="text-xs font-semibold text-center truncate px-2" style={{ color: "var(--color-text-3)" }}>
          Stop {activeIdx + 1} · {activeField?.name}
        </p>
        <button
          onClick={() => navigateTo(activeIdx)}
          className="w-full py-4 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          style={{ backgroundColor: "#E8527A" }}
        >
          <Navigation size={18} /> Navigeer naar stop {activeIdx + 1}
        </button>
        <button
          onClick={() => markVisited(activeIdx)}
          className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text-2)" }}
        >
          <Check size={16} /> Stop {activeIdx + 1} aftekenen
        </button>
      </div>

      {/* ── Arrival banner ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showBanner && activeField && (
          <ArrivalBanner
            key={`arrival-${activeIdx}`}
            stopName={activeField.name}
            stopIdx={activeIdx}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            onPhoto={() => cameraRef.current?.click()}
            onSkip={() => markVisited(activeIdx)}
            onDismiss={() => { setArrivedIdx(null); setDismissedIdx(activeIdx); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
