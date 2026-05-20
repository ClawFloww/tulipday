"use client";

// Grote rode maneuver-banner bovenaan het navigatiescherm — Google Maps-stijl
// maar dan in TulipDay-rood. Toont het maneuver-icoon links, de straatnaam +
// afstand groot, en een sluit-knop rechts. Tijdens de aanrijdfase wordt de
// banner grijs zodat de gebruiker visueel weet dat de echte route nog niet
// is begonnen.

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  icon:          ReactNode;
  distanceLabel: string;
  streetName:    string;
  approachPhase: boolean;
  onClose:       () => void;
}

export default function ManeuverBanner({
  icon, distanceLabel, streetName, approachPhase, onClose,
}: Props) {
  return (
    <motion.div
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 240 }}
      className="rounded-2xl shadow-2xl overflow-hidden"
      style={{
        backgroundColor: approachPhase ? "#374151" : "#E8102A",
        boxShadow: approachPhase
          ? "0 8px 24px rgba(0,0,0,0.35)"
          : "0 8px 24px rgba(232,16,42,0.35)",
      }}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        {/* Maneuver-icoon */}
        <div className="w-14 h-14 flex items-center justify-center text-white flex-shrink-0">
          {icon}
        </div>

        {/* Afstand + straatnaam */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-2xl font-extrabold leading-none tracking-tight">
            {distanceLabel}
          </p>
          <p className="text-white/90 text-base font-bold leading-tight mt-1 truncate">
            {streetName}
          </p>
        </div>

        {/* Sluit-knop */}
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white flex-shrink-0 active:scale-90 transition-transform"
          aria-label="Sluit navigatie"
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}
