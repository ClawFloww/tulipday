"use client";

// Grote instructiebanner bovenaan het navigatiescherm: pijl, afstand tot de
// afslag en de straat (of opdracht). Merkrood tijdens het volgen van de route;
// neutraal ("muted") bij locatie zoeken, herberekenen of van de route af.

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  icon:          ReactNode;
  distanceLabel: string;
  streetName:    string;
  subLabel?:     string | null;
  muted:         boolean;
  closeLabel:    string;
  onClose:       () => void;
}

export default function ManeuverBanner({
  icon, distanceLabel, streetName, subLabel, muted, closeLabel, onClose,
}: Props) {
  return (
    <motion.div
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 22, stiffness: 240 }}
      className={[
        "rounded-2xl shadow-lg transition-colors duration-base",
        muted ? "bg-ink text-surface" : "bg-primary text-on-primary",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center">{icon}</div>

        <div className="min-w-0 flex-1">
          <p className="font-mono text-[28px] font-bold leading-none tracking-tight">{distanceLabel}</p>
          <p className="mt-1 truncate text-headline leading-tight">{streetName}</p>
          {subLabel && <p className="truncate text-caption opacity-80">{subLabel}</p>}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/20 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={closeLabel}
        >
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}
