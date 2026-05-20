"use client";

// Uitklap-bottom-sheet voor navigatie. Collapsed: alleen ETA/afstand/aankomst,
// schoon scherm Google Maps-stijl. Expanded: huidige stop card + TulipDay-
// specifieke acties (Bloei melden, Foto, Aftekenen, Externe nav via Maps
// picker) en de volledige stoplijst. Tap op de drag handle togglet.

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flower2, Camera, Check, ChevronRight, ChevronUp, ChevronDown,
  Navigation2,
} from "lucide-react";

import type { NavStop } from "./NavigationView";

interface Props {
  // Collapsed-view data
  etaMinutes:    number;
  distanceLabel: string;
  arrivalTime:   string;
  expanded:      boolean;
  onToggle:      () => void;

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
  reportedBloom: string | null;

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
      className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[11px] font-semibold transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100"
      style={{ backgroundColor: "var(--color-surface-3)", color: "var(--color-text)" }}
    >
      {icon}
      <span className="truncate max-w-full px-1">{label}</span>
    </button>
  );
}

export default function NavigationActionSheet({
  etaMinutes, distanceLabel, arrivalTime, expanded, onToggle,
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
      className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl shadow-2xl"
      style={{
        backgroundColor: "var(--color-surface-2)",
        borderTop: "1px solid var(--color-border)",
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      {/* Drag handle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-center pt-2.5 pb-1"
        aria-label={expanded ? t("navigation.hide_stops") : t("navigation.show_stops")}
      >
        <span
          className="block w-9 h-1 rounded-full"
          style={{ backgroundColor: "var(--color-border)" }}
        />
      </button>

      {/* Collapsed: ETA-balk */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-2 text-left"
      >
        <div className="flex items-baseline gap-2 flex-1 min-w-0">
          <span
            className="text-2xl font-extrabold"
            style={{ color: approachPhase ? "var(--color-text-2)" : "#2D7D46" }}
          >
            {etaMinutes} {t("navigation.minute_short")}
          </span>
          <span
            className="text-sm font-semibold flex-shrink-0"
            style={{ color: "var(--color-text-3)" }}
          >
            · {distanceLabel} · {arrivalTime}
          </span>
        </div>
        {expanded
          ? <ChevronDown size={20} style={{ color: "var(--color-text-3)" }} />
          : <ChevronUp size={20} style={{ color: "var(--color-text-3)" }} />}
      </button>

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
            <div className="px-5 pt-3 pb-3" style={{ borderTop: "1px solid var(--color-border)" }}>
              <p className="text-[11px] font-extrabold tracking-wider uppercase text-tulip-500 mb-1">
                {approachPhase ? t("navigation.to_start") : t("navigation.next_stop_label")}
              </p>
              <p className="text-lg font-extrabold truncate" style={{ color: "var(--color-text)" }}>
                {approachPhase ? routeName : (activeStop?.name ?? routeName)}
              </p>
              {isFlower && !approachPhase && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs" style={{ color: "var(--color-text-2)" }}>
                  <span
                    className="block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        reportedBloom === "in_bloom" ? "#2D7D46"
                        : reportedBloom === "fading" ? "#FF9800"
                        : reportedBloom === "finished" ? "#9E9E9E"
                        : "var(--color-border)",
                    }}
                  />
                  <span>
                    {reportedBloom === "in_bloom" ? t("navigation.reported_in_bloom")
                      : reportedBloom === "fading" ? t("navigation.reported_fading")
                      : reportedBloom === "finished" ? t("navigation.reported_finished")
                      : t("navigation.bloom_unknown")}
                  </span>
                </div>
              )}
            </div>

            {/* Actie-knoppen 4-grid */}
            <div className="grid grid-cols-4 gap-2 px-3 pb-3">
              <ActionButton
                icon={<Flower2 size={18} className="text-tulip-500" />}
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
                icon={<Navigation2 size={18} className="text-tulip-500" />}
                label={t("navigation.action_external_nav")}
                disabled={!activeStop}
                onClick={onOpenMapsPicker}
              />
            </div>

            {/* Alle stops lijst */}
            <div
              className="max-h-[36vh] overflow-y-auto py-1"
              style={{ borderTop: "1px solid var(--color-border)" }}
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
                      borderLeft: isActive ? "3px solid #E8102A" : "3px solid transparent",
                      opacity: isVisited ? 0.6 : 1,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold flex-shrink-0"
                      style={{
                        backgroundColor: isVisited ? "#2D7D46" : isActive ? "#E8102A" : "var(--color-border)",
                      }}
                    >
                      {isVisited ? <Check size={12} /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>
                        {stop.name}
                      </p>
                      {isActive && (
                        <p className="text-[11px] font-bold text-tulip-500">
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
