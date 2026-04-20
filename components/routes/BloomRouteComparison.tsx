"use client";

// Seizoenscurve die huidige bloeistatus vergelijkt met historisch patroon

import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import {
  BLOOM_SEASON_CURVE,
  getCurrentWeek,
  bloomScoreColor,
  getSeasonExpectedBloom,
} from "@/lib/bloomRoute";

interface Props {
  currentScore: number; // werkelijke bloomScore van de route (0–1)
  className?: string;
}

const BAR_MAX_H = 48; // px — hoogte van de hoogste balk

export default function BloomRouteComparison({ currentScore, className = "" }: Props) {
  const currentWeek = useMemo(() => getCurrentWeek(), []);

  const weeks    = Object.keys(BLOOM_SEASON_CURVE).map(Number).sort((a, b) => a - b);
  const maxValue = Math.max(...Object.values(BLOOM_SEASON_CURVE));

  const inSeason = currentWeek >= 13 && currentWeek <= 20;
  const expected = inSeason ? getSeasonExpectedBloom(currentWeek) : 0;

  return (
    <div className={`rounded-2xl bg-white p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} className="text-gray-400" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          Seizoenscurve bloei
        </p>
      </div>

      {/* Staafdiagram */}
      <div className="flex items-end gap-1" style={{ height: BAR_MAX_H + 14 }}>
        {weeks.map((week, idx) => {
          const fraction  = BLOOM_SEASON_CURVE[week] / maxValue;
          const barH      = Math.round(fraction * BAR_MAX_H);
          const isCurrent = week === currentWeek;
          const isPast    = week < currentWeek;

          const barColor = isCurrent
            ? bloomScoreColor(currentScore)
            : isPast
            ? "#D1D5DB"
            : "#E5E7EB";

          return (
            <div key={week} className="flex-1 flex flex-col items-center gap-0.5">
              <motion.div
                className="w-full rounded-t"
                style={{ backgroundColor: barColor }}
                initial={{ height: 0 }}
                animate={{ height: barH }}
                transition={{ duration: 0.45, delay: idx * 0.05, ease: "easeOut" }}
              />
              <span
                className={`text-[8px] font-bold leading-none ${
                  isCurrent ? "text-gray-700" : "text-gray-300"
                }`}
              >
                {isCurrent ? "NU" : week}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legende */}
      <p className="text-[10px] text-gray-400 text-center mt-1">
        {inSeason
          ? `Week ${currentWeek} — seizoensverwachting ${Math.round(expected * 100)}% · actueel ${Math.round(currentScore * 100)}%`
          : "Buiten het tulpenseizoen (wk 13–20)"}
      </p>
    </div>
  );
}
