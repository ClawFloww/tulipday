"use client";

// Toont een betere bloeiroute als de huidige route een lage bloei-score heeft

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import type { BloomAwareRoute } from "@/lib/bloomRoute";
import { bloomScoreLabel, bloomScoreColor } from "@/lib/bloomRoute";

interface Props {
  currentRoute:  BloomAwareRoute;
  alternatives:  BloomAwareRoute[];
  onSelect:      (route: BloomAwareRoute) => void;
}

export default function RouteAlternativeSuggestion({
  currentRoute,
  alternatives,
  onSelect,
}: Props) {
  // Alleen tonen als er een duidelijk betere route is (≥ 15% hogere bloomScore)
  const betterAlts = alternatives
    .filter(
      (r) =>
        r.id !== currentRoute.id &&
        r.bloomScore > currentRoute.bloomScore + 0.15,
    )
    .sort((a, b) => b.bloomScore - a.bloomScore)
    .slice(0, 2);

  return (
    <AnimatePresence>
      {betterAlts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl overflow-hidden border bg-tulip-50 border-tulip-100 dark:bg-tulip-900/20 dark:border-tulip-800"
        >
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <Sparkles size={13} className="text-[#E8527A]" />
            <p className="text-xs font-extrabold text-[#E8527A]">
              Betere bloeiroute beschikbaar
            </p>
          </div>

          <div className="px-4 pb-3 space-y-2">
            {betterAlts.map((route) => {
              const color = bloomScoreColor(route.bloomScore);
              return (
                <button
                  key={route.id}
                  onClick={() => onSelect(route)}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left"
                  style={{ backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
                      {route.name}
                    </p>
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>
                      {bloomScoreLabel(route.bloomScore)} · {route.fieldsInBloom} velden
                    </p>
                  </div>
                  <ArrowRight size={15} className="flex-shrink-0 ml-2" style={{ color: "var(--color-text-3)" } as React.CSSProperties} />
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
