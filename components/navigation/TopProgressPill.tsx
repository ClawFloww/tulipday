"use client";

// Compacte donkere pil bovenaan het navigatiescherm — vervangt de oude
// rode/grijze instructiebalk. Toont één regel "volgende-actie"-tekst plus
// een rij voortgangs-stippen die alle stops weergeven (groen=bezocht,
// rood=actief, grijs=nog te doen). Tijdens de aanrijdfase is de pil grijzer
// gestyled zodat het visueel duidelijk is dat de officiële route nog niet
// gestart is.

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

import type { NavStop } from "./NavigationView";

interface Props {
  icon:        ReactNode;
  title:       string;
  subtitle:    string;
  stops:       NavStop[];
  currentIdx:  number;
  visited:     Set<number>;
  approachPhase: boolean;
  onClose:     () => void;
}

export default function TopProgressPill({
  icon, title, subtitle, stops, currentIdx, visited, approachPhase, onClose,
}: Props) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md"
      style={{
        backgroundColor: approachPhase
          ? "rgba(31, 41, 55, 0.92)"
          : "rgba(20, 20, 20, 0.92)",
      }}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: approachPhase ? "#4B5563" : "#E8102A" }}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[15px] leading-tight truncate">{title}</p>
          <p className="text-white/70 text-[11px] font-semibold mt-0.5 truncate">{subtitle}</p>
        </div>

        <div className="flex items-center gap-[3px] flex-shrink-0">
          {stops.map((s, idx) => {
            const isVisited = visited.has(idx);
            const isActive  = idx === currentIdx;
            return (
              <span
                key={s.id}
                className="block w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: isVisited
                    ? "#2D7D46"
                    : isActive
                      ? "#E8102A"
                      : "rgba(255,255,255,0.25)",
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white flex-shrink-0 active:scale-90 transition-transform"
          aria-label="Sluit navigatie"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
