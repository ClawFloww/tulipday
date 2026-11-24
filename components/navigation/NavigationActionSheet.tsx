"use client";

// Uitklap-onderbalk voor navigatie. Ingeklapt: resterende tijd, afstand,
// aankomsttijd en een stopknop, Google Maps-stijl. Expanded: huidige stop card + TulipDay-
// specifieke acties (Bloei melden, Foto, Aftekenen, Externe nav via Maps
// picker) en de volledige stoplijst. Tap op de drag handle togglet.

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flower2, Camera, Check, ChevronRight, ChevronUp, ChevronDown,
  Navigation2,
} from "lucide-react";

import { BloomBadge } from "@/components/ui/BloomBadge";
import { Button } from "@/components/ui/Button";

import type { BloomStatus } from "@/lib/types";
import type { NavStop } from "./NavigationView";

interface Props {
  // Collapsed-view data
  etaLabel:      string;
  distanceLabel: string;
  arrivalTime:   string;
  expanded:      boolean;
  onToggle:      () => void;
  onStop:        () => void;

  // Expanded-view: huidige stop
  activeStop:    NavStop | null;
  approachPhase: boolean;
  routeName:     string;

  // Stoplijst
  stops:       NavStop[];
  currentIdx:  number;
  visited:     Set<number>;

  // Bloei-status
  isFlower:      boolean;
  reportedBloom: BloomStatus | null;

  // Acties
  onReportBloom:    () => void;
  onTakePhoto:      () => void;
  onMarkArrived:    () => void;
  onOpenMapsPicker: () => void;

  // i18n
  t: (key: string, params?: Record<string, string | number>) => string;
}

function ActionButton({
  icon, label, onClick, disabled,
}: {
  icon: ReactNode; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100 bg-surface-3 text-ink"
      
    >
      {icon}
      <span className="truncate max-w-full px-1">{label}</span>
    </button>
  );
}

export default function NavigationActionSheet({
  etaLabel, distanceLabel, arrivalTime, expanded, onToggle, onStop,
  activeStop, approachPhase, routeName,
  stops, currentIdx, visited,
  isFlower, reportedBloom,
  onReportBloom, onTakePhoto, onMarkArrived, onOpenMapsPicker,
  t,
}: Props) {

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl border-t border-line bg-surface-2 pb-safe shadow-sheet"
    >
      <div className="flex items-center gap-2 pr-4">
        {/* Grote tap-zone: handgreep + resterende tijd/afstand */}
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary rounded-tl-3xl"
          aria-expanded={expanded}
          aria-label={expanded ? t("navigation.hide_stops") : t("navigation.show_stops")}
        >
          <span className="flex w-full justify-center pt-3 pb-1">
            <span className="block h-1.5 w-10 rounded-full bg-line" />
          </span>
          <span className="flex w-full items-center gap-2 pl-5 pt-1 pb-3">
            <span className="min-w-0 flex-1">
              <span className={`block font-mono text-[24px] font-bold leading-tight ${approachPhase ? "text-ink-2" : "text-success"}`}>
                {etaLabel}
              </span>
              <span className="block truncate font-mono text-caption text-ink-3">
                {distanceLabel} · {t("navigation.arrival")} {arrivalTime}
              </span>
            </span>
            {expanded
              ? <ChevronDown size={22} className="flex-shrink-0 text-ink-3" />
              : <ChevronUp   size={22} className="flex-shrink-0 text-ink-3" />}
          </span>
        </button>
        <Button variant="danger" onClick={onStop} className="flex-shrink-0">
          {t("navigation.stop")}
        </Button>
      </div>

      {/* Expanded: stop card + acties + stoplijst */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Stop card */}
            <div className="px-5 pt-3 pb-3 border-t border-line" >
              <p className="text-[11px] font-extrabold tracking-wider uppercase text-primary mb-1">
                {approachPhase ? t("navigation.to_start") : t("navigation.next_stop_label")}
              </p>
              <p className="text-lg font-extrabold truncate text-ink" >
                {approachPhase ? routeName : (activeStop?.name ?? routeName)}
              </p>
              {isFlower && !approachPhase && (
                <div className="mt-1.5">
                  {reportedBloom
                    ? <BloomBadge status={reportedBloom} />
                    : <span className="text-caption text-ink-3">{t("navigation.bloom_unknown")}</span>}
                </div>
              )}
            </div>

            {/* Actie-knoppen 4-grid */}
            <div className="grid grid-cols-4 gap-2 px-3 pb-3">
              <ActionButton
                icon={<Flower2 size={18} className="text-primary" />}
                label={t("navigation.action_bloom")}
                disabled={!isFlower || approachPhase}
                onClick={onReportBloom}
              />
              <ActionButton
                icon={<Camera size={18} />}
                label={t("navigation.action_photo")}
                disabled={!activeStop || approachPhase}
                onClick={onTakePhoto}
              />
              <ActionButton
                icon={<Check size={18} />}
                label={t("common.check_in")}
                disabled={approachPhase}
                onClick={onMarkArrived}
              />
              <ActionButton
                icon={<Navigation2 size={18} className="text-primary" />}
                label={t("navigation.action_external_nav")}
                disabled={!activeStop}
                onClick={onOpenMapsPicker}
              />
            </div>

            {/* Alle stops lijst */}
            <div
              className="max-h-[36vh] overflow-y-auto py-1 border-t border-line"
              
            >
              {stops.map((stop, idx) => {
                const isVisited = visited.has(idx);
                const isActive  = idx === currentIdx;
                return (
                  <div
                    key={stop.id}
                    className="flex items-center gap-3 px-5 py-2.5"
                    style={{
                      backgroundColor: isActive ? "var(--color-surface-3)" : "transparent",
                      borderLeft: isActive ? "3px solid var(--color-primary)" : "3px solid transparent",
                      opacity: isVisited ? 0.6 : 1,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                      style={{
                        backgroundColor: isVisited ? "var(--color-success)" : isActive ? "var(--color-primary)" : "var(--color-border)",
                      }}
                    >
                      {isVisited ? <Check size={12} /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-ink" >
                        {stop.name}
                      </p>
                      {isActive && (
                        <p className="text-[11px] font-bold text-primary">
                          {t("navigation.navigate_now")}
                        </p>
                      )}
                    </div>
                    {!isVisited && !isActive && (
                      <ChevronRight size={14} style={{ color: "var(--color-text-3)" }} />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
